// @flow
import Promise from 'bluebird';
import rp from 'request-promise';
import config from '@fpm/config';
import { States } from '@fpm/constants';
import { Profile } from '@fpm/db';
import { createAccountTokenUpdate, decryptToken } from '../tools';

export const userDetail = async ({ token }: Object) =>
  rp({
    url:
      'https://api.pinterest.com/v1/me?fields=id,username,first_name,last_name,url,image[30x30,60x60,110x110,165x165,280x280]',
    qs: { access_token: token },
    timeout: config.get('network:timeout'),
    json: true
  });

export const picture = ({ image = {} }: Object) =>
  (image['280x280'] && image['280x280'].url) ||
  (image['165x165'] && image['165x165'].url) ||
  (image['110x110'] && image['110x110'].url) ||
  (image['60x60'] && image['60x60'].url) ||
  (image['30x30'] && image['30x30'].url);

export const fixBoardImage = (board: Object) => {
  board.image =
    picture(board) || 'https://storage.googleapis.com/static.friendsplus.me/images/pinterest-board-avatar.png';
  return board;
};

export const normalizedListBoards = async ({ token }: Object) => {
  let boards = [];
  let data;
  let url = 'https://api.pinterest.com/v1/me/boards/';
  do {
    // eslint-disable-next-line no-await-in-loop
    data = await rp({
      url,
      qs: {
        limit: 20,
        access_token: token,
        fields: 'id,name,url,image'
      },
      timeout: config.get('network:timeout'),
      json: true
    });
    boards = boards.concat(((data && data.data) || []).map(b => fixBoardImage(b)));
    url = data && data.page && data.page.next;
  } while (url);
  return boards;
};

export const normalizedList = async ({ token }: Object) => {
  return {
    boards: (await normalizedListBoards({ token })) || []
  };
};

export const normalizedUserDetail = async ({ token }: Object) => {
  const body = await userDetail({ token });
  const { data = {} } = body;
  return {
    url: data.url,
    uid: data.id,
    name: data.username,
    image: picture(data)
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
