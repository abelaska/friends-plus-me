// @flow
import Promise from 'bluebird';
import moment from 'moment-timezone';
import { States, Types } from '@fpm/constants';
import { ObjectId, Queue, Post, Profile } from '@fpm/db';
import QueueLock from './QueueLock';
import { QueueSizeLimitReachedError, QueueInvalidSchedulerError } from './QueueError';

import type { QueueLockConstructor } from './QueueLock';

// first ... add the post to the front of the queueas a first post to publish
// last ... add the post to the end of the queue
// custom ... schedule the post to user selected date and time, in the future even immediately
export type ScheduleType = 'first' | 'last' | 'custom';

export type QueueSchedulerType = 'counts' | 'times' | 'delay';

export type TimeUnitFromHours = 'hours' | 'days' | 'weeks' | 'months';

export type IntervalWithPeriodHoursFce = {
  interval: number,
  intervalUnit: TimeUnitFromHours,
  period?: number,
  periodUnit?: TimeUnitFromHours
};

export type QueuePostType = {
  _id: String | ObjectId, // post._id
  at: Date, // post schedule time
  lck?: Date, // post locked until lck or not
  f?: boolean // whether this post can be rescheduled or not, true for posts schedule manually by user, not present if not true
};

export type CreateQueueFce = {
  id: string | ObjectId,
  pid: string | ObjectId,
  tz: string,
  type: number,
  postsLimit: number,
  scheduler: Object
};

export type SchedulePostFce = {
  type: ScheduleType,
  post: Post, // post to schedule
  replacePost?: boolean,
  skipLimitCheck?: boolean
};

export type SchedulePostAndBalanceQueueFce = {
  type: ScheduleType,
  post: Post, // post to schedule
  queue: Queue,
  replacePost?: boolean,
  skipRebalancedPostsUpdate?: boolean
};

export type BalanceQueueOptions = {
  modifiedDay?: moment,
  skipRebalancedPostsUpdate?: boolean
};

export type ScheduleRepeatingPostFce = {
  type: ScheduleType,
  post: Post, // post to schedule
  count?: number, // total number of times the posts should be scheduled
  firstPublishAt: Date, // date and time in UTC
  interval: number, // interval number
  intervalUnit: TimeUnitFromHours, // interval unit
  period?: number, // period number
  periodUnit?: TimeUnitFromHours, // period unit
  skipLimitCheck?: boolean // whether the limit check should be skipped
};

export type ReschedulePostFce = {
  post: Post // post to reschedule
};

export type PublishedPostFce = {
  post: Post // post that was successfully published
};

export type MoveTopPostFce = {
  post: Post // post to move to top of the queue
};

export type LockPostFce = {
  post: Post, // post to lock
  lockFor: number // lock the post for another ? ms
};

export type RemovePostFce = {
  post: Post, // post to remove
  rebalance?: boolean
};

export type FetchPostFce = {
  type: number, // ex. types.createCodeByName('instagram', 'profile')
  count?: number, // number of posts to fetch
  timeout?: number // acquire queue timeout in ms
};

export type AcquireQueueBase = {
  queueId: string | ObjectId, // id of queue to pause
  timeout?: number // acquire queue timeout in ms
};

export type RebalanceQueueFce = AcquireQueueBase & {};

export type UpdateQueueSchedulerFce = AcquireQueueBase & {
  tz?: string,
  type?: QueueSchedulerType,
  postsIntervalMin?: number,
  postsPerDayLimit?: number,
  postsPerWeekDay?: Array<number>,
  schedules?: Array<Array<number>>,
  delay?: number
};

export type PauseQueueFce = AcquireQueueBase & {
  inactiveUntil?: Date, // paused until
  inactiveReason?: string // reason queue is paused
};

export type UnpauseQueueFce = PauseQueueFce;
export type EmptyQueueFce = PauseQueueFce;

export type BlockQueueFce = AcquireQueueBase & {
  inactiveUntil?: Date, // blocked until
  inactiveReason?: string, // reason queue is blocked
  forReconnect?: boolean // block for reconnect
};

