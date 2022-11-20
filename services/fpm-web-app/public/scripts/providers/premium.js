'use strict';
/*jshint -W106*/

angular.module('premium', []).provider('Premium', function() {

  var Premium = ['$rootScope', 'Google', 'dialogs', 'moment', '_', function($rootScope, Google, dialogs, moment, _) {

    this.loaded = false;
    this.costs = {};
    this.dailyCost = 0;
    this.minimumBalance = 0;
    this.balance = 0;
    this.credit = 0;
    this.credits = [];
    this.creditText = '...';
    this.creditShouldLast = '';
    this.creditTooltip = '';

    this.updateCreditInfo = function updateCreditInfo(data) {
      if (!data) {
        return;
      }

      var credits = data.credits || [];
      var balance = data.balance || 0;
      var daily = data.costs && data.costs.daily || 0;
      var monthly = data.costs && data.costs.monthly || 0;
      var minimumBalance = data.costs && data.costs.minimumBalance || 0;

      credits.sort(function(a, b) {
        return moment.utc(b.createdAt).unix() - moment.utc(a.createdAt).unix();
      });

      credits = _.map(credits, function(c) {
        switch (c.credit.source) {
          case 'tx':
            c.credit.sourceText = 'Payment';
            break;
          case 'trial':
            c.credit.sourceText = 'Trial';
            break;
          case 'affiliate':
            c.credit.sourceText = 'Affiliate';
            break;
          case 'promocode':
            c.credit.sourceText = 'Promo';
            break;
        }
        return c;
      });

      this.loaded = true;
      this.costs = data.costs || {};
      this.dailyCost = daily;
      this.monthlyCost = monthly;
      this.minimumBalance = minimumBalance;
      this.balance = balance;
      this.credits = credits;
      this.credit = Math.ceil(balance/1000000);
      this.creditText = '$'+this.credit;
      this.creditShouldLast = data.remainingDaysHuman;
      this.creditTooltip = this.creditText+
        (daily > balance ?
          ' is not enough for a day' :
          ' should last for '+this.creditShouldLast);
    }.bind(this);

    this.refresh = function refresh() {
      Google.creditInfo(function(err, data) {
        if (err || !data) {
          return;
        }
        this.updateCreditInfo(data);
      }.bind(this));
    }.bind(this);

    $rootScope.$on('premium:refresh', function() {
      this.refresh();
    }.bind(this));

    this.refresh();
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Premium, {});
  }];
});
