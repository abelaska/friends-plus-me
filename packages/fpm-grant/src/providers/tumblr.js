// @flow
import Promise from 'bluebird';
import rp from 'request-promise';
import config from '@fpm/config';
import { States } from '@fpm/constants';
import { Profile } from '@fpm/db';
import { createAccountTokenUpdate, decryptToken } from '../tools';

export const userDetail = async ({ token, secret }: Object) =>
  rp({
    url: 'https://api.tumblr.com/v2/user/info',
    oauth: {
      token,
      token_secret: secret,
      consumer_key: config.get('grant:tumblr:key'),
      consumer_secret: config.get('grant:tumblr:secret')
    },
    timeout: config.get('network:timeout'),
    json: true
  });

export const normalizedListBlogs = async ({ token, secret }: Object) => {
  const data = await userDetail({ token, secret });
  const blogs = ((data && data.response && data.response.user && data.response.user.blogs) || []).map(
    ({ url, name, type }) => ({
      url,
      name,
      id: name,
      image:
        type === 'private'
          ? 'https://storage.googleapis.com/static.friendsplus.me/images/tumblr-blog-avatar.png'
          : `https://api.tumblr.com/v2/blog/${name}/avatar/64`,
      meta: { isPrivate: type === 'private' }
    })
  );
  return blogs;
};

export const normalizedList = async ({ token, secret }: Object) => {
  return {
    blogs: (await normalizedListBlogs({ token, secret })) || []
  };
};

export const normalizedUserDetail = async ({ token, secret }: Object) => {
  const body = await userDetail({ token, secret });
  const { name } = (body && body.response && body.response.user) || {};
  return {
    name,
    url: 'https://www.tumblr.com',
    uid: name,
    image: `https://api.tumblr.com/v2/blog/${name}/avatar/64` // 'https://storage.googleapis.com/static.friendsplus.me/images/tumblr-blog-avatar.png'
  };
};

export const prepareNewAccount = async ({ user, /* profile, */ account, socialProfile, googleTokens }: Object) => {
  const { uid, url, image, name } = account;
  return {
    uid,
    url,
    image,
    name,
    dir: 1,
    parentUid: uid === socialProfile.uid ? undefined : socialProfile.uid,
    account: account.account,
    secret: decryptToken(socialProfile.oauth.secret, googleTokens),
    token: decryptToken(socialProfile.oauth.token, googleTokens),
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