export type AcquireQueueFce = {
  type: number, // ex. types.createCodeByName('instagram', 'profile')
  timeout: number // timeout for acquiring a queue in ms
};

export type AcquirePostFce = {
  queue: Queue // queue from which to acquire a post for publishing
};

export type CheckQueueLimitFce = {
  queue: Queue,
  postsCount?: number
};

export type QueueManagerConstructor = QueueLockConstructor & {};

export const sortQueuePostsAsc = (a: QueuePostType, b: QueuePostType) => a.at.valueOf() - b.at.valueOf();
export const sortNumbersAsc = (a: number, b: number) => a - b;

export const unitHours = (unit: TimeUnitFromHours): number =>
  (unit === 'days' ? 24 : unit === 'weeks' ? 24 * 7 : unit === 'months' ? 24 * 31 : 1);

export const intervalWithPeriodHours = ({ interval, intervalUnit, period, periodUnit }: IntervalWithPeriodHoursFce) => {
  const intervalHours = interval && intervalUnit && interval * unitHours(intervalUnit);
  const periodHours = period && periodUnit && period * unitHours(periodUnit);
  return intervalHours && periodHours && Math.floor(periodHours / intervalHours);
};

export const scheduleDaysFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const weekDayAndTime = (tm: number) => {
  const day = scheduleDaysFull[Math.min(scheduleDaysFull.length - 1, Math.floor(tm / (24 * 60)))];
  const time = tm % (24 * 60);
  const hour = Math.floor(time / 60);
  const min = time % 60;
  return `${day} ${hour}:${min < 10 ? `0${min}` : min}`;
};

export default class QueueManager extends QueueLock {
  lockAcquiredPostTTL: number;

  constructor(opts: QueueManagerConstructor) {
    super(opts);
    this.lockAcquiredPostTTL = 5 * 60 * 1000;
  }

  async createQueue({ id, pid, tz, type, scheduler, postsLimit = -1 }: CreateQueueFce) {
    const q = new Queue({
      pid: new ObjectId(pid.toString()),
      tz,
      type,
      scheduler,
      posts: {
        count: 0,
        limit: postsLimit,
        nextAt: null,
        fetchedAt: null,
        checkedAt: this.now().toDate(),
        list: []
      }
    });
    if (id) {
      q._id = new ObjectId(id.toString());
    }
    return q.save();
  }

  async updateQueueScheduler({
    queueId,
    tz,
    type,
    postsIntervalMin,
    postsPerDayLimit,
    postsPerWeekDay,
    schedules,
    delay,
    timeout = 3000
  }: UpdateQueueSchedulerFce) {
    let queue;
    const acquire = await this.findAndLockQueue({ timeout, query: { _id: queueId } });
    if (acquire) {
      const { lock } = acquire;
      queue = acquire.queue;
      try {
        const { scheduler } = queue;

        if (tz && queue.tz !== tz) {
          queue.tz = tz;
        }

        if (type && scheduler.type !== type) {
          if (Types.isNetwork(queue.type, 'instagram') && type !== 'counts') {
            throw new QueueInvalidSchedulerError('Instagram queue supports only "counts" scheduler');
          }
          scheduler.type = type;
        }

        if (postsPerWeekDay && postsPerWeekDay.length === 7) {
          scheduler.postsPerWeekDay = postsPerWeekDay;
        }

        if (postsIntervalMin && scheduler.postsIntervalMin !== postsIntervalMin) {
          scheduler.postsIntervalMin = postsIntervalMin;
        }

        if (schedules) {
          const times = schedules.reduce((r, v) => r.concat(v), []).sort(sortNumbersAsc);
          if (times.length > 1) {
            let diff;
            for (let i = 1; i < times.length; i++) {
              diff = (times[i] - times[i - 1]) * 60;
              if (diff === 0) {
                throw new QueueInvalidSchedulerError(
                  `Time ${weekDayAndTime(times[i])} is defined in multiple schedules and can be present only in one.`
                );
              } else if (diff < scheduler.postsIntervalMin && scheduler.postsIntervalMin > -1) {
                throw new QueueInvalidSchedulerError(
                  `Shortest time between posts ${
                    scheduler.postsIntervalMin
                  }s rule is violated by schedule times ${weekDayAndTime(times[i - 1])}:00 and ${weekDayAndTime(
                    times[i]
                  )}:00`
                );
              }
            }
          }

          scheduler.schedules = schedules.map(s => s.sort(sortNumbersAsc));
        }

        if (postsPerDayLimit && scheduler.postsPerDayLimit !== postsPerDayLimit) {
          if (scheduler.postsIntervalMin > -1) {
            const requiredInterval = Math.ceil(24 * 60 * 60 / postsPerDayLimit);
            if (requiredInterval < scheduler.postsIntervalMin) {
              throw new QueueInvalidSchedulerError(
                `Posts per day limit ${postsPerDayLimit} (interval ${requiredInterval}s) colides with limit of shortest time between posts ${
                  scheduler.postsIntervalMin
                }s`
              );
            }
          }
          scheduler.postsPerDayLimit = postsPerDayLimit;
        }

        if (delay !== null && delay !== undefined && delay >= 0 && scheduler.delay !== delay) {
          scheduler.delay = delay;
        }

        if (scheduler.postsPerWeekDay.length && scheduler.postsPerDayLimit > -1) {
          scheduler.postsPerWeekDay = scheduler.postsPerWeekDay.map(c => Math.min(c, scheduler.postsPerDayLimit));
        }

        await this.balanceAndStoreQueue(queue);
      } finally {
        await this.unlockQueue(lock);
      }
    }
    return queue;
  }

