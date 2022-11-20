/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const Promise = require('bluebird');
const log = require('@fpm/logging').default;
const { dbUpdatedCount, ObjectId, Profile, User, Post, Queue } = require('@fpm/db');
const { States, Types } = require('@fpm/constants');
const { unix } = require('../utils/time');
const { scheduleDays } = require('../utils/scheduling');
const { twoDigits } = require('../utils/text');

const mapQueueState = {
  [States.account.enabled.code]: 'enabled',
  [States.account.disabled.code]: 'paused',
  [States.account.blocked.code]: 'blocked',
  [States.account.reconnectRequired.code]: 'reconnect_required'
};

const mapQueueLimits = async ({ dbQueue, full }) => {
  const dbQueueInfo =
    dbQueue.ng &&
    (await Queue.findById(dbQueue._id, { scheduler: 1, 'posts.limit': 1 })
      .lean()
      .exec());
  return (
    dbQueueInfo && {
      queue_size: dbQueueInfo.posts.limit,
      posts_per_day: dbQueueInfo.scheduler.postsPerDayLimit,
      shortest_time_between_posts: dbQueueInfo.scheduler.postsIntervalMin
    }
  );
};

const mapQueueScheduling = async ({ dbQueue, full }) => {
  const dbQueueInfo =
    dbQueue.ng &&
    (await Queue.findById(dbQueue._id, { scheduler: 1 })
      .lean()
      .exec());
  const { scheduling } = dbQueue;
  const { scheduler } = dbQueueInfo || {};
  const type = (scheduler && scheduler.type) || (scheduling.stype === 't' ? 'times' : 'delay');

  const delay = type === 'delay' || full ? (scheduler && scheduler.delay) || scheduling.delay || 0 : undefined;

  const counts =
    ((type === 'counts' || full) &&
      scheduler &&
      scheduler.postsPerWeekDay &&
      scheduleDays.reduce((r, v, idx) => {
        r[v] = scheduler.postsPerWeekDay[idx] || 0;
        return r;
      }, {})) ||
    undefined;

  const schs = (scheduler && scheduler.schedules) || scheduling.schedules;
  const schedules =
    type === 'times' || full
      ? (schs &&
          schs.map(s => {
            let time;
            const days = {};
            const times = {};

            s.sort((a, b) => a - b).forEach(t => {
              days[scheduleDays[Math.floor(t / (24 * 60))]] = 1;
              time = t % (24 * 60);
              times[`${twoDigits(Math.floor(time / 60))}:${twoDigits(time % 60)}`] = 1;
            });

            return {
              days: Object.keys(days),
              times: Object.keys(times)
            };
          })) ||
        undefined
      : undefined;

  return {
    timezone: scheduling.tz,
    type,
    counts,
    schedules,
    delay
  };
};

const queueSize = async dbQueue => {
  if (dbQueue.ng) {
    const dbQueueInfo = await Queue.findById(dbQueue._id, { 'posts.count': 1 })
      .lean()
      .exec();
    return dbQueueInfo && dbQueueInfo.posts.count;
  }
  return Post.count({ aid: dbQueue._id, state: { $lt: States.post.draft.code } }).exec();
};

const canManageQueue = (module.exports.canManageQueue = ({ user, dbTeam, dbQueue }) =>
  dbTeam.canUserManageProfile(user) || dbTeam.canUserManageAccount(user, dbQueue));

const transformDbQueue = (module.exports.transformDbQueue = async ({ dbQueue, full }) => ({
  queue_id: dbQueue._id.toString(),
  created: unix(dbQueue.started),
  reconnected: unix(dbQueue.reconnected),
  created_by: {
    user_id: dbQueue.creator.toString()
  },
  name: dbQueue.name,
  state: mapQueueState[dbQueue.state],
  picture: dbQueue.image,
  service: {
    type: Types.networkTypeName(dbQueue.network),
    category: Types.accountTypeName(dbQueue.account),
    id: dbQueue.uid,
    url: dbQueue.url
  },
  scheduling: await mapQueueScheduling({ dbQueue, full }),
  limits: await mapQueueLimits({ dbQueue, full }),
  size: await queueSize(dbQueue)
}));

const teamQueues = (module.exports.teamQueues = async ({ user, dbTeam, full }) => {
  const availableQueues = dbTeam.canUserManageProfile(user)
    ? dbTeam.accounts
    : dbTeam.accounts.filter(a => dbTeam.canUserManageAccount(user, a));
  return Promise.map(availableQueues, async dbQueue => transformDbQueue({ dbQueue, full }), { concurrency: 8 });
});

