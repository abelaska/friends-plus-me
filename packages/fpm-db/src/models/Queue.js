import { States } from '@fpm/constants';
import { registerModel, Schema, SchemaObjectId, Mixed } from '../db';

const Queue = new Schema({
  // _id = profile.accounts._id
  pid: SchemaObjectId, // profile._id

  state: {
    // stav uctu (0-enabled,1-paused,2-blocked)
    type: Number,
    default: States.queue.enabled.code
  },
  type: {
    // typ socialni site a uctu (0=google+,1=twitter,2=facebook,3=linkedin)*10000+(0=Profile,1=Page,2=Group,5=Community)
    type: Number
  },

  tz: String, // timezone, ex. Europe/Prague

  inactiveUntil: Date, // inactive until this time or null if active
  inactiveReason: String, // reason this queue is incative (paused or blocked)

  scheduler: {
    type: {
      type: String,
      enum: ['counts', 'times', 'delay']
    },
    postsIntervalMin: {
      // minimal interval between scheduled posts in seconds, -1 = unlimited
      type: Number,
      default: 60
    },
    postsPerDayLimit: {
      // maximal allowed number of scheduled posts per day, -1 = unlimited
      type: Number,
      default: 500
    },
    // "counts"  https://momentjs.com/docs/#/get-set/iso-weekday/
    postsPerWeekDay: [Number], // max. number of posts to schedule for a week day, index 0=monday, ..., 6=sunday
    // "times"
    schedules: {
      // schedules list with times from the start of a week in minutes
      type: [[Number]],
      default: []
    },
    // "delay"
    delay: {
      // publish with delay in seconds
      type: Number,
      default: 0
    }
  },

  posts: {
    count: {
      // count of scheduled posts
      type: Number,
      default: 0
    },
    limit: {
      // maximal allowed number of scheduled posts for the queue, -1 = unlimited
      type: Number,
      default: -1
    },
    nextAt: Date, // date and time next post in line is scheduled for
    fetchedAt: Date, // last time post was fetched from this queue for publishing
    checkedAt: {
      // last time this queue was checked for posts to publish
      type: Date,
      default: Date.now
    },
    list: [
      {
        // _id: String, // post._id
        f: Boolean, // whether this post can be rescheduled or not, true for posts schedule manually by user, not present if not true
        at: Date, // post schedule time
        lck: Date // post operations are locked until, not present if not locked
      }
    ],
    published: Mixed /* number of posts published specific day, YYYYMMDD for UTC timezone
      'YYYYMMDD': Number
    */
  }
});

Queue.index({ type: 1, state: 1, 'posts.checkedAt': 1, 'posts.nextAt': 1 }, { unique: false });
Queue.index({ inactiveUntil: 1 }, { unique: false, sparse: true });

export default registerModel('Queue', Queue);
