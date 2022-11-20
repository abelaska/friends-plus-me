/* jshint node: true */


const util = require('util');
const moment = require('moment');
const PaymentGateway = require('../PaymentGateway');

const Free = (module.exports = function Free({ customerLifecycle, profile, user, owner, profileManager }) {
  PaymentGateway.call(this, { customerLifecycle, profile, user, owner, profileManager });
  return this;
});
util.inherits(Free, PaymentGateway);

// data: {
//  planName: string     // plan name
//  planInterval: string // MONTH || YEAR
// }
Free.prototype.subscribe = function (data, callback) {
  let planName = data.planName,
    planInterval = data.planInterval;

  data.planName = undefined;
  data.planInterval = undefined;

  this._planChange(
    planName,
    planInterval,
    (err, change) => {
      if (err || !change) {
        return callback(err);
      }
      this.profile.plan.validUntil = moment
        .utc()
        .add(1, planInterval === 'YEAR' ? 'years' : 'months')
        .toDate();
      this._finish(change, callback);
    },
    this.isAnnualPrepay
  );
};