  async scheduleRepeatingPost({
    type,
    post, // { _id, aid, publishAt, publish: { count, interval, intervalUnit, period, periodUnit } }
    skipLimitCheck = false
  }: ScheduleRepeatingPostFce) {
    const { publish } = post;
    if (!publish) {
      throw new Error('Post is missing publish detail');
    }

    const { interval, intervalUnit } = publish;
    const count: number = publish.count || intervalWithPeriodHours(post.publish) || 0;

    if (!count || count < 2) {
      return null;
    }

    return this.withPostLock({ post }, async ({ queue }) => {
      // check queue.posts.limit
      if (!skipLimitCheck) {
        this.checkQueueLimit({ queue, postsCount: count });
        queue.posts.count += count;
      }

      // if post._id exists in queue.posts.list then remove and schedule again
      queue.posts.list = queue.posts.list.filter(i => !i._id.equals(post._id));

      // schedule first post and rebalance
      await this.schedulePostAndBalanceQueue({ post, queue, type, skipRebalancedPostsUpdate: true });

      const scheduledPost = queue.posts.list.find(i => i._id.equals(post._id));
      const publishAt = moment.utc(scheduledPost.at);

      // schedule all other posts for custom (fixed) time
      for (let counter = 1; counter < count; counter++) {
        queue.posts.list.push({
          f: true,
          _id: post._id,
          at: publishAt.add(interval, intervalUnit).toDate()
        });
      }
      queue.posts.list = queue.posts.list.sort(sortQueuePostsAsc);

      await this.balanceAndStoreQueue(queue);

      return queue;
    });
  }

  // post: { _id, aid, publishAt }
  async schedulePost({ post, type, replacePost = false, skipLimitCheck = false }: SchedulePostFce) {
    return this.withPostLock({ post }, async ({ queue }) => {
      // check queue.posts.limit
      if (!skipLimitCheck) {
        this.checkQueueLimit({ queue });
        queue.posts.count++;
      }

      await this.schedulePostAndBalanceQueue({ post, queue, type, replacePost });
      await this.storeQueue(queue);

      return queue;
    });
  }

  // call when user manually reschedules post to a specific date and time
  async reschedulePost({ post }: ReschedulePostFce) {
    return this.schedulePost({ post, type: 'custom', replacePost: true, skipLimitCheck: true });
  }

