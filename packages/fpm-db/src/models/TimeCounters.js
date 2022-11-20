// @flow
import { registerModel, Schema, SchemaObjectId, ObjectId, Mixed } from '../db';
import log from '@fpm/logging';
import config from '@fpm/config';
import moment from 'moment';
import Promise from 'bluebird';

var TimeCounters = new Schema(
  {
    _id: SchemaObjectId, // profile.accounts._id || profile._id

    updatedAt: Date, // date of last update

    counters: Mixed /*         // analytika profilu
    'y2013': { rocni statistika: 'y' + cislo roku (2013,...)
      activities: Number      // pocet zpracovanych G+ aktivit dany rok
    },
    'm201302': { mesicni statistika: 'm' + cislo mesice vcetne roku
      activities: Number      // pocet zpracovanych G+ aktivit dany mesic
    }
  */
  },
  {
    versionKey: false
  }
);

const inc = async (model, opName, id, now) => {
  now = now || moment.utc();
  const _id = new ObjectId((id._id || id).toString());
  const keyYear = 'y' + now.format('YYYY');
  const keyMonth = 'm' + now.format('YYYYMM');
  const keyWeek = 'w' + now.format('YYYYww');
  const keyDay = 'd' + now.format('YYYYMMDD');
  const $inc = {
    [`counters.${keyYear}.${opName}`]: 1,
    [`counters.${keyMonth}.${opName}`]: 1,
    [`counters.${keyWeek}.${opName}`]: 1,
    [`counters.${keyDay}.${opName}`]: 1
  };
  let tries = 10;
  while (tries-- > 0) {
    try {
      return await model.update({ _id }, { $inc, $set: { updatedAt: new Date() } }, { upsert: true });
    } catch (error) {
      if (error.code === 11000) {
        await new Promise(resolve => setTimeout(resolve, 150));
      } else {
        throw error;
      }
    }
  }
};

TimeCounters.static(
  'inc',
  async function(/*opName, id1, id2, ...*/) {
    const self = this;
    const args = Array.prototype.slice.call(arguments);
    const opName = args.shift();
    return await Promise.map(args, id => inc(self, opName, id));
  }
);

export default registerModel('TimeCounters', TimeCounters);
