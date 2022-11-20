// @flow
import type { NetworkType } from '@fpm/constants';
import urlParser from 'url';
import Promise from 'bluebird';
import rpNoProxy from 'request-promise';
import config from '@fpm/config';
import { Types, States } from '@fpm/constants';
import { FetchAccount, Profile, GoogleRefreshToken } from '@fpm/db';
import { createAccountTokenUpdate } from '../tools';

const proxy = config.get('google:api:proxy');
const rp = proxy ? rpNoProxy.defaults({ proxy }) : rpNoProxy;

export const userDetail = async ({ token }: Object) =>
  rp({
    url: 'https://www.googleapis.com/plusPages/v2/people/me',
    qs: { access_token: token },
    timeout: config.get('network:timeout'),
    json: true
  });

export const tokenDetail = async ({ token }: Object) =>
  rp({
    url: 'https://www.googleapis.com/oauth2/v3/tokeninfo',
    qs: { access_token: token },
    timeout: config.get('network:timeout'),
    json: true
  });

const plusListPeople = async ({ actorId, collection, token, qs }: Object) =>
  rp({
    url: `https://www.googleapis.com/plusPages/v2/people/${actorId}/people/${collection || 'pages'}`,
    qs: Object.assign({}, qs || {}, {
      access_token: token
    }),
    timeout: config.get('network:timeout'),
    json: true
  });

const fixGoogleUrl = url => {
  if (!url) {
    return url;
  }
  if (url.indexOf('https:https:') === 0) {
    url = url.replace('https:https:', 'https:');
  }
  if (url.indexOf('//') === 0) {
    url = `https:${url}`;
  }
  const u = urlParser.parse(url || '', true);
  if (u.host) {
    return url;
  }
  if (url) {
    return `https://plus.google.com${url[0] === '/' ? '' : '/'}${url}`;
  }
  return url;
};

export const normalizedListPeople = async ({ token, uid, type, property /* parentUid, */ }: Object) => {
  let data;
  let items = [];
  const qs = {
    // zakomentovano, protoze selhavalo listovani seznamu collections
    // onBehalfOf: uid,
    pageToken: undefined
  };
  do {
    // eslint-disable-next-line no-await-in-loop
    data = await rp({
      url: `https://www.googleapis.com/plusPages/v2/people/${uid}/${type}`,
      qs: Object.assign({}, qs || {}, { access_token: token }),
      timeout: config.get('network:timeout'),
      json: true
    });
    items = items.concat((data && data[property]) || []);
    qs.pageToken = data && data.nextPageToken;
  } while (qs.pageToken);
  return items;
};

export const normalizedListPages = async ({ token, uid }: Object) =>
  (await normalizedListPeople({ uid, token, type: 'people/pages', property: 'items' }))
    .filter(({ objectType }) => objectType === 'page')
    .map(({ id, displayName, url, image }) => ({
      id,
      url,
      name: displayName,
      image:
        (image && fixGoogleUrl(image.url)) ||
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50'
    }));

export const normalizedListCollections = async ({ token, uid, parentUid }: Object) =>
  (await normalizedListPeople({
    uid,
    parentUid,
    token,
    type: 'collections',
    property: 'collections'
  })).map(({ id, name, coverPhotoUrl }) => ({
    id,
    name,
    url: `https://plus.google.com/collection/${id}`,
    image:
      (coverPhotoUrl && fixGoogleUrl(coverPhotoUrl)) ||
      'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50'
  }));

export const normalizedList = async ({ token, uid, parentUid }: Object) => {
  const tasks = [normalizedListCollections({ token, uid, parentUid })];
  if (!parentUid) {
    tasks.push(normalizedListPages({ token, uid, parentUid }));
  }
  const results = await Promise.all(tasks);
  return {
    collections: results[0] || [],
    pages: results.length === 2 ? results[1] || [] : [],
    communities: []
  };
};

export const isNotGoogleAppsAccount = async ({ token }: Object) => {
  const data = await plusListPeople({
    token,
    actorId: 'me',
    collection: 'pages',
    qs: {
      fields: 'items/objectType'
    }
  });
  const items = (data && data.items) || [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].objectType === 'person') {
      return true;
    }
  }
  return false;
};