  // call when post was successfully published
  // post: { _id, aid, publishedAt }
  async publishedPost({ post }: PublishedPostFce) {
    return this.withPostLock({ post }, async ({ queue }) => {
      // remove only first appearence of the post from the queue
      const postIdx = queue.posts.list.findIndex(i => i._id.equals(post._id));
      if (postIdx < 0) {
        return { queue, found: false };
      }

      queue.posts.list.splice(postIdx, 1);

      const now = this.now();
      const dayKey = now.format('YYYYMMDD');
      queue.posts.published = queue.posts.published || {};
      queue.posts.published[dayKey] = (queue.posts.published[dayKey] || 0) + 1;

      await this.updateBalancedPostsList(queue, queue.posts.list);

      const promises = [this.storeQueue(queue)];

      let newPost;
      const isRepeatPost = post.publish && post.publish.count > 1;
      const isLastRepeatPost = (isRepeatPost && post.publish.published + 1 === post.publish.count) || false;

      const update: Object = {
        $set: {
          blockedAt: null,
          lockedUntil: null,
          completedAt: now.toDate(),
          state: States.post.published.code
        },
        $inc: { 'publish.published': 1 },
        $push: { 'publish.publishedAt': now.toDate() }
      };

      if (isRepeatPost && isLastRepeatPost) {
        update.$set['publish.publishAt'] = [];
      }

      if (isRepeatPost && !isLastRepeatPost) {
        // remove this time
        post.publish.publishAt.shift();
        // priprava postu pro dalsi publikovani
        update.$set.state = States.post.scheduled.code;
        update.$set.completedAt = null;
        update.$set.tries = 0;
        update.$set.failures = [];
        update.$set.publishAt = post.publish.publishAt.length && post.publish.publishAt[0];
        update.$set['publish.publishAt'] = post.publish.publishAt;
        update.$unset = {
          id: 1,
          url: 1
        };

        // create a clone post record with new _id
        newPost = new Post({
          ...((post.toObject && post.toObject()) || post),
          completedAt: now,
          blockedAt: null,
          lockedUntil: null,
          state: States.post.published.code,
          publish: {
            parent: post._id,
            count: 1,
            publishAt: [now],
            published: 1,
            publishedAt: [now]
          }
        });
        newPost._id = undefined;
        promises.push(newPost.save());
      }

      promises.push(Post.update({ _id: post._id }, update));

      await Promise.all(promises);

      return { isRepeatPost, isLastRepeatPost, newPost, queue, found: true };
    });
  }

  // call when post publishing failed and next try should be postponed
  async lockPost({ post, lockFor }: LockPostFce) {
    return this.withPostLock({ post }, async ({ queue }) => {
      const postId = post._id.toString();
      const postIdx = queue.posts.list.findIndex(i => i._id.toString() === postId);
      if (postIdx > -1) {
        queue.posts.list[postIdx].lck = this.now()
          .add(lockFor, 'ms')
          .toDate();
        await this.storeQueue(queue);
      }
      return queue;
    });
  }

  async moveTopPost({ post }: MoveTopPostFce) {
    return this.withPostLock({ post }, async ({ queue }) => {
      queue.posts.list = this.movePostTop(queue.posts.list, post);

      const modifiedDay: moment = this.postToModifiedDay(queue, post);

      await this.balanceAndStoreQueue(queue, { modifiedDay });

      return queue;
    });
  }

  async removePost({ post, rebalance = true }: RemovePostFce) {
    return this.withPostLock({ post }, async ({ queue }) => {
      const modifiedDay: moment = this.postToModifiedDay(queue, post);
      if (!modifiedDay) {
        return queue;
      }

      queue.posts.list = queue.posts.list.filter(i => !i._id.equals(post._id));

      await this.updateBalancedPostsList(queue, queue.posts.list);

      if (rebalance) {
        await this.balanceAndStoreQueue(queue, { modifiedDay });
      } else {
        await this.storeQueue(queue);
      }

      return queue;
    });
  }

