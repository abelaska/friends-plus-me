// @flow
import Promise from 'bluebird';
import rp from 'request-promise';
import config from '@fpm/config';
import log from '@fpm/logging';
import { Types, States, type NetworkType } from '@fpm/constants';
import { Profile } from '@fpm/db';
import { createAccountTokenUpdate, decryptToken } from '../tools';

const fbVersion = 'v6.0';

export const userDetail = async ({ token }: Object) =>
  rp({
    url: `https://graph.facebook.com/${fbVersion}/me`,
    qs: { fields: 'link,name,id', access_token: token },
    timeout: config.get('network:timeout'),
    json: true
  });

const graphList = async ({ path, qs = {} }) => {
  let list = [];
  let data;
  let url = `https://graph.facebook.com/${fbVersion}/${path}`;
  do {
    // eslint-disable-next-line no-await-in-loop
    data = await rp({
      url,
      qs,
      timeout: config.get('network:timeout'),
      json: true
    });
    list = list.concat((data && data.data) || []);
    url = data && data.paging && data.paging.next;
    qs = null;
  } while (url);

  const ids = {};
  list = list.filter(({ id }) => {
    if (ids[id]) {
      return false;
    }
    ids[id] = 1;
    return true;
  });

  return list;
};

export const normalizedListPages = async ({ token, uid }: Object) => {
  try {
    return (await graphList({
      path: `${uid}/accounts`,
      qs: { fields: 'id,access_token,name', access_token: token }
    })).map(({ id, access_token, name }) => ({
      id,
      name,
      url: `https://www.facebook.com/${id}`,
      image: `https://graph.facebook.com/${id}/picture?type=small`,
      meta: { token: access_token }
    }));
  } catch (error) {
    log.error('Failed to fetch normalized Facebook pages list', { message: error.toString(), stack: error.stack });
    return null;
  }
};

export const normalizedPage = async ({ token, uid }: Object) => {
  try {
    const { id, name, access_token } = await rp({
      url: `https://graph.facebook.com/${fbVersion}/${uid}`,
      qs: {
        access_token: token,
        fields: 'id,access_token,name'
      },
      timeout: config.get('network:timeout'),
      json: true
    });
    return {
      id,
      name,
      url: `https://www.facebook.com/${id}`,
      image: `https://graph.facebook.com/${id}/picture?type=small`,
      meta: { token: access_token }
    };
  } catch (error) {
    log.error('Failed to fetch normalized Facebook page', { uid, message: error.toString(), stack: error.stack });
    return null;
  }
};

export const normalizedListGroups = async ({ token, uid }: Object) => {
  try {
    return (await graphList({
      path: `${uid}/groups`,
      qs: { fields: 'id,name,privacy,cover', access_token: token }
    })).map(({ id, name, privacy, cover }) => ({
      id,
      name,
      url: `https://www.facebook.com/groups/${id}`,
      image: (cover && cover.source) || `https://graph.facebook.com/${id}/picture?type=small`,
      meta: { isPrivate: privacy === 'SECRET' }
    }));
  } catch (error) {
    log.error('Failed to fetch normalized Facebook groups list', { message: error.toString(), stack: error.stack });
    return null;
  }
};

export const normalizedList = async ({ token, uid }: Object) => {
  const result = await Promise.all([normalizedListPages({ token, uid }), normalizedListGroups({ token, uid })]);
  return {
    pages: result[0] || [],
    groups: result[1] || []
  };
};

export const findTimelinePhotoAlbumId = async ({ uid, token }: Object) => {
  const get = url =>
    rp({
      url,
      qs: { fields: 'id,type', access_token: token },
      timeout: config.get('network:timeout'),
      json: true
    });
  let id;
  let data;
  let url = `https://graph.facebook.com/${fbVersion}/${uid}/albums`;
  do {
    // eslint-disable-next-line no-await-in-loop
    data = await get(url);

    url = null;

    if (data && data.data && data.data.length) {
      for (let i = 0; i < data.data.length; i++) {
        if (data.data[i].type === 'wall') {
          id = data.data[i].id;
          break;
        }
      }

      if (!id && data.paging && data.paging.next) {
        url = data.paging.next;
      }
    }
  } while (url && !id);

  return id;
};

