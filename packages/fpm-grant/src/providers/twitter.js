// @flow
import Promise from 'bluebird';
import rp from 'request-promise';
import config from '@fpm/config';
import { States } from '@fpm/constants';
import { Profile } from '@fpm/db';
import { createAccountTokenUpdate, decryptToken } from '../tools';

// pro ziskani info o Twitter uzivateli podle access tokenu volat https://dev.twitter.com/rest/reference/get/account/verify_credentials?skip_status=true&include_entities=false
export const userDetail = async ({ token, secret }: Object) =>
  rp({
    url: 'https://api.twitter.com/1.1/account/verify_credentials.json',
    oauth: {
      token,
      token_secret: secret,
      consumer_key: config.get('grant:twitter:key'),
      consumer_secret: config.get('grant:twitter:secret')
    },
    timeout: config.get('network:timeout'),
    json: true
  });

export const normalizedUserDetail = async ({ token, secret }: Object) => {
  const body = await userDetail({ token, secret });
  return {
    appendHashtag: 'first',
    limitMsgLen: false,
    uid: body.id_str,
    name: body.screen_name,
    url: `https://twitter.com/${body.screen_name}`,
    image: body.profile_image_url_https
  };
};

export const prepareNewAccount = async ({ user, /* profile, */ account, socialProfile, googleTokens }: Object) => {
  const { uid, url, image, name } = account;
  return {
    uid,
    dir: 1,
    url,
    parentUid: uid === socialProfile.uid ? undefined : socialProfile.uid,
    account: account.account,
    secret: decryptToken(socialProfile.oauth.secret, googleTokens),
    token: decryptToken(socialProfile.oauth.token, googleTokens),
    image,
    name,
    socialProfileId: socialProfile._id,
    started: new Date(),
    network: socialProfile.network,
    preset: 'mirroring',
    appendLink: false,
    noBackLink: true,
    photoAsLink: false,
    twForceLink: true,
    appendHashtag: 'first',
    limitMsgLen: false,
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
