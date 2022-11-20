/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const moment = require('moment-timezone');
const { States } = require('@fpm/constants');

const scheduleDays = (module.exports.scheduleDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

const scheduleTypes = (module.exports.scheduleTypes = ['now', 'at', 'last', 'first']);

const schedulingTypes = (module.exports.schedulingTypes = ['times', 'counts', 'delay']);

const validateTimezone = (module.exports.validateTimezone = timezone => {
  const tz = timezone && moment.tz.zone(timezone);
  return tz && tz.name;
});

const validateSchedulingType = (module.exports.validateSchedulingType = type =>
  type && schedulingTypes.indexOf(type) > -1 && type);

const convertCounts = (module.exports.convertCounts = ({ mon, tue, wed, thu, fri, sat, sun }) => [
  mon,
  tue,
  wed,
  thu,
  fri,
  sat,
  sun
]);

const convertSchedules = (module.exports.convertSchedules = schedules => {
  if (!schedules) {
    return schedules;
  }
  let d;
  let split;
  return schedules.map(s =>
    s.days
      .map(day => {
        d = scheduleDays.indexOf(day.toLowerCase());
        return s.times
          .map(time => {
            split = time.split(':');
            // eslint-disable-next-line no-mixed-operators
            return d * 24 * 60 + parseInt(split[0], 10) * 60 + parseInt(split[1], 10);
          })
          .sort((a, b) => a - b);
      })
      .reduce((r, v) => r.concat(v), [])
  );
});

const allocateScheduleTime = (module.exports.allocateScheduleTime = async ({ schedule, postScheduler, dbQueue }) =>
  new Promise((resolve, reject) => {
    const scheduler =
      schedule === 'first'
        ? postScheduler.firstTime.bind(postScheduler)
        : schedule === 'last' ? postScheduler.nextTime.bind(postScheduler) : null;
    if (!scheduler) {
      return resolve(null);
    }
    return scheduler(dbQueue._id, (err, scheduledTime) => {
      if (err) {
        return reject(err);
      }
      return resolve((scheduledTime && scheduledTime.toDate()) || null);
    });
  }));

const scheduleAndSavePost = (module.exports.scheduleAndSavePost = async ({
  dbPost,
  dbQueue,
  schedule,
  publishAt,
  repeatCount,
  repeatInterval,
  repeatIntervalUnit,
  repeatPeriod,
  repeatPeriodUnit,
  postScheduler,
  queueManager,
  isReschedule = false
}) => {
  let type = 'custom';
  switch (schedule) {
    case 'now':
      dbPost.publishAt = queueManager.now().toDate();
      dbPost.state = States.post.scheduledByUser.code;
      break;
    case 'at':
      dbPost.publishAt = new Date(publishAt * 1000);
      dbPost.state = States.post.scheduledByUser.code;
      break;
    default:
      type = schedule; // first || last
      break;
  }

  if (dbQueue.ng) {
    const isRepeatPost = repeatCount > 1 || repeatPeriod > 0;
    if (isRepeatPost) {
      dbPost.publish = {
        count: repeatCount,
        interval: repeatInterval,
        intervalUnit: repeatIntervalUnit,
        period: repeatPeriod,
        periodUnit: repeatPeriodUnit
      };
    }
    dbPost.state = States.post.scheduled.code;
    await dbPost.save();

    try {
      if (isRepeatPost) {
        await queueManager.scheduleRepeatingPost({ type, post: dbPost });
      } else {
        await queueManager.schedulePost({ type, post: dbPost, replacePost: isReschedule });
      }
    } catch (e) {
      if (!isReschedule) {
        await dbPost.remove();
      }
      throw e;
    }
  } else {
    switch (schedule) {
      case 'first':
      // eslint-disable-next-line no-case-declarations, no-fallthrough
      case 'last':
        const allocatedTime = await allocateScheduleTime({ schedule, postScheduler, dbQueue });
        if (allocatedTime) {
          dbPost.publishAt = allocatedTime;
          dbPost.state = States.post.scheduledByScheduler.code;
        } else {
          dbPost.publishAt = new Date();
          dbPost.state = States.post.scheduledByUser.code;
        }
        break;
      default:
        break;
    }
    await dbPost.save();
  }
});