  async fetchPost({ type, count = 1, timeout = 3000 }: FetchPostFce): Promise<?Array<Post>> {
    const acquire = await this.acquireQueue({ type, timeout });
    if (!acquire) {
      return null;
    }
    const { queue, lock } = acquire;
    const posts: Array<Post> = [];
    try {
      let post;
      while (count-- > 0) {
        // eslint-disable-next-line no-await-in-loop
        post = await this.acquirePost({ queue });
        if (post) {
          posts.push(post);
        } else {
          break;
        }
      }
      if (posts.length) {
        await this.storeQueue(queue);
      }
    } finally {
      await this.unlockQueue(lock);
    }
    return posts;
  }

  async rebalanceQueue({ queueId, timeout = 3000 }: RebalanceQueueFce) {
    let queue;
    const acquire = await this.findAndLockQueue({ timeout, query: { _id: queueId } });
    if (acquire) {
      const { lock } = acquire;
      queue = acquire.queue;
      try {
        await this.balanceAndStoreQueue(queue);
      } finally {
        await this.unlockQueue(lock);
      }
    }
    return queue;
  }

  async enableQueue({ queueId, timeout = 3000 }: UnpauseQueueFce) {
    let queue;
    const acquire = await this.findAndLockQueue({ timeout, query: { _id: queueId } });
    if (acquire) {
      const { lock } = acquire;
      queue = acquire.queue;
      try {
        queue.state = States.queue.enabled.code;
        queue.inactiveUntil = null;
        queue.inactiveReason = null;
        await this.balanceAndStoreQueue(queue);
        await Profile.update(
          { 'accounts._id': queue._id },
          { $set: { 'accounts.$.state': States.account.enabled.code, 'accounts.$.stateUpdatedAt': new Date() } }
        );
      } finally {
        await this.unlockQueue(lock);
      }
    }
    return queue;
  }

  async pauseQueue({ queueId, inactiveUntil, inactiveReason, timeout = 3000 }: PauseQueueFce) {
    let queue;
    const acquire = await this.findAndLockQueue({ timeout, query: { _id: queueId } });
    if (acquire) {
      const { lock } = acquire;
      queue = acquire.queue;
      try {
        queue.state = States.queue.paused.code;
        queue.inactiveUntil = inactiveUntil;
        queue.inactiveReason = inactiveReason;
        await Queue.update({ _id: queue._id }, { $set: { state: queue.state, inactiveUntil, inactiveReason } });
        await Profile.update(
          { 'accounts._id': queue._id },
          { $set: { 'accounts.$.state': States.account.disabled.code, 'accounts.$.stateUpdatedAt': new Date() } }
        );
      } finally {
        await this.unlockQueue(lock);
      }
    }
    return queue;
  }

  async blockQueue({ queueId, inactiveUntil, inactiveReason, forReconnect = false, timeout = 3000 }: BlockQueueFce) {
    let queue;
    const acquire = await this.findAndLockQueue({ timeout, query: { _id: queueId } });
    if (acquire) {
      const { lock } = acquire;
      queue = acquire.queue;
      try {
        queue.state = forReconnect ? States.queue.reconnectRequired.code : States.queue.blocked.code;
        queue.inactiveUntil = inactiveUntil;
        queue.inactiveReason = inactiveReason;
        await Queue.update({ _id: queue._id }, { $set: { state: queue.state, inactiveUntil, inactiveReason } });
        await Profile.update(
          { 'accounts._id': queue._id },
          {
            $set: {
              'accounts.$.state': forReconnect ? States.account.reconnectRequired.code : States.account.blocked.code,
              'accounts.$.stateUpdatedAt': new Date()
            }
          }
        );
      } finally {
        await this.unlockQueue(lock);
      }
    }
    return queue;
  }

  async emptyQueue({ queueId, timeout = 3000 }: EmptyQueueFce) {
    let queue;
    const acquire = await this.findAndLockQueue({ timeout, query: { _id: queueId } });
    if (acquire) {
      const { lock } = acquire;
      queue = acquire.queue;
      try {
        queue.posts.count = 0;
        queue.posts.nextAt = null;
        queue.posts.list = [];
        await this.storeQueue(queue);
        await Post.remove({ aid: queue._id, state: { $lt: States.post.draft.code } });
      } finally {
        await this.unlockQueue(lock);
      }
    }
    return queue;
  }

  // PRIVATE