export const normalizedUserDetail = async ({ token }: Object) => {
  const body = await userDetail({ token });
  const tokenInfo = await tokenDetail({ token });
  const image = body.image && body.image.url && body.image.url.replace('?sz=50', '');
  const emails = body.emails && body.emails.filter(e => e.type === 'account').map(e => e.value);
  const email = (tokenInfo && tokenInfo.email) || (emails && emails.length && emails[0]) || null;
  return {
    image,
    email,
    uid: body.id,
    name: body.displayName,
    url: body.url,
    meta: {
      publishViaApi: await isNotGoogleAppsAccount({ token })
    }
  };
};

const enableFetchAccount = ({ account }) => {
  return new Promise((resolve, reject) => {
    FetchAccount.enable(account, error => (error && reject(error)) || resolve());
  });
};

const registerFetchAccount = ({ profile, account }) => {
  return new Promise((resolve, reject) => {
    FetchAccount.register(profile, account, true, error => (error && reject(error)) || resolve());
  });
};

// store active access token and refresh token via googleTokens
const storeAccessToken = async ({ socialProfile, googleTokens }) => {
  const { uid, oauth: { secret, token, expiresAt } } = socialProfile;
  const expiresIn = (expiresAt && Math.max(0, Math.round((expiresAt.valueOf() - new Date().valueOf()) / 1000))) || 0;
  return googleTokens.storeAccessToken({
    uid,
    plainRefreshToken: secret,
    plainAccessToken: token,
    expiresInSeconds: expiresIn
  });
};

// store refresh token
const storeRefreshToken = async ({ socialProfile, encryptedRefreshToken }: Object) => {
  const { uid } = socialProfile;
  if (encryptedRefreshToken) {
    await GoogleRefreshToken.update(
      { uid },
      { $set: { val: encryptedRefreshToken, updatedAt: new Date() } },
      { upsert: true }
    );
  }
};

const addProfile = ({ pid, sp, accountManager }) => {
  return new Promise((resolve, reject) => {
    accountManager.addProfile(
      pid,
      sp,
      (error, socialProfileId) => (error && reject(error)) || resolve(socialProfileId)
    );
  });
};

const updatePageProfile = async ({ account, accountManager, socialProfile, profile, googleTokens }: Object) => {
  const isPage = account.account === Types.account.page.code;
  if (!isPage) {
    return;
  }
  // store / update social profile
  const sp = {
    uid: account.uid,
    parentUid: socialProfile.uid,
    email: socialProfile.email,
    image: account.image,
    name: account.name,
    url: account.url,
    connectedAt: new Date(),
    network: account.network,
    account: account.account,
    meta: {
      publishViaApi: !!(socialProfile.meta && socialProfile.meta.publishViaApi)
    },
    oauth: {
      token: null,
      expiresAt: null,
      secret: googleTokens.oAuthTokenCryptor.decrypt(socialProfile.oauth.secret)
    }
  };
  await addProfile({ sp, accountManager, pid: profile._id });
};

export const prepareNewAccount = async ({ user, /* profile, */ account, socialProfile, googleTokens }: Object) => {
  const { uid, url, category, image, name } = account;
  const token = await googleTokens.getPlainAccessTokenForAccount({ uid: socialProfile.uid });
  return {
    uid,
    url,
    category,
    image,
    name,
    dir: account.account === Types.account.profile.code || account.account === Types.account.page.code ? 2 : 1,
    parentUid: uid === socialProfile.uid ? undefined : socialProfile.uid,
    account: account.account,
    secret: socialProfile.parentUid || socialProfile.uid,
    publishViaApi: (token && (await isNotGoogleAppsAccount({ token }))) || false,
    socialProfileId: socialProfile._id,
    started: new Date(),
    network: socialProfile.network,
    preset: 'mirroring',
    appendLink: false,
    noBackLink: true,
    photoAsLink: false,
    creator: user._id,
    state: States.account.enabled.code,
    shortener: { type: 'none' }
  };
};

const createAccountTokenUpdateExtended = (account, socialProfile) => {
  const { $set = {} } = createAccountTokenUpdate(account, {
    token: null,
    expiresAt: null,
    secret: socialProfile.parentUid || socialProfile.uid
  });
  return {
    $set: Object.assign({}, $set, {
      'accounts.$.publishViaApi': !!(socialProfile.meta && socialProfile.meta.publishViaApi)
    })
  };
};

