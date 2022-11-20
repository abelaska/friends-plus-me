'use strict';

process.env.NODE_ENV = 'test';

var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    _ = require('underscore'),
    expect = require('chai').expect,
    braintree = require('braintree'),
    Braintree = require('../src/lib/paygateways/Braintree3'),
    config = require('../src/lib/config').config;

describe('Braintree', function() {

  require('chai').config.includeStack = true;

  it('should work', function(done) {
    /*var bt = braintree.connect({
      environment: braintree.Environment[config.get('braintree:environment')],
      merchantId: config.get('braintree:merchantId'),
      publicKey: config.get('braintree:publicKey'),
      privateKey: config.get('braintree:privateKey')
    });

    bt.customer.create({
      firstName: 'Eduard',
      lastName: 'Burt, D.C.',
      company: '',
      customFields: {
        vatId: '665',
        billingCountry: 'US',
        billTo: '15200 Hesperian Blvd.\nSan Leandro, CA. 94578'
      }
    }, function(err, data) {

      console.log('result', JSON.stringify(data,null,2));
      console.log('err',err);*/

      done();
    //});
  });

  it('should prorate discount for annual plan', function() {
    var b = new Braintree(),
        now = moment.utc('2014-08-07T00:00:00');

    expect(b._prorateRequiredDiscountForAnnualPlan('2014-08-06T00:00:00','2014-09-06T00:00:00',900,1,now)).to.deep.eq({
      monthlyPrice: 900,
      requiredDiscount: 1065,
      proratedBalance: 9741
    });
    expect(b._prorateRequiredDiscountForAnnualPlan('2014-08-06T00:00:00','2014-09-06T00:00:00',2900,1,now)).to.deep.eq({
      monthlyPrice: 2900,
      requiredDiscount: 3432,
      proratedBalance: 31386
    });
    expect(b._prorateRequiredDiscountForAnnualPlan('2014-08-06T00:00:00','2014-09-06T00:00:00',5900,1,now)).to.deep.eq({
      monthlyPrice: 5900,
      requiredDiscount: 6982,
      proratedBalance: 63854
    });
    expect(b._prorateRequiredDiscountForAnnualPlan('2014-08-06T00:00:00','2014-09-06T00:00:00',10900,1,now)).to.deep.eq({
      monthlyPrice: 10900,
      requiredDiscount: 12899,
      proratedBalance: 117967
    });
  });
});
