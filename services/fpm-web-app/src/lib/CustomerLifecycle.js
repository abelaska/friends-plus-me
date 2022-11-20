/* jshint node: true */
/* jshint -W106 */
'use strict';

const config = require('@fpm/config');
const _ = require('underscore');
const async = require('async');
const moment = require('moment');
const sendy = require('./sendy');

var CustomerLifecycle = module.exports = function CustomerLifecycle() {
  return this;
};

function subscribeList(listName, user, data) {
  return function(cb) {
    data = data || {};
    data.listName = listName;
    sendy.subscribe(user, config.get('sendy:lists:'+listName), data, cb);
  };
}

function removeFromList(user) {
  return function(configListName, cb) {
    var listId = config.get('sendy:lists:'+configListName);
    if (listId) {
      sendy.remove(user, listId, {listName: configListName}, cb);
    } else {
      cb(new Error('Sendy newsletter '+configListName+' id not found in configuration'));
    }
  };
}

CustomerLifecycle.prototype.chargeFailed = function(user, profile, callback) {
  var gw = profile.subscription.gw.toLowerCase(),
      data = gw === 'paypal' ? {
        PayPalEmail: profile.subscription.customer.id,
        Plan: profile.subscription.plan
      } : {
        Last4: profile.subscription.card.last4,
        Plan: profile.subscription.plan
      };
  async.parallel([
    subscribeList('failedCharge:'+gw, user, data),
    function(cb) {
      async.each([
        'failedCharge:'+(gw === 'paypal' ? 'braintree' : 'paypal'),
        'expiredCharge',
        'expiredSubscription',
        'premiumUnsubscribe'], removeFromList(user), cb);
    }
  ], callback);
};

CustomerLifecycle.prototype.signup = function(user, callback) {

  var userData = {
        actorId: user.actorId,
        fname:   user.fname,
        lname:   user.lname,
        locale:  user.locale,
        plan:    config.get('users:defaultPlan')
      };

  if (user.affiliate && user.affiliate.referrer &&
      user.affiliate.referrer.campaignId &&
      user.affiliate.referrer.mbsy) {
    userData.affil_refer_campaign = user.affiliate.referrer.campaignId;
    userData.affil_refer_mbsy = user.affiliate.referrer.mbsy;
    userData.affil_referred = true;
  }

  async.parallel([
    // async.apply(this.customerIO('create'), user._id.toString(), user.email, userData, null),
    // async.apply(this.notificationManager.welcome.bind(this.notificationManager), user, null),
    subscribeList('signup', user),
    subscribeList('trial', user)
  ], callback);
};

CustomerLifecycle.prototype.subscribed = function(user, profile, callback) {
  async.each(['trial'], removeFromList(user), callback);
};

CustomerLifecycle.prototype.chargeExpired = function(user, callback) {
  async.parallel([
    subscribeList('expiredCharge', user),
    function(cb) {
      async.each([
        'expiredSubscription',
        'failedCharge:paypal',
        'failedCharge:braintree',
        'premiumUnsubscribe'], removeFromList(user), cb);
    }
  ], callback);
};

CustomerLifecycle.prototype.subscriptionExpired = function(user, callback) {
  async.parallel([
    subscribeList('expiredSubscription', user),
    function(cb) {
      async.each([
        'expiredCharge',
        'failedCharge:paypal',
        'failedCharge:braintree',
        'premiumUnsubscribe'], removeFromList(user), cb);
    }
  ], callback);
};

CustomerLifecycle.prototype.premiumUnsubscribe = function(user, profile, callback, meta) {
  var isTrial = meta && meta.isTrial;
  var tasks = [async.apply(this.updateSubscription.bind(this), user, profile, null)];
  if (!isTrial) {
    tasks.push(subscribeList('premiumUnsubscribe', user));
  }
  tasks.push(function(cb) {
    async.each([
      'failedCharge:paypal',
      'failedCharge:braintree',
      'expiredSubscription',
      'expiredCharge'], removeFromList(user), cb);
  });
  async.parallel(tasks, callback);
};

CustomerLifecycle.prototype.updateSubscription = function(user, profile, data, callback) {

  var sub = profile.subscription && profile.subscription.amount ? profile.subscription : null,
      userData = _.defaults(data||{}, {
        plan:          profile.plan.name,
        sub_created:   sub?moment.utc(sub.createdAt).unix():'',
        sub_interval:  sub?sub.interval:'',
        sub_amount:    sub?sub.amount:'',
        sub_mmr:       sub?(sub.interval==='YEAR'?Math.ceil(sub.amount/12):sub.amount):'',
        sub_gw:        sub?sub.gw:'',
        sub_cc_last4:  '',
        sub_cc_expire: ''
      });

  if (sub) {
    switch(sub.gw) {
    case 'PAYMILL':
    case 'BRAINTREE':
      userData = _.defaults({
        sub_cc_last4: sub.card.last4,
        sub_cc_expire: moment.utc([sub.card.expYear,sub.card.expMonth]).unix()
      }, userData);
      break;
    }
  }

  if (callback) {
    callback();
  }
  // this.customerIO('update')(user._id.toString(), user.email, userData, null, callback);
};

CustomerLifecycle.prototype.chargeSuccessfull = function(user, profile, callback) {
  async.parallel([
    async.apply(this.updateSubscription.bind(this), user, profile, null),
    function(cb) {
      async.each([
        'failedCharge:paypal',
        'failedCharge:braintree',
        'expiredCharge',
        'expiredSubscription',
        'premiumUnsubscribe'], removeFromList(user), cb);
    }.bind(this)
  ], callback);
};

CustomerLifecycle.prototype.newSubscriptionWithPostponedPayment = function(user, profile, posponedDiscount, callback) {
  if (callback) {
    callback();
  }
  // this.customerIO('track')(user._id.toString(), 'new-subscription-with-postponed-payment', {
  //   profileId: profile._id.toString(),
  //   posponedDiscount: posponedDiscount,
  //   subInterval: profile.subscription.interval,
  //   braintreeSubId: profile.subscription.id,
  //   braintreeCustomerId: profile.subscription.customer.id
  // }, null, callback);
};

CustomerLifecycle.prototype.notifySupport = function(user, data, callback) {
  if (callback) {
    callback();
  }
  // this.customerIO('track')(user._id.toString(), 'notify-support', data, null, callback);
};

/*(new CustomerLifecycle()).chargeSuccessfull({
  email: 'ab@gmail.com',
  name: 'Alois Bělaška',
  fname: 'Alois',
  lname: 'Bělaška'
});*/
/*(new CustomerLifecycle()).premiumUnsubscribe({
  email: 'ab@gmail.com',
  name: 'Alois Bělaška',
  fname: 'Alois',
  lname: 'Bělaška'
});*/
/*(new CustomerLifecycle()).chargeExpired({
  email: 'ab@gmail.com',
  name: 'Alois Bělaška',
  fname: 'Alois',
  lname: 'Bělaška'
});*/
/*(new CustomerLifecycle()).chargeFailed({
  email: 'ab@gmail.com',
  name: 'Alois Bělaška',
  fname: 'Alois',
  lname: 'Bělaška'
}, {subscription:{
  plan: 'UNLIMITED',
  gw: 'braintree',
  customer: {
    id: 'customerid'
  },
  card: {
    last4: '1234'
  }
}});*/
