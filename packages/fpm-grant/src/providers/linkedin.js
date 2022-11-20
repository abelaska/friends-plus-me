// @flow
import Promise from 'bluebird';
import rp from 'request-promise';
import urlParser from 'url';
import config from '@fpm/config';
import { States } from '@fpm/constants';
import { Profile } from '@fpm/db';
import { createAccountTokenUpdate, decryptToken } from '../tools';

// https://docs.microsoft.com/en-us/linkedin/shared/references/v2/profile/full-profile?context=linkedin/consumer/context
export const userDetail = async ({ token }: Object) =>
  rp({
    url:
      'https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,vanityName,profilePicture(displayImage~:playableStreams))',
    headers: {
      'x-li-format': 'json',
      Authorization: `Bearer ${token}`
    },
    timeout: config.get('network:timeout'),
    json: true
  });

const secureLinkedinImageUrl = imageUrl => {
  const u = urlParser.parse(imageUrl);
  if (u.protocol === 'https:') {
    return imageUrl;
  }
  u.host = 'media.licdn.com';
  u.protocol = 'https:';
  return urlParser.format(u);
};

export const normalizedListPages = async ({ token }: Object) => {
  const count = 30;
  let pages = [];
  let start = 0;
  let data;
  let total;
  do {
    // eslint-disable-next-line no-await-in-loop
    data = await rp({
      url: 'https://api.linkedin.com/v2/organizationalEntityAcls',
      qs: {
        count,
        start,
        q: 'roleAssignee',
        projection: '(elements*(organizationalTarget~(id,name,vanityName,logoV2(original~:playableStreams))))'
      },
      headers: {
        'x-li-format': 'json',
        Authorization: `Bearer ${token}`
      },
      timeout: config.get('network:timeout'),
      json: true
    });
    // https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/organizations/organization-lookup-api
    pages = pages.concat(
      ((data && data.elements) || [])
        .map(r => r['organizationalTarget~'])
        .filter(o => o)
        .map(({ id, name, vanityName, logoV2 }) => ({
          id,
          name: (name.localized && Object.values(name.localized)[0]) || 'Unknown',
          url: `https://www.linkedin.com/company/${vanityName}/`,
          image:
            logoV2['original~'] &&
            logoV2['original~'].elements &&
            logoV2['original~'].elements.length &&
            logoV2['original~'].elements[0] &&
            logoV2['original~'].elements[0].identifiers &&
            logoV2['original~'].elements[0].identifiers.length &&
            logoV2['original~'].elements[0].identifiers[0] &&
            logoV2['original~'].elements[0].identifiers[0].identifier
              ? logoV2['original~'].elements[0].identifiers[0].identifier
              : 'https://storage.googleapis.com/static.friendsplus.me/images/linkedin-page-avatar.png'
        }))
    );
    total = (data && data._total) || 0;
    start += count;
  } while (pages.length < total);
  return pages;
};

export const normalizedList = async ({ token, uid }: Object) => {
  return {
    pages: (await normalizedListPages({ token, uid })) || []
  };
};

export const normalizedUserDetail = async ({ token }: Object) => {
  const body = await userDetail({ token });
  const uid = body.id;
  const image =
    (body.pictureUrls && body.pictureUrls.values && body.pictureUrls.values.length && body.pictureUrls.values[0]) ||
    body.pictureUrl ||
    (body.profilePicture &&
      body.profilePicture['displayImage~'] &&
      body.profilePicture['displayImage~'].elements &&
      body.profilePicture['displayImage~'].elements.length &&
      body.profilePicture['displayImage~'].elements[0] &&
      body.profilePicture['displayImage~'].elements[0].identifiers &&
      body.profilePicture['displayImage~'].elements[0].identifiers.length &&
      body.profilePicture['displayImage~'].elements[0].identifiers[0].identifier);
  const firstName = (body.firstName && body.firstName.localized && Object.values(body.firstName.localized)[0]) || '';
  const lastName = (body.lastName && body.lastName.localized && Object.values(body.lastName.localized)[0]) || '';
  const name =
    body.formattedName || (firstName && lastName && `${firstName} ${lastName}`) || lastName || firstName || 'Unknown';
  const url =
    body.publicProfileUrl ||
    (body.vanityName && `https://www.linkedin.com/in/${body.vanityName}`) ||
    'https://www.linkedin.com/';
  return { image, uid, name, url, privacy: 'anyone' };
};

export const prepareNewAccount = async ({ user, /* profile, */ account, socialProfile, googleTokens }: Object) => {
  const { uid, url, image, name } = account;
  return {
    uid,
    url,
    image,
    name,
    dir: 1,
    privacy: 'anyone',
    parentUid: uid === socialProfile.uid ? undefined : socialProfile.uid,
    account: account.account,
    secret: decryptToken(socialProfile.oauth.secret, googleTokens),
    token: decryptToken(socialProfile.oauth.token, googleTokens),
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
  const reconnectAccounts = profile.accounts.filter(
    a => a.network === socialProfile.network && (a.parentUid === socialProfile.uid || a.uid === socialProfile.uid)
  );
  await Promise.all([
    Promise.map(
      reconnectAccounts,
      account =>
        Profile.update({ 'accounts._id': account._id }, createAccountTokenUpdate(account, socialProfile.oauth)),
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

export const afterAccountCreated = async () => {};
