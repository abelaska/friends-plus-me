const { Profile, PricingPlan, Transaction } = require('@fpm/db');
const log = require('@fpm/logging').default;
const _ = require('underscore');
const async = require('async');

class Saas {

  calculate(callback) {
    PricingPlan.find({}, (err, plans) => {
      if (err || !plans || !plans.length) {
        return callback(err || {error:{message: 'No plan found'}});
      }
  
      const plansObj = {};

      for (let i = 0; i < plans.length; i++) {
        plans[i].members = undefined;
        plansObj[plans[i].id] = plans[i];
      }

      this._calculate(plansObj, callback);
    });
  };

  _calculate(plans, callback) {

    var today = new Date();
    var metricsPerPlan = {};
  
    function monDtAddMonths(dt, addMonths) {
      var months = dt.getUTCFullYear()*12+(addMonths || 0)+dt.getUTCMonth();
      return Math.floor(months / 12)*100+(months % 12)+1;
    }
  
    function monDt(dt) {
      return dt.getUTCFullYear()*100+dt.getUTCMonth()+1;
    }
  
    function add(obj, key, val) {
      if (obj[key] !== undefined && obj[key] !== null) {
        obj[key] += val;
      } else {
        obj[key] = val;
      }
      return obj[key];
    }
  
    function initMetrics(obj) {
      return _.extend(obj || {}, {
        mmr: {}, // monthly recurring revenue
        vat: {}, // DPH
        fees: {}, // fee
        ac: {},  // active customers
        refunds: {},  // refunds
        arpu: {},  // Average revenue per user
        arr: {}, // Annual run rate
        rc: {}, // Revenue churn
        uc: {}, // User churn
        ltv: {}, // Lifetime value
        mrl: {}, // monthly revenue Loss
        mrg: {}, // monthly revenue Gain
        prepay: {}, // prepay
        revenue: {}, // net revenue
        profit: {}, // net revenue - fees - vat - refunds
        cancelations: {}, // cancelations
        upgrades: {}, // Upgrades
        downgrades: {} // Downgrades
      });
    }
  
    function addMetricPlan(name, plan, interval, key, val) {
      if (!plan) {
        return;
      }
      var planKey = plan+(interval ? '-'+interval : '');
      if (!metricsPerPlan[planKey]) {
        metricsPerPlan[planKey] = {
          plan: plan,
          interval: interval,
          metrics: initMetrics()
        };
      }
      add(metricsPerPlan[planKey].metrics[name], key, val);
    }
  
    var txMonth,
        gtm = new Date(),
        months = [],
        acSums = {},
        metrics = initMetrics();
  
    function addMetric(name, plan, interval, key, val) {
      add(metrics[name], key, val);
      addMetricPlan(name, plan, null, key, val);
      addMetricPlan(name, plan, interval, key, val);
    }
  
    function prepareMetrics(obj) {
      var oneResult, result = [];
      months.forEach(function(m) {
        oneResult = {month: m};
        _.keys(obj).forEach(function(k) {
          oneResult[k] = obj[k][m];
        });
        result.push(oneResult);
      });
      return result;
    }
  
    function finishMetrics(obj, thisMonth, prevMonth) {
      _.keys(obj).forEach(function(key) {
        add(obj[key], thisMonth, 0);
      });
  
      obj.arpu[thisMonth] = Math.floor(obj.mmr[thisMonth] / (obj.ac[thisMonth] || 1));
      obj.arr[thisMonth] = Math.floor(obj.mmr[thisMonth] * 12);
      obj.profit[thisMonth] = (obj.revenue[thisMonth]||0) - (obj.vat[thisMonth]||0) - (obj.fees[thisMonth]||0) - (obj.refunds[thisMonth]||0);
  
      if (prevMonth) {
  
        if (obj.cancelations[thisMonth] && obj.ac[prevMonth]) {
          obj.uc[thisMonth] = Math.round((obj.cancelations[thisMonth]*100*100) / obj.ac[prevMonth])/100;
          obj.ltv[thisMonth] = Math.floor(obj.arpu[thisMonth] / (obj.uc[thisMonth]/100));
        }
  
        if (obj.mrl[thisMonth] && obj.mmr[prevMonth]) {
          obj.rc[thisMonth] = Math.round((obj.mrl[thisMonth]*100*100) / obj.mmr[prevMonth])/100;
        }
      }
    }
  
    for (var i = 0; i < 12+6; i++) {
      months.unshift(monDtAddMonths(today, -i));
    }
  
    var profiles = {};
  
    async.series([
      function(cb) {
  
        Transaction.find({}).cursor()
        .on('data', function (tx) {

          if (!tx.pid) {
            log.error(`Skipping transaction ${tx._id.toString()} with empty pid property`);
            return;
          }
  
          txMonth = monDt(tx.tm);
  
          tx.type = tx.type || 'CHARGE';
          tx.fee = tx.fee || 0;
          tx.vat = 0;
  
          switch (tx.type) {
          case 'FEE':
            add(metrics.fees, txMonth, tx.fee);
            break;
          case 'DONATION':
            add(metrics.revenue, txMonth, tx.amount);
            break;
          case 'PREPAY':
            add(metrics.revenue, txMonth, tx.amount);
            add(metrics.prepay, txMonth, tx.amount);
            if (tx.refunds && tx.refunds.length) {
              tx.refunds.forEach(function(r) {
                add(metrics.refunds, monDt(r.tm), r.amount);
              }.bind(this));
            }
            break;
          case 'CHARGE':
  
            addMetric('revenue', tx.subscr.plan, tx.subscr.interval, txMonth, tx.amount);
  
            if (profiles[tx.pid.toString()]) {
              profiles[tx.pid.toString()].txs.push(tx);
            } else {
              profiles[tx.pid.toString()] = {
                txs: [tx],
                subscription: null
              };
            }
  
            if (tx.vatInc) {
              var zd = Math.ceil(tx.amount * 1000 / (100+tx.vatInc));
              tx.vat = Math.ceil(zd*tx.vatInc/1000);
              addMetric('vat', tx.subscr.plan, tx.subscr.interval, txMonth, tx.vat);
            }
  
            if (tx.subscr.interval === 'MONTH') {
              addMetric('mmr', tx.subscr.plan, tx.subscr.interval, txMonth, tx.amount - tx.fee - tx.vat);
              addMetric('fees', tx.subscr.plan, tx.subscr.interval, txMonth, tx.fee);
  
              acSums[txMonth] = acSums[txMonth] || {};
  
              if (add(acSums[txMonth], tx.pid.toString(), 1) === 1) {
                addMetric('ac', tx.subscr.plan, tx.subscr.interval, txMonth, 1);
              }
            } else
            if (tx.subscr.interval === 'YEAR') {
              addMetric('mmr', tx.subscr.plan, tx.subscr.interval, txMonth, -tx.fee);
              addMetric('fees', tx.subscr.plan, tx.subscr.interval, txMonth, tx.fee);
  
              for (var i = 0; i < 12; i++) {
                txMonth = monDtAddMonths(tx.tm, i);
  
                addMetric('mmr', tx.subscr.plan, tx.subscr.interval, txMonth, Math.floor(tx.amount/12));
  
                acSums[txMonth] = acSums[txMonth] || {};
  
                if (add(acSums[txMonth], tx.pid.toString(), 1) === 1) {
                  addMetric('ac', tx.subscr.plan, tx.subscr.interval, txMonth, 1);
                }
              }
            }
  
            // TODO existuje poplatek za refund?
  
            // refunds
            if (tx.refunds && tx.refunds.length) {
              tx.refunds.forEach(function(r) {
  
                txMonth = monDt(r.tm);
  
                addMetric('refunds', tx.subscr.plan, tx.subscr.interval, txMonth, r.amount);
  
                if (tx.subscr.interval === 'MONTH') {
                  addMetric('mmr', tx.subscr.plan, tx.subscr.interval, txMonth, -r.amount);
                } else
                if (tx.subscr.interval === 'YEAR') {
                  for (var i = 0; i < 12; i++) {
                    txMonth = monDtAddMonths(r.tm, i);
  
                    addMetric('mmr', tx.subscr.plan, tx.subscr.interval, txMonth, -Math.floor(r.amount/12));
                  }
                }
              }.bind(this));
            }
  
            break;
          }
        }).on('error', cb).on('end', cb);
      }.bind(this),
  
      function(cb) {
        async.eachLimit(_.keys(profiles), 8, function(profileId, cb2) {
          Profile.findOne({_id: profileId}, 'subscription', function(err, profile) {
            if (err) {
              return cb2(err);
            }
            profiles[profileId].subscription = profile && profile.subscription && profile.subscription.id && profile.subscription;
            cb2();
          });
        }, cb);
      }.bind(this)
    ], function(err) {
      if (err) {
        return callback(err);
      }
  
      var result, times, p, i, t, m, firstTx, lastTx, prevTx, isUpgrade, isDowngrade, priceDiff;
  
      for (var pid in profiles) {
        p = profiles[pid];
        firstTx = p.txs[0];
        lastTx = p.txs[p.txs.length - 1];
  
        if (!p.subscription) {
          m = monDtAddMonths(lastTx.tm, lastTx.subscr.interval === 'MONTH' ? 1 : 12+1);
          addMetric('cancelations', lastTx.subscr.plan, lastTx.subscr.interval, m, 1);
          addMetric('mrl', lastTx.subscr.plan, lastTx.subscr.interval, m, plans[lastTx.subscr.plan].intervals[lastTx.subscr.interval].pricePerMonth);
        }
  
        prevTx = null;
        for (i = 0; i < p.txs.length; i++) {
          t = p.txs[i];
          isUpgrade = false;
          isDowngrade = false;
          priceDiff = plans[t.subscr.plan].intervals[t.subscr.interval].pricePerMonth;
  
          if (prevTx) {
            if (prevTx.subscr.interval !== 'YEAR' && t.subscr.interval === 'YEAR') {
              isUpgrade = true;
            } else {
              priceDiff = plans[t.subscr.plan].intervals[t.subscr.interval].pricePerMonth - plans[prevTx.subscr.plan].intervals[prevTx.subscr.interval].pricePerMonth;
              isUpgrade = priceDiff > 0 ? true : false;
              isDowngrade = priceDiff < 0 ? true : false;
              priceDiff = Math.abs(priceDiff);
            }
          } else {
            isUpgrade = true;
          }
  
          if (isDowngrade) {
            addMetric('downgrades', t.subscr.plan, t.subscr.interval, monDt(t.tm), 1);
            addMetric('mrl', t.subscr.plan, t.subscr.interval, monDt(t.tm), priceDiff);
          }
  
          if (isUpgrade) {
            addMetric('upgrades', t.subscr.plan, t.subscr.interval, monDt(t.tm), 1);
            addMetric('mrg', t.subscr.plan, t.subscr.interval, monDt(t.tm), priceDiff);
          }
  
          prevTx = p.txs[i];
        }
      }
  
      // hodnoty chybejicich mesicu nastavit na 0
      for (i = 0; i < months.length; i++) {
        finishMetrics(metrics, months[i], i > 0 ? months[i-1] : 0);
  
        /* jshint -W083 */
        _.keys(metricsPerPlan).forEach(function(key) {
          finishMetrics(metricsPerPlan[key].metrics, months[i], i > 0 ? months[i-1] : 0);
        });
      }
  
      result = {
        system: prepareMetrics(metrics),
        plans: {},
        pricingPlans: plans
      };
  
      _.keys(metricsPerPlan).forEach(function(key) {
        metricsPerPlan[key].metrics = prepareMetrics(metricsPerPlan[key].metrics);
        result.plans[key] = metricsPerPlan[key];
      });
  
      callback(err, result, new Date() - gtm, times);
    });
  };
}

module.exports = Saas;