  async schedulePostAndBalanceQueue({
    post,
    queue,
    type,
    replacePost = false,
    skipRebalancedPostsUpdate = false
  }: SchedulePostAndBalanceQueueFce) {
    let modifiedDay: moment = null;

    if (replacePost) {
      const p = queue.posts.list.find(i => i._id.equals(post._id));
      if (p && !p.f) {
        modifiedDay = this.postToModifiedDay(queue, post);
      }
      queue.posts.list = queue.posts.list.filter(i => !i._id.equals(post._id));
    }

    if (queue.scheduler.type === 'delay') {
      const at = this.now()
        .tz(queue.tz)
        .add(queue.scheduler.delay, 'seconds')
        .utc()
        .toDate();
      switch (type) {
        case 'custom':
          queue.posts.list = this.insertCustomTimePost(queue.posts.list, post);
          break;
        default:
          queue.posts.list.push({ at, _id: post._id });
          break;
      }
    } else {
      // add post to queue.posts arrays and rebalance the queue
      switch (type) {
        case 'first':
          queue.posts.list.unshift({ _id: post._id });
          modifiedDay = this.now().startOf('day');
          break;
        // eslint-disable-next-line no-case-declarations
        case 'last':
          queue.posts.list.push({ _id: post._id });

          const balancedList = queue.posts.list.filter(p => !p.f);
          modifiedDay = (balancedList.length > 1
            ? moment.utc(balancedList[balancedList.length - 2].at)
            : this.now()
          ).startOf('day');
          break;
        case 'custom':
          queue.posts.list = this.insertCustomTimePost(queue.posts.list, post);
          break;
        default:
          break;
      }
    }

    return this.balanceQueue(queue, { modifiedDay, skipRebalancedPostsUpdate });
  }

  async acquirePost({ queue }: AcquirePostFce) {
    let id;
    const now = this.now();
    const nowVal = now.toDate().valueOf();
    const postItem = queue.posts.list.find(i => i.at.valueOf() <= nowVal && (!i.lck || i.lck.valueOf() <= nowVal));
    if (postItem) {
      id = postItem._id;
      postItem.lck = now
        .clone()
        .add(this.lockAcquiredPostTTL, 'ms')
        .toDate();
      queue.posts.fetchedAt = now.toDate();

      // update post record
      await Post.update(
        { _id: id },
        {
          $set: {
            completedAt: null,
            blockedAt: null,
            publishAt: now.toDate(),
            lockedUntil: postItem.lck,
            failures: [],
            state: States.post.publishing.code
          },
          $unset: {
            id: 1,
            url: 1
          },
          $inc: { tries: 1 }
        }
      );
    }
    return id;
  }

  async acquireQueue({ type, timeout = 3000 }: AcquireQueueFce) {
    const now = this.now().toDate();
    const queue = await Queue.findOneAndUpdate(
      {
        type,
        state: States.queue.enabled.code,
        'posts.nextAt': { $lte: now }
      },
      { $set: { 'posts.checkedAt': now } },
      { new: true, sort: { 'posts.checkedAt': 1 } }
    )
      .lean()
      .exec();
    return this.acquireQueueLock({ queue, timeout });
  }

  balanceDayCounts(day: moment, queue: Queue, list: Array<QueuePostType>) {
    const now = this.now().tz(queue.tz);
    const nowUtcVal = this.now().valueOf();
    const isToday = day.isSame(now, 'day');
    const seconds = isToday
      ? now
          .clone()
          .add(1, 'day')
          .startOf('day')
          .diff(now, 'seconds')
      : 24 * 60 * 60;
    const delaySecs: number = seconds / (list.length + 1);
    const startTime = isToday ? now.clone() : day.clone().startOf('day');
    const at = startTime.add(delaySecs, 'seconds').utc();
    list.forEach((i: QueuePostType) => {
      // ke kazdemu casu pridat random pocet minut, aby vsichni uzivatele nepublikovali ve stejny cas
      if (!i.lck || i.lck.valueOf() <= nowUtcVal) {
        i.at = at
          .clone()
          .subtract(this.random(delaySecs / 4), 'seconds')
          .toDate();
      }
      at.add(delaySecs, 'seconds');
    });
    return list;
  }

