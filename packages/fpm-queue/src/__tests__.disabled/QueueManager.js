import Promise from 'bluebird';
import moment from 'moment-timezone';
import { Types, States } from '@fpm/constants';
import { Queue, Post, ObjectId } from '@fpm/db';
import QueueManagerOriginal, { weekDayAndTime } from '../QueueManager';
import { QueueSizeLimitReachedError, QueueInvalidSchedulerError } from '../QueueError';
import { testingBeforeAll, testingAfterAll, equalObjectId } from '../testing';

beforeAll(testingBeforeAll());
afterAll(testingAfterAll());

beforeEach(async () =>
  Promise.all([
    Promise.map(await Queue.find().exec(), q => q.remove()),
    Promise.map(await Post.find().exec(), p => p.remove())
  ])
);

const createScheduler = ({
  type,
  schedules,
  delay,
  postsPerWeek = -1,
  postsPerDayLimit = 500,
  postsIntervalMin = 60
}) => ({
  delay,
  schedules,
  type: postsPerWeek > -1 ? 'counts' : schedules ? 'times' : delay ? 'delay' : type,
  postsPerDayLimit,
  postsIntervalMin,
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

const createQueueManager = (opts: Object, nowStr?: Object, randomize: boolean = false) => {
  class QueueManager extends QueueManagerOriginal {
    _now: string;
    constructor(...args) {
      super(...args);
      this._now = nowStr;
    }
    setNow(str) {
      this._now = str;
    }
    now() {
      return moment.utc(this._now);
    }
    random(num) {
      return randomize ? super.random(num) : 0;
    }
  }
  return new QueueManager(opts);
};

test('should get correct weekDayAndTime', async () => {
  expect(weekDayAndTime(0 * 24 * 60 + 9 * 60 + 11)).toBe('Monday 9:11');
  expect(weekDayAndTime(0 * 24 * 60 + 9 * 60 + 9)).toBe('Monday 9:09');
  expect(weekDayAndTime(0 * 24 * 60 + 10 * 60 + 11)).toBe('Monday 10:11');
  expect(weekDayAndTime(1 * 24 * 60 + 9 * 60 + 11)).toBe('Tuesday 9:11');
  expect(weekDayAndTime(6 * 24 * 60 + 9 * 60 + 11)).toBe('Sunday 9:11');
  expect(weekDayAndTime(7 * 24 * 60 + 9 * 60 + 11)).toBe('Sunday 9:11');
});

test('should create queue', async () => {
  const id = new ObjectId();
  const pid = new ObjectId();
  const qm = createQueueManager({ redisConfig: {} });
  const qNew = await qm.createQueue({
    id,
    pid,
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: 100,
    scheduler: createScheduler({ postsPerWeek: 7 })
  });
  expect(qNew).toBeTruthy();
  const q = await Queue.findById(qNew._id)
    .lean()
    .exec();
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.enabled.code);
  expect(q._id.toString()).toBe(id.toString());
  expect(q.pid.toString()).toBe(pid.toString());
  expect(q.tz).toBe('Europe/Prague');
  expect(q.type).toBe(Types.createCodeByName('instagram', 'profile'));
  expect(q.posts).toBeTruthy();
  expect(q.posts.list).toBeTruthy();
  expect(q.posts.checkedAt).toBeTruthy();
  expect(q.posts.published).toBeFalsy();
  expect(q.posts.fetchedAt).toBeFalsy();
  expect(q.posts.nextAt).toBeFalsy();
  expect(q.posts.list.length).toBe(0);
  expect(q.posts.count).toBe(0);
  expect(q.posts.count).toBe(0);
  expect(q.scheduler).toBeTruthy();
  expect(q.scheduler.postsPerWeekDay).toBeTruthy();
  expect(q.scheduler.postsPerWeekDay).toEqual([1, 1, 1, 1, 1, 1, 1]);
});

test('should fail on QueueSizeLimitReachedError with limit 0', async () => {
  const qm = createQueueManager({ redisConfig: {} });
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: 0,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  try {
    await qm.schedulePost({ post: { _id: new ObjectId(), aid: queue._id }, type: 'first' });
    throw new Error('Should have failed');
  } catch (e) {
    expect(e instanceof QueueSizeLimitReachedError).toBeTruthy();
  }
});

test('should fail on QueueSizeLimitReachedError with limit 1', async () => {
  const qm = createQueueManager({ redisConfig: {} });
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: 1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  await qm.schedulePost({ post: { _id: new ObjectId(), aid: queue._id }, type: 'first' });

  try {
    await qm.schedulePost({ post: { _id: new ObjectId(), aid: queue._id }, type: 'first' });
    throw new Error('Should have failed');
  } catch (e) {
    expect(e instanceof QueueSizeLimitReachedError).toBeTruthy();
  }
});

test('should fail on QueueSizeLimitReachedError with limit -1', async () => {
  const qm = createQueueManager({ redisConfig: {} });
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });
  expect(await qm.schedulePost({ post: { _id: new ObjectId(), aid: queue._id }, type: 'first' })).toBeTruthy();
  expect(await qm.schedulePost({ post: { _id: new ObjectId(), aid: queue._id }, type: 'first' })).toBeTruthy();
});