export const normalizedUserDetail = async ({ token }: Object) => {
  const body = await userDetail({ token });
  const uid = body.id;
  return {
    uid,
    privacy: 'EVERYONE',
    name: body.name,
    url: body.link,
    image: `https://graph.facebook.com/${body.id}/picture?type=large`,
    albumId: await findTimelinePhotoAlbumId({ uid, token })
  };
};

export const prepareNewAccount = async ({ user, /* profile, */ account, socialProfile, googleTokens }: Object) => {
  const { uid, url, image, name } = account;
  const token = account.token || decryptToken(socialProfile.oauth.token, googleTokens);
  return {
    uid,
    url,
    token,
    image,
    name,
    dir: account.account === Types.account.page.code ? 2 : 1,
    privacy: 'EVERYONE',
    parentUid: uid === socialProfile.uid ? undefined : socialProfile.uid,
    account: account.account,
    secret: decryptToken(socialProfile.oauth.secret, googleTokens),
    albumId: (await findTimelinePhotoAlbumId({ uid, token })) || undefined,
    socialProfileId: socialProfile._id,
    started: new Date(),
    network: socialProfile.network,
    expire: socialProfile.oauth.expiresAt,
    preset: 'mirroring',
    appendLink: false,
    noBackLink: true,
    photoAsLink: false,
    creator: user._id,
    state: States.account.enabled.code,
    shortener: { type: 'none' }
  };
};

export const afterProfileUpdated = async ({ profile, socialProfile, queueManager }: Object) => {
  const reconnectProfilesAndGroups = profile.accounts.filter(
    a =>
      a.network === socialProfile.network &&
      (a.account === Types.account.profile.code || a.account === Types.account.group.code) &&
      (a.parentUid === socialProfile.uid || a.uid === socialProfile.uid)
  );
  const reconnectPages = profile.accounts.filter(
    a =>
      a.network === socialProfile.network && a.account === Types.account.page.code && a.parentUid === socialProfile.uid
  );
  const reconnectAccounts = [].concat(reconnectProfilesAndGroups).concat(reconnectPages);

  await Promise.all([
    Promise.map(
      reconnectProfilesAndGroups,
      account =>
        Profile.update({ 'accounts._id': account._id }, createAccountTokenUpdate(account, socialProfile.oauth)),
      { concurrency: 8 }
    ),
    Promise.map(
      reconnectPages,
      async account => {
        const { meta } = (await normalizedPage({ token: socialProfile.oauth.token, uid: account.uid })) || {};
        if (meta && meta.token) {
          await Profile.update({ 'accounts._id': account._id }, createAccountTokenUpdate(account, meta));
        }
      },
      { concurrency: 8 }
    ),
    Promise.map(
      reconnectAccounts.filter(a => a.ng && a.state === States.account.reconnectRequired.code),
      account => queueManager.enableQueue({ queueId: account._id }),
      { concurrency: 8 }
    )
  ]);
};

export const afterAccountUpdated = async () => {};

export const afterAccountCreated = async ({
  profile,
  account,
  socialProfile,
  accountManager
}: /* googleTokens, user */
Object) => {
  const isPage = account.account === Types.account.page.code;
  if (!isPage) {
    return;
  }

  const $push = {
    routes: {
      src: account._id,
      ddg: [],
      chdg: [
        {
          hashtag: ['ns', 'noshare'],
          noshare: true,
          override: true,
          keep: false,
          dst: []
        }
      ]
    }
  };

  Object.values(Types.network).forEach((net: NetworkType) => {
    if (!net.defaultHashtagGroups || !net.defaultHashtagGroups.length) {
      return;
    }
    $push.routes.chdg.push({
      dst: [],
      hashtag: net.defaultHashtagGroups,
      noshare: false,
      override: false,
      keep: false
    });
  });

  await Profile.update({ _id: profile._id }, { $push });
};
