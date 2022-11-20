// @flow
import config from '@fpm/config';
import log from '@fpm/logging';
import { Types, States } from '@fpm/constants';
import { Profile, PricingPlan } from '@fpm/db';
import { createAccountTokenUpdate, rescheduleAccount, createScheduler } from '../tools';

export const prepareNewAccount = async ({ user, profile, account, socialProfile, assetsManager }: Object) => {
  let { image } = account;
  const { uid, url, name } = account;

  // store avatar
  if (image && config.get('isProduction')) {
    try {
      const avatarAsset = await assetsManager.fetchAndStoreAvatar({
        url: image,
        user,
        pid: profile && profile._id
      });
      image = avatarAsset.picture.proxy;
    } catch (e) {
      log.error('Failed to fetch and store avatar', {
        url: image,
        userId: user && user._id && user._id.toString(),
        pid: profile && profile._id.toString(),
        error: e.toString(),
        stack: e.stack
      });
    }
  }

  return {
    uid,
    url,
    image,
    name,
    dir: 1,
    ng: true,
    parentUid: uid === socialProfile.uid ? undefined : socialProfile.uid,
    account: account.account,
    token: socialProfile.oauth.token,
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
    shortener: { type: 'none' },
    scheduling: { stype: 't' }
  };
};

export const afterProfileUpdated = async () => {};

export const afterAccountUpdated = async ({ account, socialProfile, queueManager }: Object) => {
  await Profile.update({ 'accounts._id': account._id }, createAccountTokenUpdate(account, socialProfile.oauth));
  if (account.ng) {
    if (account.state === States.account.reconnectRequired.code) {
      await queueManager.enableQueue({ queueId: account._id });
    }
  } else {
    await rescheduleAccount(account);
  }
};

export const afterAccountCreated = async ({ user, profile, account, queueManager }: Object) => {
  const pricingPlan = await PricingPlan.findOne({ id: profile.plan.name }, { use: 1 }).exec();
  const postsLimit = (pricingPlan && pricingPlan.use && pricingPlan.use.maxQueueSizePerAccount) || 5;
  await queueManager.createQueue({
    postsLimit,
    id: account._id,
    pid: profile._id,
    tz: user.tz || 'UTC',
    scheduler: createScheduler({ postsPerWeek: 15 * 7, postsPerDayLimit: 96, postsIntervalMin: 15 * 60 }),
    type: Types.createCode(account.network, account.account)
  });
};