test('should schedule a post as first', async () => {
  const qm = createQueueManager({ redisConfig: {} });
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const postId = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: postId[0], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  equalObjectId(q.posts.list[0]._id, postId[0]);

  q = await qm.schedulePost({ post: { _id: postId[1], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  equalObjectId(q.posts.list[0]._id, postId[1]);
  equalObjectId(q.posts.list[1]._id, postId[0]);

  q = await qm.schedulePost({ post: { _id: postId[2], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  equalObjectId(q.posts.list[0]._id, postId[2]);
  equalObjectId(q.posts.list[1]._id, postId[1]);
  equalObjectId(q.posts.list[2]._id, postId[0]);
});

test('should schedule a post as last', async () => {
  const qm = createQueueManager({ redisConfig: {} });
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const postId = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: postId[0], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  equalObjectId(q.posts.list[0]._id, postId[0]);

  q = await qm.schedulePost({ post: { _id: postId[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  equalObjectId(q.posts.list[0]._id, postId[0]);
  equalObjectId(q.posts.list[1]._id, postId[1]);

  q = await qm.schedulePost({ post: { _id: postId[2], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  equalObjectId(q.posts.list[0]._id, postId[0]);
  equalObjectId(q.posts.list[1]._id, postId[1]);
  equalObjectId(q.posts.list[2]._id, postId[2]);
});

test('should schedule a post as custom', async () => {
  const qm = createQueueManager({ redisConfig: {} });
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const postId = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({
    post: { _id: postId[0], aid: queue._id, publishAt: moment.utc().toDate() },
    type: 'custom'
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  equalObjectId(q.posts.list[0]._id, postId[0]);

  q = await qm.schedulePost({
    post: {
      _id: postId[1],
      aid: queue._id,
      publishAt: moment
        .utc()
        .add(50, 'days')
        .toDate()
    },
    type: 'custom'
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  equalObjectId(q.posts.list[0]._id, postId[0]);
  equalObjectId(q.posts.list[1]._id, postId[1]);

  q = await qm.schedulePost({
    post: {
      _id: postId[2],
      aid: queue._id,
      publishAt: moment
        .utc()
        .add(20, 'days')
        .toDate()
    },
    type: 'custom'
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  equalObjectId(q.posts.list[0]._id, postId[0]);
  equalObjectId(q.posts.list[1]._id, postId[2]);
  equalObjectId(q.posts.list[2]._id, postId[1]);
});

test('should schedule a post as last, first and custom', async () => {
  const qm = createQueueManager({ redisConfig: {} });
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 80 })
  });

  const postId = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({
    post: { _id: postId[0], aid: queue._id },
    type: 'last'
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  equalObjectId(q.posts.list[0]._id, postId[0]);

  q = await qm.schedulePost({
    post: {
      _id: postId[1],
      aid: queue._id
    },
    type: 'first'
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  equalObjectId(q.posts.list[0]._id, postId[1]);
  equalObjectId(q.posts.list[1]._id, postId[0]);

  q = await qm.schedulePost({
    post: {
      _id: postId[2],
      aid: queue._id,
      publishAt: moment
        .utc()
        .add(1, 'days')
        .toDate()
    },
    type: 'custom'
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  equalObjectId(q.posts.list[0]._id, postId[1]);
  equalObjectId(q.posts.list[1]._id, postId[0]);
  equalObjectId(q.posts.list[2]._id, postId[2]);
});

test('should insert custom time', async () => {
  const qm = createQueueManager({ redisConfig: {} });
  let _id = new ObjectId();
  let l = await qm.insertCustomTimePost([], { _id, publishAt: new Date() });
  expect(l).toBeTruthy();
  expect(l.length).toBe(1);
  equalObjectId(l[0]._id, _id);

  let now = moment.utc();
  let ids = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
  let list = [
    { _id: ids[0], at: now.toDate() },
    { _id: ids[1], at: now.add(1, 'days').toDate() },
    { _id: ids[2], at: now.add(1, 'days').toDate() },
    { _id: ids[3], at: now.add(1, 'days').toDate() }
  ];
  _id = new ObjectId();
  l = await qm.insertCustomTimePost(list, {
    _id,
    publishAt: now
      .subtract(2, 'days')
      .add(1, 'hours')
      .toDate()
  });
  expect(l).toBeTruthy();
  expect(l.length).toBe(5);
  equalObjectId(l[0]._id, ids[0]);
  equalObjectId(l[1]._id, ids[1]);
  equalObjectId(l[2]._id, _id);
  equalObjectId(l[3]._id, ids[2]);
  equalObjectId(l[4]._id, ids[3]);

  now = moment.utc();
  ids = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
  list = [
    { _id: ids[0], at: now.toDate() },
    { _id: ids[1], at: now.add(1, 'days').toDate() },
    { _id: ids[2], at: now.add(1, 'days').toDate() },
    { _id: ids[3], at: now.add(1, 'days').toDate() }
  ];
  _id = new ObjectId();
  l = await qm.insertCustomTimePost(list, {
    _id,
    publishAt: now.add(1, 'days').toDate()
  });
  expect(l).toBeTruthy();
  expect(l.length).toBe(5);
  equalObjectId(l[0]._id, ids[0]);
  equalObjectId(l[1]._id, ids[1]);
  equalObjectId(l[2]._id, ids[2]);
  equalObjectId(l[3]._id, ids[3]);
  equalObjectId(l[4]._id, _id);
});

test('should balance day counts', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-13T12:00:00Z');

  let day = moment.utc('2018-01-13T12:00:00Z');
  const q = { tz: 'UTC' };

  let list = qm.balanceDayCounts(day, q, []);
  expect(list).toBeTruthy();
  expect(list.length).toBe(0);

  list = qm.balanceDayCounts(day, q, [{ _id: '1' }]);
  expect(list.length).toBe(1);
  expect(list[0]._id).toBe('1');
  expect(list[0].at.toISOString()).toBe('2018-01-13T18:00:00.000Z');

  list = qm.balanceDayCounts(day, q, [{ _id: '1' }, { _id: '2' }]);
  expect(list.length).toBe(2);
  expect(list[0]._id).toBe('1');
  expect(list[0].at.toISOString()).toBe('2018-01-13T16:00:00.000Z');
  expect(list[1]._id).toBe('2');
  expect(list[1].at.toISOString()).toBe('2018-01-13T20:00:00.000Z');

  list = qm.balanceDayCounts(day, q, [{ _id: '1' }, { _id: '2' }, { _id: '3' }]);
  expect(list.length).toBe(3);
  expect(list[0]._id).toBe('1');
  expect(list[0].at.toISOString()).toBe('2018-01-13T15:00:00.000Z');
  expect(list[1]._id).toBe('2');
  expect(list[1].at.toISOString()).toBe('2018-01-13T18:00:00.000Z');
  expect(list[2]._id).toBe('3');
  expect(list[2].at.toISOString()).toBe('2018-01-13T21:00:00.000Z');

  day = moment.utc('2018-01-14T10:40:00Z');

  list = qm.balanceDayCounts(day, q, []);
  expect(list).toBeTruthy();
  expect(list.length).toBe(0);

  list = qm.balanceDayCounts(day, q, [{ _id: '1' }]);
  expect(list.length).toBe(1);
  expect(list[0]._id).toBe('1');
  expect(list[0].at.toISOString()).toBe('2018-01-14T12:00:00.000Z');

  list = qm.balanceDayCounts(day, q, [{ _id: '1' }, { _id: '2' }]);
  expect(list.length).toBe(2);
  expect(list[0]._id).toBe('1');
  expect(list[0].at.toISOString()).toBe('2018-01-14T08:00:00.000Z');
  expect(list[1]._id).toBe('2');
  expect(list[1].at.toISOString()).toBe('2018-01-14T16:00:00.000Z');

  list = qm.balanceDayCounts(day, q, [{ _id: '1' }, { _id: '2' }, { _id: '3' }]);
  expect(list.length).toBe(3);
  expect(list[0]._id).toBe('1');
  expect(list[0].at.toISOString()).toBe('2018-01-14T06:00:00.000Z');
  expect(list[1]._id).toBe('2');
  expect(list[1].at.toISOString()).toBe('2018-01-14T12:00:00.000Z');
  expect(list[2]._id).toBe('3');
  expect(list[2].at.toISOString()).toBe('2018-01-14T18:00:00.000Z');
});

test('should balance queue counts', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-14T12:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  let ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [{ _id: ids[0], at: moment.utc('2018-01-16T10:40:00Z').toDate() }];
  let list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(1);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T18:00:00.000Z');

  //
  ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [
    { _id: ids[0], at: moment.utc('2018-01-14T10:40:00Z').toDate() },
    { _id: ids[1], at: moment.utc('2018-01-14T11:40:00Z').toDate() }
  ];
  list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(2);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T16:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-14T20:00:00.000Z');

  //
  ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [
    { _id: ids[0], at: moment.utc('2018-01-14T10:40:00Z').toDate() },
    { _id: ids[1], at: moment.utc('2018-01-14T11:40:00Z').toDate() },
    { _id: ids[2], at: moment.utc('2018-01-14T12:40:00Z').toDate() }
  ];
  list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T16:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-14T20:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
});

test('should balance queue counts - rebalance today', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-14T12:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [
    { _id: ids[0], at: moment.utc('2018-01-14T10:40:00Z').toDate() },
    { _id: ids[1], at: moment.utc('2018-01-14T11:40:00Z').toDate() },
    { _id: ids[2], at: moment.utc('2018-01-14T12:40:00Z').toDate() }
  ];
  let list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T16:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-14T20:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');

  //
  qm.setNow('2018-01-14T15:00:00Z');
  list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T18:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-14T21:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
});

test('should balance queue counts - rebalance today with postsIntervalMin limit in place', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-14T12:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14, postsIntervalMin: 4 * 60 * 60 })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [
    { _id: ids[0], at: moment.utc('2018-01-14T10:40:00Z').toDate() },
    { _id: ids[1], at: moment.utc('2018-01-14T11:40:00Z').toDate() },
    { _id: ids[2], at: moment.utc('2018-01-14T12:40:00Z').toDate() }
  ];
  let list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T16:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-14T20:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');

  //
  qm.setNow('2018-01-14T15:00:00Z');
  list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T19:30:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
});

test('should balance queue counts - decrease today limit', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-14T12:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [
    { _id: ids[0], at: moment.utc('2018-01-14T10:40:00Z').toDate() },
    { _id: ids[1], at: moment.utc('2018-01-14T11:40:00Z').toDate() },
    { _id: ids[2], at: moment.utc('2018-01-14T12:40:00Z').toDate() }
  ];
  let list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T16:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-14T20:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');

  //
  q.scheduler.postsPerWeekDay = [1, 1, 1, 1, 1, 1, 1];
  list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T18:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-16T12:00:00.000Z');
});

test('should balance queue counts - increase today limit', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-14T12:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 7 })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [
    { _id: ids[0], at: moment.utc('2018-01-14T10:40:00Z').toDate() },
    { _id: ids[1], at: moment.utc('2018-01-14T11:40:00Z').toDate() },
    { _id: ids[2], at: moment.utc('2018-01-14T12:40:00Z').toDate() }
  ];
  let list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T18:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-16T12:00:00.000Z');

  //
  qm.setNow('2018-01-14T15:00:00Z');
  q.scheduler.postsPerWeekDay = [2, 2, 2, 2, 2, 2, 2];
  list = await qm.balanceQueueCounts(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-14T18:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-14T21:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
});

test('should balance queue times - 1 schedule', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-14T12:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ schedules: [[60, 3 * 60]] })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [
    { _id: ids[0], at: moment.utc('2018-01-14T10:40:00Z').toDate() },
    { _id: ids[1], at: moment.utc('2018-01-14T11:40:00Z').toDate() },
    { _id: ids[2], at: moment.utc('2018-01-14T12:40:00Z').toDate() }
  ];
  const list = await qm.balanceQueueTimes(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-22T01:00:00.000Z');
});

test('should balance queue times - 2 schedules', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-24T12:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ schedules: [[60, 3 * 60], [2 * 60]] })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [
    { _id: ids[0], at: moment.utc('2018-01-14T10:40:00Z').toDate() },
    { _id: ids[1], at: moment.utc('2018-01-14T11:40:00Z').toDate() },
    { _id: ids[2], at: moment.utc('2018-01-14T12:40:00Z').toDate() }
  ];
  const list = await qm.balanceQueueTimes(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-29T01:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-29T02:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-29T03:00:00.000Z');
});

test('should balance queue times - 2 schedules + start of the day', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ schedules: [[60, 3 * 60], [2 * 60]] })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];
  q.posts.list = [
    { _id: ids[0], at: moment.utc('2018-01-14T10:40:00Z').toDate() },
    { _id: ids[1], at: moment.utc('2018-01-14T11:40:00Z').toDate() },
    { _id: ids[2], at: moment.utc('2018-01-14T12:40:00Z').toDate() }
  ];
  const list = await qm.balanceQueueTimes(q);
  expect(list.length).toBe(3);
  equalObjectId(list[0]._id, ids[0]);
  expect(list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(list[1]._id, ids[1]);
  expect(list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  equalObjectId(list[2]._id, ids[2]);
  expect(list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
});

test('should balance queue times - 2 schedules + start of the day + publish first', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('linkedin', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ schedules: [[60, 3 * 60], [2 * 60]] })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];

  let qq = await qm.schedulePost({
    post: {
      _id: ids[0],
      aid: q._id
    },
    type: 'first'
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(1);
  expect(qq.posts.list.length).toBe(1);
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[0]);

  qq = await qm.schedulePost({
    post: {
      _id: ids[1],
      aid: q._id
    },
    type: 'first'
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(2);
  expect(qq.posts.list.length).toBe(2);
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(qq.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[1]);
  equalObjectId(qq.posts.list[1]._id, ids[0]);

  qq = await qm.schedulePost({
    post: {
      _id: ids[2],
      aid: q._id
    },
    type: 'first'
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(3);
  expect(qq.posts.list.length).toBe(3);
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(qq.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(qq.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[2]);
  equalObjectId(qq.posts.list[1]._id, ids[1]);
  equalObjectId(qq.posts.list[2]._id, ids[0]);
});

test('should balance queue times - 2 schedules + start of the day + publish last', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ schedules: [[60, 3 * 60], [2 * 60]] })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];

  let qq = await qm.schedulePost({
    post: {
      _id: ids[0],
      aid: q._id
    },
    type: 'last'
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(1);
  expect(qq.posts.list.length).toBe(1);
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[0]);

  qq = await qm.schedulePost({
    post: {
      _id: ids[1],
      aid: q._id
    },
    type: 'last'
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(2);
  expect(qq.posts.list.length).toBe(2);
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(qq.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[0]);
  equalObjectId(qq.posts.list[1]._id, ids[1]);

  qq = await qm.schedulePost({
    post: {
      _id: ids[2],
      aid: q._id
    },
    type: 'last'
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(3);
  expect(qq.posts.list.length).toBe(3);
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(qq.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(qq.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[0]);
  equalObjectId(qq.posts.list[1]._id, ids[1]);
  equalObjectId(qq.posts.list[2]._id, ids[2]);
});

test('should balance queue times - 2 schedules + start of the day + publish last and first', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ schedules: [[60, 3 * 60], [2 * 60]] })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];

  let qq = await qm.schedulePost({
    post: {
      _id: ids[0],
      aid: q._id
    },
    type: 'last'
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(1);
  expect(qq.posts.list.length).toBe(1);
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[0]);

  qq = await qm.schedulePost({
    post: {
      _id: ids[1],
      aid: q._id
    },
    type: 'last'
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(2);
  expect(qq.posts.list.length).toBe(2);
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(qq.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[0]);
  equalObjectId(qq.posts.list[1]._id, ids[1]);

  qq = await qm.schedulePost({
    post: {
      _id: ids[2],
      aid: q._id
    },
    type: 'first'
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(3);
  expect(qq.posts.list.length).toBe(3);
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(qq.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(qq.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[2]);
  equalObjectId(qq.posts.list[1]._id, ids[0]);
  equalObjectId(qq.posts.list[2]._id, ids[1]);
});

test('should balance queue delay - start of the day', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ delay: 10 * 60 })
  });

  const ids = [ObjectId(), ObjectId(), ObjectId()];

  let qq = await qm.schedulePost({
    post: {
      _id: ids[0],
      aid: q._id
    }
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(1);
  expect(qq.posts.list.length).toBe(1);
  expect(qq.posts.nextAt.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[0]);

  qm.setNow('2018-01-15T01:00:00Z');
  qq = await qm.schedulePost({
    post: {
      _id: ids[1],
      aid: q._id
    }
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(2);
  expect(qq.posts.list.length).toBe(2);
  expect(qq.posts.nextAt.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(qq.posts.list[1].at.toISOString()).toBe('2018-01-15T01:10:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[0]);
  equalObjectId(qq.posts.list[1]._id, ids[1]);

  qm.setNow('2018-01-15T02:00:00Z');
  qq = await qm.schedulePost({
    post: {
      _id: ids[2],
      aid: q._id
    }
  });
  expect(qq).toBeTruthy();
  expect(qq.posts.count).toBe(3);
  expect(qq.posts.list.length).toBe(3);
  expect(qq.posts.nextAt.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(qq.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(qq.posts.list[1].at.toISOString()).toBe('2018-01-15T01:10:00.000Z');
  expect(qq.posts.list[2].at.toISOString()).toBe('2018-01-15T02:10:00.000Z');
  equalObjectId(qq.posts.list[0]._id, ids[0]);
  equalObjectId(qq.posts.list[1]._id, ids[1]);
  equalObjectId(qq.posts.list[2]._id, ids[2]);
});

test('should reschedule post - queue counts', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const postId = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: postId[0], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[0]);

  q = await qm.schedulePost({ post: { _id: postId[1], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[1]);
  equalObjectId(q.posts.list[1]._id, postId[0]);

  q = await qm.schedulePost({ post: { _id: postId[2], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-16T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[2]);
  equalObjectId(q.posts.list[1]._id, postId[1]);
  equalObjectId(q.posts.list[2]._id, postId[0]);

  //
  q = await qm.reschedulePost({
    post: { _id: postId[0], aid: queue._id, publishAt: moment.utc('2018-01-15T14:00:00.000Z').toDate() }
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T14:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[2]);
  equalObjectId(q.posts.list[1]._id, postId[0]);
  equalObjectId(q.posts.list[2]._id, postId[1]);

  //
  q = await qm.reschedulePost({
    post: { _id: postId[0], aid: queue._id, publishAt: moment.utc('2018-01-15T15:00:00.000Z').toDate() }
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T15:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[2]);
  equalObjectId(q.posts.list[1]._id, postId[0]);
  equalObjectId(q.posts.list[2]._id, postId[1]);

  //
  q = await qm.reschedulePost({
    post: { _id: postId[1], aid: queue._id, publishAt: moment.utc('2018-01-16T17:00:00.000Z').toDate() }
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T15:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-16T17:00:00.000Z');
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeTruthy();
  expect(q.posts.list[2].f).toBeTruthy();
  equalObjectId(q.posts.list[0]._id, postId[2]);
  equalObjectId(q.posts.list[1]._id, postId[0]);
  equalObjectId(q.posts.list[2]._id, postId[1]);
});

test('should reschedule post - queue times', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ schedules: [[60, 3 * 60], [2 * 60]] })
  });

  const ids = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: ids[0], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);

  q = await qm.schedulePost({ post: { _id: ids[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);

  q = await qm.schedulePost({ post: { _id: ids[2], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  equalObjectId(q.posts.list[1]._id, ids[0]);
  equalObjectId(q.posts.list[2]._id, ids[1]);

  //
  q = await qm.reschedulePost({
    post: { _id: ids[2], aid: queue._id, publishAt: moment.utc('2018-01-15T00:30:00.000Z').toDate() }
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeTruthy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:30:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  equalObjectId(q.posts.list[1]._id, ids[0]);
  equalObjectId(q.posts.list[2]._id, ids[1]);

  //
  q = await qm.reschedulePost({
    post: { _id: ids[0], aid: queue._id, publishAt: moment.utc('2018-01-15T00:15:00.000Z').toDate() }
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeTruthy();
  expect(q.posts.list[1].f).toBeTruthy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:15:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T00:30:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[2]);
  equalObjectId(q.posts.list[2]._id, ids[1]);

  //
  q = await qm.reschedulePost({
    post: { _id: ids[1], aid: queue._id, publishAt: moment.utc('2018-01-16T17:00:00.000Z').toDate() }
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:15:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T00:30:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-16T17:00:00.000Z');
  expect(q.posts.list[0].f).toBeTruthy();
  expect(q.posts.list[1].f).toBeTruthy();
  expect(q.posts.list[2].f).toBeTruthy();
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[2]);
  equalObjectId(q.posts.list[2]._id, ids[1]);
});

test('should reschedule post - queue delay', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ delay: 10 * 60 })
  });

  const ids = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: ids[0], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);

  qm.setNow('2018-01-15T01:00:00Z');
  q = await qm.schedulePost({ post: { _id: ids[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T01:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);

  qm.setNow('2018-01-15T02:00:00Z');
  q = await qm.schedulePost({ post: { _id: ids[2], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T01:10:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T02:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);
  equalObjectId(q.posts.list[2]._id, ids[2]);

  //
  q = await qm.reschedulePost({
    post: { _id: ids[2], aid: queue._id, publishAt: moment.utc('2018-01-15T00:05:00.000Z').toDate() }
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeTruthy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:05:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T01:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  equalObjectId(q.posts.list[1]._id, ids[0]);
  equalObjectId(q.posts.list[2]._id, ids[1]);

  //
  q = await qm.reschedulePost({
    post: { _id: ids[0], aid: queue._id, publishAt: moment.utc('2018-01-15T00:04:00.000Z').toDate() }
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeTruthy();
  expect(q.posts.list[1].f).toBeTruthy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:04:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T00:05:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T01:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[2]);
  equalObjectId(q.posts.list[2]._id, ids[1]);

  //
  q = await qm.reschedulePost({
    post: { _id: ids[1], aid: queue._id, publishAt: moment.utc('2018-01-16T17:00:00.000Z').toDate() }
  });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:04:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T00:05:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-16T17:00:00.000Z');
  expect(q.posts.list[0].f).toBeTruthy();
  expect(q.posts.list[1].f).toBeTruthy();
  expect(q.posts.list[2].f).toBeTruthy();
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[2]);
  equalObjectId(q.posts.list[2]._id, ids[1]);
});

test('should remove post from queue times', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ schedules: [[60, 3 * 60], [2 * 60]] })
  });

  const ids = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: ids[0], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);

  q = await qm.schedulePost({ post: { _id: ids[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);

  q = await qm.schedulePost({ post: { _id: ids[2], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  equalObjectId(q.posts.list[1]._id, ids[0]);
  equalObjectId(q.posts.list[2]._id, ids[1]);

  //
  q = await qm.removePost({ post: { _id: ids[0], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  equalObjectId(q.posts.list[1]._id, ids[1]);
  expect(q.posts.published).toBeFalsy();

  q = await qm.removePost({ post: { _id: ids[1], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  expect(q.posts.published).toBeFalsy();

  q = await qm.removePost({ post: { _id: ids[2], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(0);
  expect(q.posts.list.length).toBe(0);
  expect(q.posts.published).toBeFalsy();

  q = await qm.removePost({ post: { _id: new ObjectId(), aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(0);
  expect(q.posts.list.length).toBe(0);
  expect(q.posts.published).toBeFalsy();
});

test('should remove post from queue counts', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const postId = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: postId[0], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[0]);

  q = await qm.schedulePost({ post: { _id: postId[1], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[1]);
  equalObjectId(q.posts.list[1]._id, postId[0]);

  q = await qm.schedulePost({ post: { _id: postId[2], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-16T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[2]);
  equalObjectId(q.posts.list[1]._id, postId[1]);
  equalObjectId(q.posts.list[2]._id, postId[0]);

  //
  q = await qm.removePost({ post: { _id: postId[1], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[2]);
  equalObjectId(q.posts.list[1]._id, postId[0]);
  expect(q.posts.published).toBeFalsy();

  q = await qm.removePost({ post: { _id: postId[0], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[2]);
  expect(q.posts.published).toBeFalsy();

  //
  q = await qm.removePost({ post: { _id: postId[2], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(0);
  expect(q.posts.list.length).toBe(0);

  //
  q = await qm.removePost({ post: { _id: new ObjectId(), aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(0);
  expect(q.posts.list.length).toBe(0);
});

test('should remove post from queue delay', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ delay: 10 * 60 })
  });

  const ids = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: ids[0], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);

  qm.setNow('2018-01-15T01:00:00Z');
  q = await qm.schedulePost({ post: { _id: ids[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T01:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);

  qm.setNow('2018-01-15T02:00:00Z');
  q = await qm.schedulePost({ post: { _id: ids[2], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T01:10:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T02:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);
  equalObjectId(q.posts.list[2]._id, ids[2]);

  //
  q = await qm.removePost({ post: { _id: ids[1], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T00:10:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[2]);
  expect(q.posts.published).toBeFalsy();

  q = await qm.removePost({ post: { _id: ids[0], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T02:10:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  expect(q.posts.published).toBeFalsy();

  //
  q = await qm.removePost({ post: { _id: ids[2], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(0);
  expect(q.posts.list.length).toBe(0);

  //
  q = await qm.removePost({ post: { _id: new ObjectId(), aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(0);
  expect(q.posts.list.length).toBe(0);
});

test('should move post to top queue times', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ schedules: [[60, 3 * 60], [2 * 60]] })
  });

  const ids = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: ids[0], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);

  q = await qm.schedulePost({ post: { _id: ids[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);

  q = await qm.schedulePost({ post: { _id: ids[2], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  equalObjectId(q.posts.list[1]._id, ids[0]);
  equalObjectId(q.posts.list[2]._id, ids[1]);

  //
  q = await qm.moveTopPost({ post: { _id: ids[1], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[1]);
  equalObjectId(q.posts.list[1]._id, ids[2]);
  equalObjectId(q.posts.list[2]._id, ids[0]);

  //
  q = await qm.moveTopPost({ post: { _id: ids[2], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  equalObjectId(q.posts.list[1]._id, ids[1]);
  equalObjectId(q.posts.list[2]._id, ids[0]);

  //
  q = await qm.moveTopPost({ post: { _id: ids[0], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[2]);
  equalObjectId(q.posts.list[2]._id, ids[1]);

  q = await qm.moveTopPost({ post: { _id: ids[2], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[2]);
  equalObjectId(q.posts.list[1]._id, ids[0]);
  equalObjectId(q.posts.list[2]._id, ids[1]);

  q = await qm.moveTopPost({ post: { _id: ids[1], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[1]);
  equalObjectId(q.posts.list[1]._id, ids[2]);
  equalObjectId(q.posts.list[2]._id, ids[0]);

  q = await qm.moveTopPost({ post: { _id: ids[0], aid: queue._id } });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeFalsy();
  expect(q.posts.list[2].f).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T02:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T03:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);
  equalObjectId(q.posts.list[2]._id, ids[2]);
});

test('should mark post as published', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const type = Types.createCodeByName('instagram', 'page');
  const queue = await qm.createQueue({
    type,
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const postId = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];

  let posts = await Promise.map(postId, async _id => new Post({ _id, aid: queue._id }).save(), { concurrency: 1 });

  let q = await qm.schedulePost({ post: posts[0], type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[0]);

  q = await qm.schedulePost({ post: posts[1], type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[1]);
  equalObjectId(q.posts.list[1]._id, postId[0]);

  q = await qm.schedulePost({ post: posts[2], type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-16T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[2]);
  equalObjectId(q.posts.list[1]._id, postId[1]);
  equalObjectId(q.posts.list[2]._id, postId[0]);

  posts[3].publish.count = 3;
  posts[3].publish.interval = 1;
  posts[3].publish.intervalUnit = 'days';
  await posts[3].save();

  q = await qm.scheduleRepeatingPost({ post: posts[3], type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(6);
  expect(q.posts.list.length).toBe(6);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(q.posts.list[3].at.toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(q.posts.list[4].at.toISOString()).toBe('2018-01-16T16:00:00.000Z');
  expect(q.posts.list[5].at.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[3]);
  equalObjectId(q.posts.list[1]._id, postId[2]);
  equalObjectId(q.posts.list[2]._id, postId[1]);
  equalObjectId(q.posts.list[3]._id, postId[3]);
  equalObjectId(q.posts.list[4]._id, postId[0]);
  equalObjectId(q.posts.list[5]._id, postId[3]);

  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });
  let p = posts[3];
  expect(p.publish.count).toBe(3);
  expect(p.publish.interval).toBe(1);
  expect(p.publish.intervalUnit).toBe('days');
  expect(p.publish.published).toBe(0);
  expect(p.publish.publishAt).toBeTruthy();
  expect(p.publish.publishAt.length).toBe(3);
  expect(p.publish.publishAt[0].toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(p.publish.publishAt[1].toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(p.publish.publishAt[2].toISOString()).toBe('2018-01-17T08:00:00.000Z');
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(0);
  expect(p.publish.failedAt).toBeTruthy();
  expect(p.publish.failedAt.length).toBe(0);

  //
  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });

  posts[1].id = 'id';
  posts[1].url = 'url';
  await posts[1].save();

  let reply = await qm.publishedPost({ post: posts[1] });
  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });

  q = reply.queue;
  expect(q).toBeTruthy();
  expect(reply.isRepeatPost).toBeFalsy();
  expect(reply.isLastRepeatPost).toBeFalsy();
  expect(reply.newPost).toBeFalsy();
  expect(reply.found).toBeTruthy();
  expect(q.posts.count).toBe(5);
  expect(q.posts.list.length).toBe(5);
  expect(q.posts.published['20180115']).toBe(1);
  expect(q.posts.nextAt.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(q.posts.list[3].at.toISOString()).toBe('2018-01-16T16:00:00.000Z');
  expect(q.posts.list[4].at.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[3]);
  equalObjectId(q.posts.list[1]._id, postId[2]);
  equalObjectId(q.posts.list[2]._id, postId[3]);
  equalObjectId(q.posts.list[3]._id, postId[0]);
  equalObjectId(q.posts.list[4]._id, postId[3]);

  p = posts[1];
  expect(p.id).toBe('id');
  expect(p.url).toBe('url');
  expect(p.blockedAt).toBe(null);
  expect(p.lockedUntil).toBe(null);
  expect(p.tries).toBe(0);
  expect(p.state).toBe(States.post.published.code);
  expect(p.failures.toObject()).toEqual([]);
  expect(p.completedAt.toISOString()).toBe('2018-01-15T00:00:00.000Z');
  expect(p.publish.published).toBe(1);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(1);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-15T00:00:00.000Z');

  //
  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });

  posts[2].id = 'id2';
  posts[2].url = 'url2';
  await posts[2].save();

  reply = await qm.publishedPost({ post: posts[2] });
  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });

  q = reply.queue;
  expect(q).toBeTruthy();
  expect(reply.isRepeatPost).toBeFalsy();
  expect(reply.isLastRepeatPost).toBeFalsy();
  expect(reply.newPost).toBeFalsy();
  expect(reply.found).toBeTruthy();
  expect(q.posts.count).toBe(4);
  expect(q.posts.list.length).toBe(4);
  expect(q.posts.published['20180115']).toBe(2);
  expect(q.posts.nextAt.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-16T16:00:00.000Z');
  expect(q.posts.list[3].at.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[3]);
  equalObjectId(q.posts.list[1]._id, postId[3]);
  equalObjectId(q.posts.list[2]._id, postId[0]);
  equalObjectId(q.posts.list[3]._id, postId[3]);

  p = posts[2];
  expect(p.id).toBe('id2');
  expect(p.url).toBe('url2');
  expect(p.blockedAt).toBe(null);
  expect(p.lockedUntil).toBe(null);
  expect(p.tries).toBe(0);
  expect(p.state).toBe(States.post.published.code);
  expect(p.failures.toObject()).toEqual([]);
  expect(p.completedAt.toISOString()).toBe('2018-01-15T00:00:00.000Z');
  expect(p.publish.published).toBe(1);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(1);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-15T00:00:00.000Z');

  //
  qm.setNow('2018-01-15T08:00:00.000Z');

  let fetchedPosts = await qm.fetchPost({ type });
  expect(fetchedPosts).toBeTruthy();
  expect(fetchedPosts.length).toBe(1);
  equalObjectId(fetchedPosts[0], postId[3]);

  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });
  p = posts[3];
  expect(p.id).toBeFalsy();
  expect(p.url).toBeFalsy();
  expect(p.completedAt).toBe(null);
  expect(p.blockedAt).toBe(null);
  expect(p.publishAt.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(
    p.lockedUntil.toISOString()).toBe(qm
      .now()
      .add(qm.lockAcquiredPostTTL, 'ms')
      .toDate()
      .toISOString()
  );
  expect(p.tries).toBe(1);
  expect(p.state).toBe(States.post.publishing.code);
  expect(p.failures.toObject()).toEqual([]);
  expect(p.publish.count).toBe(3);
  expect(p.publish.published).toBe(0);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(0);
  expect(p.publish.failedAt).toBeTruthy();
  expect(p.publish.failedAt.length).toBe(0);
  expect(p.publish.publishAt.length).toBe(3);
  expect(p.publish.publishAt[0].toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(p.publish.publishAt[1].toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(p.publish.publishAt[2].toISOString()).toBe('2018-01-17T08:00:00.000Z');

  posts[3].id = 'id3';
  posts[3].url = 'url3';
  await posts[3].save();

  reply = await qm.publishedPost({ post: posts[3] });
  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });

  q = reply.queue;
  expect(q).toBeTruthy();
  expect(reply.isRepeatPost).toBeTruthy();
  expect(reply.isLastRepeatPost).toBeFalsy();
  expect(reply.newPost).toBeTruthy();
  expect(reply.found).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.published['20180115']).toBe(3);
  expect(q.posts.nextAt.toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-16T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[3]);
  equalObjectId(q.posts.list[1]._id, postId[0]);
  equalObjectId(q.posts.list[2]._id, postId[3]);

  p = reply.newPost;
  expect(p).toBeTruthy();
  expect(p.id).toBe('id3');
  expect(p.url).toBe('url3');
  expect(p.blockedAt).toBe(null);
  expect(p.lockedUntil).toBe(null);
  expect(p.tries).toBe(1);
  expect(p.state).toBe(States.post.published.code);
  expect(p.failures.toObject()).toEqual([]);
  expect(p.completedAt.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(p.publish.count).toBe(1);
  expect(p.publish.published).toBe(1);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(1);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-15T08:00:00.000Z');
  equalObjectId(p.publish.parent, postId[3]);
  expect(p._id.toString === postId[3].toString()).toBeFalsy();

  p = posts[3];
  expect(p.id).toBeFalsy();
  expect(p.url).toBeFalsy();
  expect(p.blockedAt).toBe(null);
  expect(p.lockedUntil).toBe(null);
  expect(p.completedAt).toBe(null);
  expect(p.tries).toBe(0);
  expect(p.state).toBe(States.post.scheduled.code);
  expect(p.publishAt.toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(p.failures.toObject()).toEqual([]);
  expect(p.publish.published).toBe(1);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(1);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(p.publish.publishAt.length).toBe(2);
  expect(p.publish.publishAt[0].toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(p.publish.publishAt[1].toISOString()).toBe('2018-01-17T08:00:00.000Z');

  //
  qm.setNow('2018-01-16T08:00:00.000Z');

  fetchedPosts = await qm.fetchPost({ type });
  expect(fetchedPosts).toBeTruthy();
  expect(fetchedPosts.length).toBe(1);
  equalObjectId(fetchedPosts[0], postId[3]);

  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });
  p = posts[3];
  expect(p.id).toBeFalsy();
  expect(p.url).toBeFalsy();
  expect(p.completedAt).toBe(null);
  expect(p.blockedAt).toBe(null);
  expect(p.publishAt.toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(
    p.lockedUntil.toISOString()).toBe(
    qm
      .now()
      .add(qm.lockAcquiredPostTTL, 'ms')
      .toDate()
      .toISOString()
  );
  expect(p.tries).toBe(1);
  expect(p.state).toBe(States.post.publishing.code);
  expect(p.failures.toObject()).toEqual([]);
  expect(p.publish.count).toBe(3);
  expect(p.publish.published).toBe(1);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(1);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(p.publish.failedAt).toBeTruthy();
  expect(p.publish.failedAt.length).toBe(0);
  expect(p.publish.publishAt.length).toBe(2);
  expect(p.publish.publishAt[0].toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(p.publish.publishAt[1].toISOString()).toBe('2018-01-17T08:00:00.000Z');

  posts[3].id = 'id4';
  posts[3].url = 'url4';
  await posts[3].save();

  reply = await qm.publishedPost({ post: posts[3] });
  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });

  q = reply.queue;
  expect(q).toBeTruthy();
  expect(reply.isRepeatPost).toBeTruthy();
  expect(reply.isLastRepeatPost).toBeFalsy();
  expect(reply.newPost).toBeTruthy();
  expect(reply.found).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.published['20180115']).toBe(3);
  expect(q.posts.published['20180116']).toBe(1);
  expect(q.posts.nextAt.toISOString()).toBe('2018-01-16T16:00:00.000Z');
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-16T16:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[0]);
  equalObjectId(q.posts.list[1]._id, postId[3]);

  p = reply.newPost;
  expect(p).toBeTruthy();
  expect(p.id).toBe('id4');
  expect(p.url).toBe('url4');
  expect(p.blockedAt).toBe(null);
  expect(p.lockedUntil).toBe(null);
  expect(p.tries).toBe(1);
  expect(p.state).toBe(States.post.published.code);
  expect(p.failures.toObject()).toEqual([]);
  expect(p.completedAt.toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(p.publish.count).toBe(1);
  expect(p.publish.published).toBe(1);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(1);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-16T08:00:00.000Z');
  equalObjectId(p.publish.parent, postId[3]);
  expect(p._id.toString === postId[3].toString()).toBeFalsy();

  p = posts[3];
  expect(p.id).toBeFalsy();
  expect(p.url).toBeFalsy();
  expect(p.blockedAt).toBe(null);
  expect(p.lockedUntil).toBe(null);
  expect(p.completedAt).toBe(null);
  expect(p.tries).toBe(0);
  expect(p.state).toBe(States.post.scheduled.code);
  expect(p.publishAt.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  expect(p.failures.toObject()).toEqual([]);
  expect(p.publish.published).toBe(2);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(2);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(p.publish.publishedAt[1].toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(p.publish.publishAt.length).toBe(1);
  expect(p.publish.publishAt[0].toISOString()).toBe('2018-01-17T08:00:00.000Z');

  //
  qm.setNow('2018-01-16T16:00:00.000Z');

  fetchedPosts = await qm.fetchPost({ type });
  expect(fetchedPosts).toBeTruthy();
  expect(fetchedPosts.length).toBe(1);
  equalObjectId(fetchedPosts[0], postId[0]);

  posts[0].id = 'id5';
  posts[0].url = 'url5';
  await posts[0].save();

  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });
  reply = await qm.publishedPost({ post: posts[0] });
  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });

  q = reply.queue;
  expect(q).toBeTruthy();
  expect(reply.isRepeatPost).toBeFalsy();
  expect(reply.isLastRepeatPost).toBeFalsy();
  expect(reply.newPost).toBeFalsy();
  expect(reply.found).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.published['20180115']).toBe(3);
  expect(q.posts.published['20180116']).toBe(2);
  expect(q.posts.nextAt.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId[3]);

  p = posts[0];
  expect(p.id).toBe('id5');
  expect(p.url).toBe('url5');
  expect(p.blockedAt).toBe(null);
  expect(p.lockedUntil).toBe(null);
  expect(p.tries).toBe(1);
  expect(p.state).toBe(States.post.published.code);
  expect(p.failures.toObject()).toEqual([]);
  expect(p.completedAt.toISOString()).toBe('2018-01-16T16:00:00.000Z');
  expect(p.publish.published).toBe(1);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(1);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-16T16:00:00.000Z');

  //
  qm.setNow('2018-01-17T08:00:00.000Z');

  fetchedPosts = await qm.fetchPost({ type });
  expect(fetchedPosts).toBeTruthy();
  expect(fetchedPosts.length).toBe(1);
  equalObjectId(fetchedPosts[0], postId[3]);

  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });
  p = posts[3];
  expect(p.id).toBeFalsy();
  expect(p.url).toBeFalsy();
  expect(p.completedAt).toBe(null);
  expect(p.blockedAt).toBe(null);
  expect(p.publishAt.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  expect(
    p.lockedUntil.toISOString()).toBe(
    qm
      .now()
      .add(qm.lockAcquiredPostTTL, 'ms')
      .toDate()
      .toISOString()
  );
  expect(p.tries).toBe(1);
  expect(p.state).toBe(States.post.publishing.code);
  expect(p.failures.toObject()).toEqual([]);
  expect(p.publish.count).toBe(3);
  expect(p.publish.published).toBe(2);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(2);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(p.publish.publishedAt[1].toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(p.publish.failedAt).toBeTruthy();
  expect(p.publish.failedAt.length).toBe(0);
  expect(p.publish.publishAt.length).toBe(1);
  expect(p.publish.publishAt[0].toISOString()).toBe('2018-01-17T08:00:00.000Z');

  posts[3].id = 'id6';
  posts[3].url = 'url6';
  await posts[3].save();

  reply = await qm.publishedPost({ post: posts[3] });
  posts = await Promise.map(postId, async _id => Post.findById(_id).exec(), { concurrency: 1 });

  q = reply.queue;
  expect(q).toBeTruthy();
  expect(reply.isRepeatPost).toBeTruthy();
  expect(reply.isLastRepeatPost).toBeTruthy();
  expect(reply.newPost).toBeFalsy();
  expect(reply.found).toBeTruthy();
  expect(q.posts.count).toBe(0);
  expect(q.posts.list.length).toBe(0);
  expect(q.posts.published['20180115']).toBe(3);
  expect(q.posts.published['20180116']).toBe(2);
  expect(q.posts.published['20180117']).toBe(1);
  expect(q.posts.nextAt).toBe(null);

  p = posts[3];
  expect(p).toBeTruthy();
  expect(p.id).toBe('id6');
  expect(p.url).toBe('url6');
  expect(p.blockedAt).toBe(null);
  expect(p.lockedUntil).toBe(null);
  expect(p.tries).toBe(1);
  expect(p.state).toBe(States.post.published.code);
  expect(p.failures.toObject()).toEqual([]);
  expect(p.completedAt.toISOString()).toBe('2018-01-17T08:00:00.000Z');
  expect(p.publish.count).toBe(3);
  expect(p.publish.published).toBe(3);
  expect(p.publish.publishAt).toBeTruthy();
  expect(p.publish.publishAt.length).toBe(0);
  expect(p.publish.publishedAt).toBeTruthy();
  expect(p.publish.publishedAt.length).toBe(3);
  expect(p.publish.publishedAt[0].toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(p.publish.publishedAt[1].toISOString()).toBe('2018-01-16T08:00:00.000Z');
  expect(p.publish.publishedAt[2].toISOString()).toBe('2018-01-17T08:00:00.000Z');
  expect(p.publish.parent).toBeFalsy();
});

test('should aquire queue', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const type = Types.createCodeByName('google', 'page');
  const type2 = Types.createCodeByName('google', 'collection');
  const queue = await qm.createQueue({
    type,
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });
  const queue2 = await qm.createQueue({
    type: type2,
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });
  const queue3 = await qm.createQueue({
    type,
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  expect(await qm.acquireQueue({ type })).toBeFalsy();
  expect(await qm.acquireQueue({ type: type + 1 })).toBeFalsy();

  //
  qm.setNow('2018-01-15T10:00:00Z');

  const postId = new ObjectId();
  let q = await qm.schedulePost({ post: { _id: postId, aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T17:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId);

  qm.setNow('2018-01-16T00:00:00Z');

  let r = await qm.acquireQueue({ type });
  expect(r).toBeTruthy();
  expect(r.queue).toBeTruthy();
  expect(r.lock).toBeTruthy();
  expect(r.queue.posts.checkedAt.toISOString() !== queue.posts.checkedAt.toISOString()).toBeTruthy();
  equalObjectId(r.queue._id, queue._id);

  //
  const postId2 = new ObjectId();
  q = await qm.schedulePost({ post: { _id: postId2, aid: queue3._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-16T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, postId2);

  qm.setNow('2018-01-17T00:00:00Z');

  r = await qm.acquireQueue({ type });
  expect(r).toBeTruthy();
  expect(r.queue).toBeTruthy();
  expect(r.lock).toBeTruthy();
  expect(r.queue.posts.checkedAt.toISOString() !== queue3.posts.checkedAt.toISOString()).toBeTruthy();
  equalObjectId(r.queue._id, queue3._id);

  // all queues are locked
  expect(await qm.acquireQueue({ type })).toBeFalsy();
});

test('should aquire post', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const type = Types.createCodeByName('google', 'profile');
  const queue = await qm.createQueue({
    type,
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const ids = [new ObjectId(), new ObjectId(), new ObjectId()];

  await new Post({ _id: ids[0] }).save();
  let q = await qm.schedulePost({ post: { _id: ids[0], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);

  //
  expect(await qm.acquirePost({ queue: q })).toBeFalsy();

  qm.setNow('2018-01-15T12:00:00.000Z');

  expect(q.posts.fetchedAt).toBeFalsy();

  qm.lockAcquiredPostTTL = 12 * 60 * 60 * 1000;

  let pi = await qm.fetchPost({ type });
  expect(pi).toBeTruthy();
  expect(pi.length).toBe(1);
  equalObjectId(pi[0], ids[0]);

  let p = await Post.findById(ids[0]).exec();
  expect(p).toBeTruthy();
  expect(p.tries).toBe(1);
  expect(p.state).toBe(States.post.publishing.code);
  expect(p.completedAt).toBe(null);
  expect(p.blockedAt).toBe(null);
  expect(p.publishAt).toBeTruthy();
  expect(p.publishAt.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  expect(p.lockedUntil).toBeTruthy();
  expect(
    p.lockedUntil.toISOString()).toBe(
    qm
      .now()
      .add(qm.lockAcquiredPostTTL, 'ms')
      .toDate()
      .toISOString()
  );

  q = await Queue.findById(queue._id);
  expect(q.posts.fetchedAt).toBeTruthy();
  expect(q.posts.fetchedAt.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  expect(q.posts.list[0].lck).toBeTruthy();
  expect(
    q.posts.list[0].lck.toISOString()).toBe(
    qm
      .now()
      .add(qm.lockAcquiredPostTTL, 'ms')
      .toDate()
      .toISOString()
  );

  //
  await new Post({ _id: ids[1] }).save();
  q = await qm.schedulePost({ post: { _id: ids[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T20:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);

  qm.setNow('2018-01-15T20:00:00.000Z');

  qm.lockAcquiredPostTTL = 5 * 60 * 1000;

  pi = await qm.fetchPost({ type });
  expect(pi).toBeTruthy();
  expect(pi.length).toBe(1);
  equalObjectId(pi[0], ids[1]);

  p = await Post.findById(ids[1]).exec();
  expect(p).toBeTruthy();
  expect(p.tries).toBe(1);
  expect(p.state).toBe(States.post.publishing.code);
  expect(p.completedAt).toBe(null);
  expect(p.blockedAt).toBe(null);
  expect(p.publishAt).toBeTruthy();
  expect(p.publishAt.toISOString()).toBe('2018-01-15T20:00:00.000Z');
  expect(p.lockedUntil).toBeTruthy();
  expect(
    p.lockedUntil.toISOString()).toBe(
    qm
      .now()
      .add(qm.lockAcquiredPostTTL, 'ms')
      .toDate()
      .toISOString()
  );

  q = await Queue.findById(queue._id);
  expect(q.posts.fetchedAt).toBeTruthy();
  expect(q.posts.fetchedAt.toISOString()).toBe('2018-01-15T20:00:00.000Z');
  expect(q.posts.list[1].lck).toBeTruthy();
  expect(
    q.posts.list[1].lck.toISOString()).toBe(
    qm
      .now()
      .add(qm.lockAcquiredPostTTL, 'ms')
      .toDate()
      .toISOString()
  );
});

test('should lock the post', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const type = Types.createCodeByName('google', 'community');
  const queue = await qm.createQueue({
    type,
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const ids = [new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: ids[0], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].lck).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T12:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);

  q = await qm.schedulePost({ post: { _id: ids[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].lck).toBeFalsy();
  expect(q.posts.list[1].lck).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T08:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T16:00:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);

  const lockFor = 1 * 60 * 60 * 1000;
  q = await qm.lockPost({ post: { _id: ids[1], aid: queue._id }, lockFor });
  expect(q).toBeTruthy();
  expect(q.posts.list[0].lck).toBeFalsy();
  expect(q.posts.list[1].lck).toBeTruthy();
  expect(
    q.posts.list[1].lck.toISOString()).toBe(
    qm
      .now()
      .add(lockFor, 'ms')
      .toDate()
      .toISOString()
  );
});

test('should pause queue', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    type: Types.createCodeByName('google', 'community'),
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  let q = await qm.pauseQueue({ queueId: queue._id, inactiveUntil: qm.now().toDate(), inactiveReason: 'reason' });
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.paused.code);
  expect(q.inactiveReason).toBe('reason');
  expect(q.inactiveUntil.toISOString()).toBe(qm.now().toDate().toISOString());

  q = await Queue.findById(queue._id).exec();
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.paused.code);
  expect(q.inactiveReason).toBe('reason');
  expect(q.inactiveUntil.toISOString()).toBe(qm.now().toDate().toISOString());
});

test('should block queue', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    type: Types.createCodeByName('google', 'community'),
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  let q = await qm.blockQueue({ queueId: queue._id, inactiveUntil: qm.now().toDate(), inactiveReason: 'reason' });
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.blocked.code);
  expect(q.inactiveReason).toBe('reason');
  expect(q.inactiveUntil.toISOString()).toBe(qm.now().toDate().toISOString());

  q = await Queue.findById(queue._id).exec();
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.blocked.code);
  expect(q.inactiveReason).toBe('reason');
  expect(q.inactiveUntil.toISOString()).toBe(qm.now().toDate().toISOString());

  q = await qm.blockQueue({ queueId: queue._id, forReconnect: true });
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.reconnectRequired.code);
  expect(q.inactiveReason).toBeFalsy();
  expect(q.inactiveUntil).toBeFalsy();

  q = await Queue.findById(queue._id).exec();
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.reconnectRequired.code);
  expect(q.inactiveReason).toBeFalsy();
  expect(q.inactiveUntil).toBeFalsy();
});

test('should enable queue', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    type: Types.createCodeByName('google', 'community'),
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  let q = await qm.blockQueue({ queueId: queue._id });
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.blocked.code);

  q = await Queue.findById(queue._id).exec();
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.blocked.code);

  q = await qm.enableQueue({ queueId: queue._id });
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.enabled.code);

  q = await Queue.findById(queue._id).exec();
  expect(q).toBeTruthy();
  expect(q.state).toBe(States.queue.enabled.code);
});

test('should empty queue', async () => {
  const qm = createQueueManager({ redisConfig: {} });
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const postId = [new ObjectId(), new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: postId[0], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  equalObjectId(q.posts.list[0]._id, postId[0]);

  q = await qm.schedulePost({ post: { _id: postId[1], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  equalObjectId(q.posts.list[0]._id, postId[1]);
  equalObjectId(q.posts.list[1]._id, postId[0]);

  q = await qm.emptyQueue({ queueId: queue._id });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(0);
  expect(q.posts.nextAt).toBe(null);
  expect(q.posts.list.length).toBe(0);
});

test('should schedule repeating post', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const _id = new ObjectId();

  let q = await qm.scheduleRepeatingPost({
    type: 'first',
    post: {
      _id,
      aid: queue._id,
      publish: {
        interval: 1,
        intervalUnit: 'hours',
        period: 3,
        periodUnit: 'hours'
      }
    }
  });

  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(3);
  expect(q.posts.list.length).toBe(3);
  equalObjectId(q.posts.list[0]._id, _id);
  equalObjectId(q.posts.list[1]._id, _id);
  equalObjectId(q.posts.list[2]._id, _id);

  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeTruthy();
  expect(q.posts.list[2].f).toBeTruthy();

  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T11:30:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T12:30:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-15T13:30:00.000Z');

  //
  q = await qm.scheduleRepeatingPost({
    type: 'last',
    post: {
      _id,
      aid: queue._id,
      publish: {
        interval: 1,
        intervalUnit: 'days',
        period: 4,
        periodUnit: 'days'
      }
    }
  });

  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(4);
  expect(q.posts.list.length).toBe(4);
  equalObjectId(q.posts.list[0]._id, _id);
  equalObjectId(q.posts.list[1]._id, _id);
  equalObjectId(q.posts.list[2]._id, _id);
  equalObjectId(q.posts.list[3]._id, _id);

  expect(q.posts.list[0].f).toBeFalsy();
  expect(q.posts.list[1].f).toBeTruthy();
  expect(q.posts.list[2].f).toBeTruthy();
  expect(q.posts.list[3].f).toBeTruthy();

  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T11:30:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-16T11:30:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-01-17T11:30:00.000Z');
  expect(q.posts.list[3].at.toISOString()).toBe('2018-01-18T11:30:00.000Z');
});

test('should balance queue counts with 0 count', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-14T12:00:00Z');
  const q = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'UTC',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 0 })
  });

  const ids = [ObjectId()];

  try {
    await qm.schedulePost({
      post: {
        _id: ids[0],
        aid: q._id
      },
      type: 'last'
    });
      throw new Error('Should have failed');
  } catch (e) {
    expect(e instanceof QueueSizeLimitReachedError).toBeTruthy();
  }
});

test('should update queue scheduler', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('tumblr', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  const ids = [new ObjectId(), new ObjectId()];

  let q = await qm.schedulePost({ post: { _id: ids[0], aid: queue._id }, type: 'first' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(1);
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0].lck).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T11:30:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);

  q = await qm.schedulePost({ post: { _id: ids[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.count).toBe(2);
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0].lck).toBeFalsy();
  expect(q.posts.list[1].lck).toBeFalsy();
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T07:40:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T15:20:00.000Z');
  equalObjectId(q.posts.list[0]._id, ids[0]);
  equalObjectId(q.posts.list[1]._id, ids[1]);

  q = await qm.updateQueueScheduler({
    queueId: queue._id,
    tz: 'America/New_York'
  });
  expect(q).toBeTruthy();
  expect(q.tz).toBe('America/New_York');
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:40:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T03:20:00.000Z');

  q = await Queue.findById(queue._id).exec();
  expect(q).toBeTruthy();
  expect(q.tz).toBe('America/New_York');

  q = await qm.updateQueueScheduler({
    queueId: queue._id,
    type: 'delay',
    delay: 60
  });
  expect(q).toBeTruthy();
  expect(q.scheduler.type).toBe('delay');
  expect(q.scheduler.delay).toBe(60);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:40:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T03:20:00.000Z');

  q = await Queue.findById(queue._id).exec();
  expect(q).toBeTruthy();
  expect(q.scheduler.type).toBe('delay');
  expect(q.scheduler.delay).toBe(60);

  q = await qm.updateQueueScheduler({
    queueId: queue._id,
    type: 'times',
    schedules: [[60, 6 * 60, 0]]
  });
  expect(q).toBeTruthy();
  expect(q.scheduler.type).toBe('times');
  expect(q.scheduler.schedules).toEqual([[0, 60, 6 * 60]]);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T05:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T06:00:00.000Z');

  q = await Queue.findById(queue._id).lean().exec();
  expect(q).toBeTruthy();
  expect(q.scheduler.type).toBe('times');
  expect(q.scheduler.schedules).toEqual([[0, 60, 6 * 60]]);

  q = await qm.updateQueueScheduler({
    queueId: queue._id,
    type: 'counts',
    counts: [2, 2, 2, 2, 2, 2, 2]
  });
  expect(q).toBeTruthy();
  expect(q.scheduler.type).toBe('counts');
  expect(q.scheduler.postsPerWeekDay).toEqual([2, 2, 2, 2, 2, 2, 2]);
  expect(q.posts.list[0].at.toISOString()).toBe('2018-01-15T01:40:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-01-15T03:20:00.000Z');

  q = await Queue.findById(queue._id).lean().exec();
  expect(q).toBeTruthy();
  expect(q.scheduler.type).toBe('counts');
  expect(q.scheduler.postsPerWeekDay).toEqual([2, 2, 2, 2, 2, 2, 2]);
});

test('queue scheduler should fail on invalid scheduler type', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('instagram', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14 })
  });

  try {
    await qm.updateQueueScheduler({
      queueId: queue._id,
      type: 'times',
      schedules: [[0]]
    });
    throw new Error('Should have failed');
  } catch (e) {
    expect(e instanceof QueueInvalidSchedulerError).toBeTruthy();
    expect(e.message).toBe('Instagram queue supports only "counts" scheduler (INVALID_SCHEDULER)');
  }
});

test('queue scheduler should fail on invalid scheduler type because of too short interval between times', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('google', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14, postsIntervalMin: 60 * 60 })
  });

  expect(
    await qm.updateQueueScheduler({
      queueId: queue._id,
      type: 'times',
      schedules: [[0, 60]]
    })
  ).toBeTruthy();

  try {
    await qm.updateQueueScheduler({
      queueId: queue._id,
      type: 'times',
      schedules: [[0, 1, 120]]
    });
    throw new Error('Should have failed');
  } catch (e) {
    expect(e instanceof QueueInvalidSchedulerError).toBeTruthy();
    expect(e.message).toBe(
      'Shortest time between posts 3600s rule is violated by schedule times Monday 0:00:00 and Monday 0:01:00 (INVALID_SCHEDULER)'
    );
  }

  try {
    await qm.updateQueueScheduler({
      queueId: queue._id,
      type: 'times',
      schedules: [[0], [1, 120]]
    });
    throw new Error('Should have failed');
  } catch (e) {
    expect(e instanceof QueueInvalidSchedulerError).toBeTruthy();
    expect(e.message).toBe(
      'Shortest time between posts 3600s rule is violated by schedule times Monday 0:00:00 and Monday 0:01:00 (INVALID_SCHEDULER)'
    );
  }
});

test('queue scheduler should fail on invalid scheduler type because of same times', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('google', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14, postsIntervalMin: 60 * 60 })
  });

  expect(
    await qm.updateQueueScheduler({
      queueId: queue._id,
      type: 'times',
      schedules: [[0, 60]]
    })
  ).toBeTruthy();

  try {
    await qm.updateQueueScheduler({
      queueId: queue._id,
      type: 'times',
      schedules: [[0], [0, 1, 120]]
    });
    throw new Error('Should have failed');
  } catch (e) {
    expect(e instanceof QueueInvalidSchedulerError).toBeTruthy();
    expect(e.message).toBe(
      'Time Monday 0:00 is defined in multiple schedules and can be present only in one. (INVALID_SCHEDULER)'
    );
  }

  try {
    await qm.updateQueueScheduler({
      queueId: queue._id,
      type: 'times',
      schedules: [[1 * 24 * 60 + 120], [0, 1 * 24 * 60 + 120]]
    });
    throw new Error('Should have failed');
  } catch (e) {
    expect(e instanceof QueueInvalidSchedulerError).toBeTruthy();
    expect(e.message).toBe(
      'Time Tuesday 2:00 is defined in multiple schedules and can be present only in one. (INVALID_SCHEDULER)'
    );
  }
});

test('queue scheduler should fail on invalid scheduler type because of too big postsPerDayLimit', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-01-15T00:00:00Z');
  const queue = await qm.createQueue({
    id: new ObjectId(),
    pid: new ObjectId(),
    tz: 'Europe/Prague',
    type: Types.createCodeByName('google', 'profile'),
    postsLimit: -1,
    scheduler: createScheduler({ postsPerWeek: 14, postsIntervalMin: 6 * 60 * 60 })
  });

  expect(
    await qm.updateQueueScheduler({
      queueId: queue._id,
      postsPerDayLimit: 3
    })
  ).toBeTruthy();

  expect(
    await qm.updateQueueScheduler({
      queueId: queue._id,
      postsPerDayLimit: 4
    })
  ).toBeTruthy();

  try {
    await qm.updateQueueScheduler({
      queueId: queue._id,
      postsPerDayLimit: 5
    });
    throw new Error('Should have failed');
  } catch (e) {
    expect(e instanceof QueueInvalidSchedulerError).toBeTruthy();
    expect(e.message).toBe(
      'Posts per day limit 5 (interval 17280s) colides with limit of shortest time between posts 21600s (INVALID_SCHEDULER)'
    );
  }
});

test('scheduling last post', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-03-01T21:22:11.628Z');
  const queue = await new Queue({
    _id: ObjectId('5a12e2e24fd3c600150ed1db'),
    pid: ObjectId('5910bf4fc8965c000fa518bf'),
    state: 0,
    type: 70000,
    tz: 'Europe/Berlin',
    scheduler: {
      type: 'counts',
      postsPerDayLimit: 500,
      schedules: [[677, 721, 2117, 2161, 3557, 3601, 4997, 5041, 6437, 6481, 7877, 7921, 9317, 9361]],
      delay: 60,
      postsPerWeekDay: [15, 15, 10, 15, 15, 15, 15]
    },
    posts: {
      count: 5,
      limit: -1,
      nextAt: moment.utc('2018-03-01T20:54:11.628Z').toDate(),
      fetchedAt: moment.utc('2018-03-01T19:58:48.130Z').toDate(),
      checkedAt: moment.utc('2018-03-01T19:58:48.126Z').toDate(),
      list: [
        {
          at: moment.utc('2018-03-01T20:54:11.628Z').toDate(),
          _id: ObjectId('5a97a9d7d8773a00152a4b80')
        },
        {
          _id: ObjectId('5a97a9e0d8773a00152a4b81'),
          at: moment.utc('2018-03-01T21:50:25.565Z').toDate()
        },
        {
          at: moment.utc('2018-03-02T04:41:48.000Z').toDate(),
          _id: ObjectId('5a97a9f0d8773a00152a4b82')
        },
        {
          _id: ObjectId('5a97a9fcc53dab001557455c'),
          at: moment.utc('2018-03-02T10:48:18.000Z').toDate()
        },
        {
          at: moment.utc('2018-03-02T15:48:41.000Z').toDate(),
          _id: ObjectId('5a97aa07d8773a00152a4b84')
        }
      ],
      published: {
        20180227: 1,
        20180228: 11,
        20180301: 13
      }
    },
    inactiveUntil: null,
    inactiveReason: null
  }).save();

  const postId = new ObjectId();

  const q = await qm.schedulePost({ post: { _id: postId, aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts).toBeTruthy();
  expect(q.posts.list).toBeTruthy();
  expect(q.posts.list.length).toBe(6);
  expect(q.posts.list[0]._id.toString()).toBe('5a97a9d7d8773a00152a4b80');
  expect(q.posts.list[1]._id.toString()).toBe('5a97a9e0d8773a00152a4b81');
  expect(q.posts.list[2]._id.toString()).toBe('5a97a9f0d8773a00152a4b82');
  expect(q.posts.list[3]._id.toString()).toBe('5a97a9fcc53dab001557455c');
  expect(q.posts.list[4]._id.toString()).toBe('5a97aa07d8773a00152a4b84');
  expect(q.posts.list[5]._id.toString()).toBe(postId.toString());
  expect(q.posts.list[5].at.toISOString()).toBe('2018-03-02T18:12:00.000Z');
});

test('scheduling last post #2', async () => {
  const qm = createQueueManager({ redisConfig: {} }, '2018-03-02T02:00:00.000Z');
  const queue = await new Queue({
    _id: ObjectId('5a12e2e24fd3c600150ed1db'),
    pid: ObjectId('5910bf4fc8965c000fa518bf'),
    state: 0,
    type: 70000,
    tz: 'Europe/Berlin',
    scheduler: {
      type: 'counts',
      postsIntervalMin: 10 * 60,
      postsPerDayLimit: 500,
      schedules: [[677, 721, 2117, 2161, 3557, 3601, 4997, 5041, 6437, 6481, 7877, 7921, 9317, 9361]],
      delay: 60,
      postsPerWeekDay: [2, 2, 2, 2, 2, 2, 2]
    },
    posts: {
      count: 5,
      limit: -1,
      nextAt: null,
      fetchedAt: moment.utc('2018-03-01T19:58:48.130Z').toDate(),
      checkedAt: moment.utc('2018-03-01T19:58:48.126Z').toDate(),
      list: [],
      published: {
        20180227: 1,
        20180228: 11,
        20180301: 13
      }
    },
    inactiveUntil: null,
    inactiveReason: null
  }).save();

  const ids = [
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId(),
    new ObjectId()
  ];

  let q = await qm.schedulePost({ post: { _id: ids[0], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.list.length).toBe(1);
  expect(q.posts.list[0]._id.toString()).toBe(ids[0].toString());
  expect(q.posts.list[0].at.toISOString()).toBe('2018-03-02T12:30:00.000Z');

  q = await qm.schedulePost({ post: { _id: ids[1], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.list.length).toBe(2);
  expect(q.posts.list[0]._id.toString()).toBe(ids[0].toString());
  expect(q.posts.list[1]._id.toString()).toBe(ids[1].toString());
  expect(q.posts.list[0].at.toISOString()).toBe('2018-03-02T09:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-03-02T16:00:00.000Z');

  q = await qm.schedulePost({ post: { _id: ids[2], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.list.length).toBe(3);
  expect(q.posts.list[0]._id.toString()).toBe(ids[0].toString());
  expect(q.posts.list[1]._id.toString()).toBe(ids[1].toString());
  expect(q.posts.list[2]._id.toString()).toBe(ids[2].toString());
  expect(q.posts.list[0].at.toISOString()).toBe('2018-03-02T09:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-03-02T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-03-03T11:00:00.000Z');

  q = await qm.schedulePost({ post: { _id: ids[3], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.list.length).toBe(4);
  expect(q.posts.list[0]._id.toString()).toBe(ids[0].toString());
  expect(q.posts.list[1]._id.toString()).toBe(ids[1].toString());
  expect(q.posts.list[2]._id.toString()).toBe(ids[2].toString());
  expect(q.posts.list[3]._id.toString()).toBe(ids[3].toString());
  expect(q.posts.list[0].at.toISOString()).toBe('2018-03-02T09:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-03-02T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-03-03T07:00:00.000Z');
  expect(q.posts.list[3].at.toISOString()).toBe('2018-03-03T15:00:00.000Z');

  q = await qm.schedulePost({ post: { _id: ids[4], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.list.length).toBe(5);
  expect(q.posts.list[0]._id.toString()).toBe(ids[0].toString());
  expect(q.posts.list[1]._id.toString()).toBe(ids[1].toString());
  expect(q.posts.list[2]._id.toString()).toBe(ids[2].toString());
  expect(q.posts.list[3]._id.toString()).toBe(ids[3].toString());
  expect(q.posts.list[4]._id.toString()).toBe(ids[4].toString());
  expect(q.posts.list[0].at.toISOString()).toBe('2018-03-02T09:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-03-02T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-03-03T07:00:00.000Z');
  expect(q.posts.list[3].at.toISOString()).toBe('2018-03-03T15:00:00.000Z');
  expect(q.posts.list[4].at.toISOString()).toBe('2018-03-04T11:00:00.000Z');

  q = await qm.schedulePost({ post: { _id: ids[5], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.list.length).toBe(6);
  expect(q.posts.list[0]._id.toString()).toBe(ids[0].toString());
  expect(q.posts.list[1]._id.toString()).toBe(ids[1].toString());
  expect(q.posts.list[2]._id.toString()).toBe(ids[2].toString());
  expect(q.posts.list[3]._id.toString()).toBe(ids[3].toString());
  expect(q.posts.list[4]._id.toString()).toBe(ids[4].toString());
  expect(q.posts.list[5]._id.toString()).toBe(ids[5].toString());
  expect(q.posts.list[0].at.toISOString()).toBe('2018-03-02T09:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-03-02T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-03-03T07:00:00.000Z');
  expect(q.posts.list[3].at.toISOString()).toBe('2018-03-03T15:00:00.000Z');
  expect(q.posts.list[4].at.toISOString()).toBe('2018-03-04T07:00:00.000Z');
  expect(q.posts.list[5].at.toISOString()).toBe('2018-03-04T15:00:00.000Z');

  q = await qm.schedulePost({ post: { _id: ids[6], aid: queue._id }, type: 'last' });
  expect(q).toBeTruthy();
  expect(q.posts.list.length).toBe(7);
  expect(q.posts.list[0]._id.toString()).toBe(ids[0].toString());
  expect(q.posts.list[1]._id.toString()).toBe(ids[1].toString());
  expect(q.posts.list[2]._id.toString()).toBe(ids[2].toString());
  expect(q.posts.list[3]._id.toString()).toBe(ids[3].toString());
  expect(q.posts.list[4]._id.toString()).toBe(ids[4].toString());
  expect(q.posts.list[5]._id.toString()).toBe(ids[5].toString());
  expect(q.posts.list[6]._id.toString()).toBe(ids[6].toString());
  expect(q.posts.list[0].at.toISOString()).toBe('2018-03-02T09:00:00.000Z');
  expect(q.posts.list[1].at.toISOString()).toBe('2018-03-02T16:00:00.000Z');
  expect(q.posts.list[2].at.toISOString()).toBe('2018-03-03T07:00:00.000Z');
  expect(q.posts.list[3].at.toISOString()).toBe('2018-03-03T15:00:00.000Z');
  expect(q.posts.list[4].at.toISOString()).toBe('2018-03-04T07:00:00.000Z');
  expect(q.posts.list[5].at.toISOString()).toBe('2018-03-04T15:00:00.000Z');
  expect(q.posts.list[6].at.toISOString()).toBe('2018-03-05T11:00:00.000Z');
});