  async balanceQueueCounts(queue: Queue, { skipRebalancedPostsUpdate = false }: BalanceQueueOptions = {}) {
    // week day post limits are set in
    const { scheduler: { postsPerWeekDay } = {} } = queue;
    const day = this.now().tz(queue.tz);

    const weekPosts = postsPerWeekDay.reduce((r, v) => r + v, 0);
    if (weekPosts < 1) {
      throw new QueueSizeLimitReachedError(0, queue._id);
    }

    const fullList = queue.posts.list.slice(0);
    const fixedList = fullList.filter(i => i.f);
    const list = fullList.filter(i => !i.f);

    // https://momentjs.com/docs/#/get-set/iso-weekday/
    const todayPostsLimit = Math.min(
      postsPerWeekDay[day.isoWeekday() - 1] || 0,
      isNaN(queue.scheduler.postsIntervalMin) || queue.scheduler.postsIntervalMin < 0
        ? postsPerWeekDay[day.isoWeekday() - 1] || 0
        : Math.floor(
            day
              .clone()
              .add(1, 'day')
              .startOf('day')
              .diff(day, 'seconds') / queue.scheduler.postsIntervalMin
          ) - 1
    );
    const todayPublishedPostsCount = (queue.posts.published || {})[this.now().format('YYYYMMDD')] || 0;
    const todayPostsCount = Math.max(0, todayPostsLimit - todayPublishedPostsCount);
    const todayPosts = todayPostsCount > 0 ? list.splice(0, Math.min(list.length, todayPostsCount)) : [];

    let last;
    const rebalanceList = list
      .reduce(
        (r: Array<Object>, i: Object) => {
          last = r.length && r[r.length - 1];
          if (last && last.posts.length < last.postsLimit) {
            last.posts.push(i);
          } else {
            if (last) {
              day.add(1, 'days');
            }
            r.push({
              posts: [i],
              scheduleDay: day.clone(),
              postsLimit: postsPerWeekDay[day.isoWeekday() - 1] || 0
            });
          }
          return r;
        },
        // today
        [
          {
            postsLimit: todayPosts.length,
            posts: todayPosts,
            scheduleDay: day.clone()
          }
        ]
      )
      .map(({ scheduleDay, posts }: Object) => this.balanceDayCounts(scheduleDay, queue, posts))
      .reduce((r, d) => r.concat(d), []);

    const newList = rebalanceList.concat(fixedList);

    if (!skipRebalancedPostsUpdate) {
      const dirtyPosts = rebalanceList.map(p => p._id);
      await this.updateRebalancedPosts(dirtyPosts, newList);
    }

    return this.updateBalancedPostsList(queue, newList);
  }

  async balanceQueueTimes(queue: Queue, { skipRebalancedPostsUpdate = false }: BalanceQueueOptions = {}) {
    const now = this.now().tz(queue.tz);
    const week = now.clone().startOf('isoWeek');
    const nowUnix = now.unix();

    const times = queue.scheduler.schedules.reduce((r, v) => r.concat(v), []).sort(sortNumbersAsc);

    let offs;
    do {
      const weekUnix = week.unix();
      offs = times.findIndex(time => weekUnix + time * 60 >= nowUnix);
      if (offs === -1) {
        week.add(1, 'week');
      }
    } while (offs === -1);

    const fullList = queue.posts.list.slice(0);
    const fixedList = fullList.filter(i => i.f);
    const list = fullList.filter(i => !i.f);

    let newAt;
    const dirtyPosts = [];
    const rebalanceList = list.map((post: QueuePostType) => {
      newAt = week
        .clone()
        .add(times[offs++], 'minutes')
        .utc()
        .toDate();
      if (post.at && post.at.valueOf() !== newAt.valueOf()) {
        dirtyPosts.push(post._id);
      }
      post.at = newAt;
      if (offs >= times.length) {
        offs = 0;
        week.add(1, 'week');
      }
      return post;
    });

    const newList = rebalanceList.concat(fixedList);

    if (!skipRebalancedPostsUpdate) {
      await this.updateRebalancedPosts(dirtyPosts, newList);
    }

    return this.updateBalancedPostsList(queue, newList);
  }