export const afterProfileUpdated = async ({ profile, socialProfile, googleTokens, queueManager }: Object) => {
  // store active access token and refresh token via googleTokens
  const { encryptedRefreshToken, encryptedAccessToken } = await storeAccessToken({ socialProfile, googleTokens });

  await storeRefreshToken({ socialProfile, encryptedRefreshToken });
  let sps = [];
  if (socialProfile.account === Types.account.profile.code) {
    sps = profile.profiles.filter(
      p =>
        p.network === socialProfile.network &&
        p.account === Types.account.page.code &&
        p.parentUid === socialProfile.uid
    );
  } else if (socialProfile.account === Types.account.page.code) {
    sps = profile.profiles.filter(
      p =>
        p.network === socialProfile.network &&
        p.account === Types.account.page.code &&
        p.parentUid === socialProfile.parentUid &&
        p.uid !== socialProfile.uid
    );
    sps = sps.concat(
      profile.profiles.filter(
        p =>
          p.network === socialProfile.network &&
          p.account === Types.account.profile.code &&
          p.uid === socialProfile.parentUid
      )
    );
  }

  const reconnectAccounts = profile.accounts.filter(
    a =>
      a.network === socialProfile.network &&
      (a.account === Types.account.profile.code ||
        a.account === Types.account.page.code ||
        a.account === Types.account.collection.code) &&
      (a.parentUid === socialProfile.uid || a.uid === socialProfile.uid)
  );

  await Promise.all([
    Promise.map(
      sps,
      sp =>
        Profile.update(
          { 'profiles._id': sp._id },
          {
            $set: {
              'profiles.$.reconnectedAt': new Date(),
              'profiles.$.oauth.secret': encryptedRefreshToken,
              'profiles.$.oauth.token': encryptedAccessToken,
              'profiles.$.oauth.expiresAt': socialProfile.oauth.expiresAt,
              'profiles.$.meta.publishViaApi': !!(socialProfile.meta && socialProfile.meta.publishViaApi)
            }
          }
        ),
      { concurrency: 8 }
    ),
    Promise.map(
      reconnectAccounts,
      account =>
        Profile.update({ 'accounts._id': account._id }, createAccountTokenUpdateExtended(account, socialProfile)),
      { concurrency: 8 }
    ),
    Promise.map(
      reconnectAccounts.filter(a => a.ng && a.state === States.account.reconnectRequired.code),
      account => queueManager.enableQueue({ queueId: account._id }),
      { concurrency: 8 }
    )
  ]);
};

export const afterAccountUpdated = async ({
  account,
  accountManager,
  socialProfile,
  profile,
  googleTokens /* user */
}: Object) => {
  const isProfile = account.account === Types.account.profile.code;
  const isPage = account.account === Types.account.page.code;
  if (!isProfile && !isPage) {
    return;
  }

  // enable new posts fetching
  if (account.state === States.account.enabled.code) {
    await enableFetchAccount({ account });
  }

  // store / update page social profile
  await updatePageProfile({ account, accountManager, socialProfile, profile, googleTokens });
};

export const afterAccountCreated = async ({
  profile,
  account,
  socialProfile,
  accountManager,
  googleTokens /* , user */
}: Object) => {
  const isProfile = account.account === Types.account.profile.code;
  const isPage = account.account === Types.account.page.code;
  if (!isProfile && !isPage) {
    return;
  }

  // register new posts fetching
  await registerFetchAccount({ profile, account });

  // store / update page social profile
  await updatePageProfile({ account, accountManager, socialProfile, profile, googleTokens });

  const isFirstGoogleAccount = profile.countAccountsByNetwork(Types.network.google.code) === 0;

  const $push = {
    routes: {
      src: account._id,
      ddg: [],
      chdg: [
        {
          hashtag: ['ns', 'plusonly', 'noshare'],
          noshare: true,
          override: true,
          keep: false,
          dst: []
        }
      ]
    }
  };

  if (isFirstGoogleAccount) {
    $push.routes.ddg = profile.accounts.map(a => a._id.toString()).filter(aid => aid !== account._id.toString());
  }

  Object.values(Types.network).forEach((net: NetworkType) => {
    if (!net.defaultHashtagGroups || !net.defaultHashtagGroups.length) {
      return;
    }
    const dst =
      (isFirstGoogleAccount && profile.accounts.filter(a => a.network === net.code).map(a => a._id.toString())) || [];

    $push.routes.chdg.push({
      dst,
      hashtag: net.defaultHashtagGroups,
      noshare: false,
      override: false,
      keep: false
    });
  });

  await Profile.update({ _id: profile._id }, { $push });
};
