import Promise from 'bluebird';
import log from '@fpm/logging';
import { States } from '@fpm/constants';
import { Post } from '@fpm/db';
import { PostScheduler } from '@fpm/post';

const postScheduler = new PostScheduler();

export const createScheduler = ({
  type,
  schedules,
  delay,
  postsPerWeek = -1,
  postsPerDayLimit = 500,
  postsIntervalMin = 60
}) => ({
  delay,
  schedules,
  postsPerDayLimit,
  postsIntervalMin,
  type: postsPerWeek > -1 ? 'counts' : schedules ? 'times' : delay ? 'delay' : type,
  postsPerWeekDay: [
    Math.trunc(Math.max(0, postsPerWeek) / 7),
    Math.trunc(Math.max(0, postsPerWeek) / 7),
    Math.trunc(Math.max(0, postsPerWeek) / 7),
    Math.trunc(Math.max(0, postsPerWeek) / 7),
    Math.trunc(Math.max(0, postsPerWeek) / 7),
    Math.trunc(Math.max(0, postsPerWeek) / 7),
    Math.trunc(Math.max(0, postsPerWeek) / 7)
  ]
});

export const decryptToken = (token, googleTokens) => {
  try {
    return token && googleTokens.oAuthTokenCryptor.decrypt(token);
  } catch (e) {
    return token;
  }
};

/* $FlowFixMe$ */
export const createAccountTokenUpdate = (account, { token, secret, expiresAt }: Object) => ({
  $set: Object.assign(
    {
      'accounts.$.reconnected': new Date(),
      'accounts.$.secret': secret,
      'accounts.$.token': token,
      'accounts.$.expire': expiresAt
    },
    account.state === States.account.reconnectRequired.code
      ? {
          'accounts.$.blockedUntil': null,
          'accounts.$.state': States.account.enabled.code,
          'accounts.$.stateUpdatedAt': new Date()
        }
      : account.state === States.account.disabled.code
        ? {
            'accounts.$.blockedUntil': null
          }
        : {}
  )
});

export const unblockAllPosts = ({ _id }) => {
  return new Promise((resolve, reject) => {
    Post.unblockAll({ _id }, error => {
      if (error) {
        return reject(error);
      }
      return resolve();
    });
  });
};

export const rescheduleAllPosts = ({ _id }) => {
  return new Promise((resolve, reject) => {
    postScheduler.rescheduleAll(_id, (error, _, updatedPosts) => {
      if (error) {
        log.error('Failed to reschedule posts after account update', {
          accountId: _id.toString(),
          message: error.toString(),
          error
        });
        return reject(error);
      }
      log.info('Reschedule posts after account update', {
        accountId: _id.toString(),
        updatedPosts: (updatedPosts && updatedPosts.length) || 0
      });
      return resolve();
    });
  });
};

export const rescheduleAccount = async ({ _id }) => {
  await unblockAllPosts({ _id });
  await rescheduleAllPosts({ _id });
};

// export const updateSubAccounts = async (query, select, $set) => {
//   let q;
//   let profile;
//   let accounts;
//   let updatedTotal = 0;
//   do {
//     q = Profile.findOne(query, '_id accounts._id');
//     profile = await (select ? q.select(select).exec() : q.exec());
//     accounts = (profile && profile.accounts) || [];
//
//     await Promise.map(
//       accounts,
//       async ({ _id }) => {
//         const updated = await Profile.update({ 'accounts._id': _id }, { $set });
//
//         updatedTotal += dbUpdatedCount(updated) || 0;
//
//         if (dbUpdatedCount(updated)) {
//           rescheduleAccount({ _id });
//         }
//       },
//       { concurrency: 8 }
//     );
//   } while (accounts && accounts.length);
//   return updatedTotal;
// };