const enhanceQueuesUsers = (module.exports.enhanceQueuesUsers = async ({ queues, users, isEmailVisible }) => {
  const tm = new Date();
  const fetchUsers = [];

  users = users || {};

  let userId;
  queues.forEach(q => {
    userId = q.created_by.user_id;
    if (!users[userId] || typeof users[userId] !== 'object') {
      users[userId] = 1;
      fetchUsers.push(userId);
    }
  });

  if (fetchUsers.length) {
    (await User.find({ _id: { $in: fetchUsers } }, `_id name image${isEmailVisible ? ' email' : ''}`).exec()).forEach(
      u => {
        users[u._id.toString()] = {
          name: u.name,
          avatar: u.image,
          email: u.email
        };
      }
    );
  }

  queues = queues.map(q => {
    const user = users[q.created_by.user_id];
    if (user) {
      q.created_by.name = user.name;
      q.created_by.email = user.email;
      q.created_by.avatar = user.avatar;
    }
    return q;
  });

  log.debug(`enhanceQueuesUsers tm:${new Date() - tm}`);

  return queues;
});

const fetchQueueTeam = (module.exports.fetchQueueTeam = async queueId =>
  Profile.findOne(
    { 'accounts._id': queueId },
    { _id: 1, created: 1, name: 1, members: 1, use: 1, accounts: { $elemMatch: { _id: queueId } } }
  ).exec());

const fetchQueueTeamQuery = (module.exports.fetchQueueTeamQuery = async ({ query }) => {
  const queueId = query && query.queue && ObjectId.isValid(query.queue) && query.queue;
  return queueId && fetchQueueTeam(queueId);
});

const listQueues = (module.exports.listQueues = async ({ user, dbTeam, isEmailVisible, full }) =>
  enhanceQueuesUsers({ isEmailVisible, queues: await teamQueues({ user, dbTeam, full }) }));

const infoQueue = (module.exports.infoQueue = async ({ user, dbTeam, isEmailVisible, full }) => {
  const queues = await enhanceQueuesUsers({ isEmailVisible, queues: await teamQueues({ user, dbTeam, full }) });
  return queues.length && queues[0];
});

const updateQueueScheduling = (module.exports.updateQueueScheduling = async ({
  queueManager,
  dbQueue,
  timezone,
  type,
  schedules,
  counts,
  delay
}) => {
  if (!timezone && !type) {
    return dbQueue;
  }

  if (dbQueue.ng) {
    await queueManager.updateQueueScheduler({
      type,
      schedules,
      delay,
      postsPerWeekDay: counts,
      tz: timezone,
      queueId: dbQueue._id
    });
  }

  const $set = {};

  if (timezone) {
    $set['accounts.$.scheduling.tz'] = timezone;
  }
  if (schedules) {
    $set['accounts.$.scheduling.schedules'] = schedules;
  }

  if (Object.keys($set).length) {
    const isUpdated = dbUpdatedCount(await Profile.update({ 'accounts._id': dbQueue._id }, { $set }));
    if (isUpdated) {
      dbQueue.scheduling.tz = timezone || dbQueue.scheduling.timezone;
      dbQueue.scheduling.schedules = schedules || dbQueue.scheduling.schedules;
    }
  }

  return dbQueue;
});

const rescheduleQueuePosts = (module.exports.rescheduleQueuePosts = async ({ dbQueue, postScheduler, queueManager }) =>
  (dbQueue.ng
    ? queueManager.rebalanceQueue({ queueId: dbQueue._id })
    : new Promise((resolve, reject) => {
        postScheduler.rescheduleAll(dbQueue._id, error => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      })));

const queueSizeLimitCheck = (module.exports.queueSizeLimitCheck = async ({ dbTeam, dbQueue }) => {
  const networkName = Types.networkTypeName(dbQueue.network);
  const accountName = Types.accountTypeName(dbQueue.account);
  const use = dbTeam.use;
  const network = (use && use.network && networkName && use.network[networkName]) || null;
  const globalLimit = use && use.maxQueueSizePerAccount;
  const networkLimit = (network && network.maxQueueSizePerAccount) || null;
  const accountLimit =
    (network && accountName && network[accountName] && network[accountName].maxQueueSizePerAccount) || null;
  const maxQueueSize = accountLimit || networkLimit || globalLimit || -1;

  if (maxQueueSize < 0) {
    return {
      maxQueueSize,
      isQueueLimitReached: false
    };
  }
  if (maxQueueSize === 0) {
    return {
      maxQueueSize,
      isQueueLimitReached: true
    };
  }

  const qs = await queueSize(dbQueue);
  return {
    queueSize: qs,
    maxQueueSize,
    isQueueLimitReached: maxQueueSize <= qs
  };
});