  async balanceQueue(queue: Queue, balanceQueueOptions?: BalanceQueueOptions) {
    switch (queue.scheduler.type) {
      case 'counts':
        return this.balanceQueueCounts(queue, balanceQueueOptions);
      case 'times':
        return this.balanceQueueTimes(queue, balanceQueueOptions);
      case 'delay':
        return this.updateBalancedPostsList(queue, queue.posts.list);
      default:
        throw new Error(`Unknown queue ${queue._id.toString()} scheduler "${queue.scheduler.type}"`);
    }
  }

  async updateBalancedPostsList(queue: Queue, list: Array<QueuePostType>) {
    list = list.sort(sortQueuePostsAsc);
    queue.posts.list = list;
    queue.posts.count = list.length;
    queue.posts.nextAt = list.length ? list[0].at : null;
    return list;
  }

  async balanceAndStoreQueue(queue: Queue, balanceQueueOptions?: BalanceQueueOptions) {
    await this.balanceQueue(queue, balanceQueueOptions);
    return this.storeQueue(queue);
  }

  async storeQueue(queue: Queue) {
    return Queue.update({ _id: queue._id }, queue);
  }

  async updateRebalancedPosts(dirtyPosts: Array<string | ObjectId>, completeList: Array<QueuePostType>) {
    const publishAtArrayList = Object.keys(
      dirtyPosts.reduce((r: Object, p: string | ObjectId) => {
        r[p.toString()] = 1;
        return r;
      }, {})
    )
      .map(postId => ({
        postId,
        publishAtArray: completeList.filter(p => p._id.toString() === postId).map(p => p.at)
      }))
      .filter(a => a.publishAtArray.length);

    if (!publishAtArrayList.length) {
      return null;
    }

    // update all posts in a bulk
    const bulk = Post.collection.initializeUnorderedBulkOp();
    publishAtArrayList.forEach(({ postId, publishAtArray }) => {
      bulk
        .find({ _id: ObjectId(postId) })
        .updateOne({ $set: { publishAt: publishAtArray[0], 'publish.publishAt': publishAtArray } });
    });
    return new Promise((resolve, reject) => {
      bulk.execute((error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  }

  insertCustomTimePost(list: Array<QueuePostType>, post: Post) {
    const at = post.publishAt.valueOf();
    const postsBefore = list.filter(i => i.at.valueOf() <= at);
    const postsAfter = list.filter(i => i.at.valueOf() > at);
    return postsBefore.concat([{ at: post.publishAt, f: true, _id: post._id }], postsAfter);
  }

  movePostTop(list: Array<QueuePostType>, post: Post) {
    const postId = post._id.toString();
    const postIdx = list.findIndex(i => i._id.toString() === postId);
    if (postIdx > -1) {
      const item = list[postIdx];
      list.splice(postIdx, 1);
      list.unshift(item);
    }
    return list;
  }

  postToModifiedDay(queue: Queue, post: Post): ?moment {
    const postId = post._id.toString();
    const foundPost = queue.posts.list.find(p => p._id.toString() === postId);
    return foundPost ? moment.utc(foundPost.at).startOf('day') : null;
  }

  async findAndLockQueue({ query, timeout = 3000 }: Object) {
    const queue = await Queue.findOne(query)
      .lean()
      .exec();
    return this.acquireQueueLock({ queue, timeout });
  }

  checkQueueLimit({ queue, postsCount = 1 }: CheckQueueLimitFce) {
    const postsLimit = queue.posts.limit === undefined || queue.posts.limit === null ? -1 : queue.posts.limit;
    if (postsLimit > -1 && postsLimit < queue.posts.count + postsCount) {
      throw new QueueSizeLimitReachedError(postsLimit, queue._id);
    }
  }

  random(num: number) {
    return Math.trunc(Math.random() * num);
  }

  now() {
    return moment().utc();
  }
}
