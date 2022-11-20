'use strict';

angular.module('fpmApp')
  .controller('BillingCtrl', ['$rootScope', '$scope', '$state', '$apply', '$sanitize', '$timeout', '$window', '$anchorScroll', 'Google', 'Braintree', 'countries', 'flash', 'moment', 'Premium', 'config', 'Log', 'dialogs', function($rootScope, $scope, $state, $apply, $sanitize, $timeout, $window, $anchorScroll, Google, Braintree, countries, flash, moment, Premium, config, Log, dialogs) {

    var paramPlan = $state.params.plan && $state.params.plan.toUpperCase();
    if (paramPlan) {
      paramPlan = paramPlan === 'FREE' || paramPlan.indexOf('PAYWYUM_') > -1 ? paramPlan : 'PAYWYUM_'+paramPlan;
    }

    $scope.Google = Google;
    $scope.countries = countries;
    $scope.saving = false;
    $scope.paymentMethod = null;
    $scope.isPaymentMethodSelected = Braintree.isPaymentMethodSelected();
    $scope.isPaymentPrepared = false;
    $scope.paramPlan = paramPlan;
    $scope.selectedPlan = paramPlan || Google.profile.plan.name;
    $scope.nextPayment = Google.profile.subscription && Google.profile.subscription.nextPay;
    $scope.isSubscribed = Google.profile.subscription && Google.profile.subscription.id ? true : false;
    $scope.billTo = (Google.profile.subject && Google.profile.subject.billTo || '').replace(/<br\s*\/?>/g,'\n');
    $scope.isPayPalGw = Google.profile.subscription && Google.profile.subscription.gw === 'PAYPAL';
    $scope.payPalEmail = $scope.isPayPalGw && Google.profile.subscription.customer.id;
    $scope.monthlyPriceValue = (Google.profile.subscription && Google.profile.subscription.amount || 0) / 100;
    $scope.prepayCompleted = false;
    $scope.isCurrentPlanFree = Google.profile.plan.name === 'TRIAL' || Google.profile.plan.name === 'FREE' || Google.profile.plan.name === 'FREEFOREVER';
    $scope.subinterval = $scope.isCurrentPlanFree ? 'prepay' : 'month';

    $scope.prepayDiscountMonths = {
      1: 2,
      2: 6
    };

    function enhancePaymentMethod(pm) {
      switch (pm.type) {
      case 'PayPalAccount':
        pm.type = 'paypal';
        break;
      default:
        pm.type = pm.type.toLowerCase();
        break;
      }
      return pm;
    }

    $scope.selectedPlanMonthlyPrice = function() {
      var plan = $scope.selectedPlan && config.plans[$scope.selectedPlan];
      return plan && plan.intervals && (plan.intervals.MONTH.pricePerMonth / 100);
    }

    $scope.selectedPlanAnnualPrice = function() {
      return ((12 - $scope.prepayDiscountMonths[1]) * $scope.selectedPlanMonthlyPrice()) || '?';
    }

    $scope.selectedPlanAnnualPriceMonthly = function() {
      return Math.round(($scope.selectedPlanAnnualPrice() * 100) / 12) / 100;
    }

    $scope.getPlanName = function(planId) {
      var planConfig = config.plans[planId];
      return planConfig ? (planConfig.name || planConfig.id) : (config.plans[planId].name || planId);
    };

    $scope.planName = function() {
      var planConfig = Google.profile.subscription && Google.profile.subscription.plan ? config.plans[Google.profile.subscription.plan] : null;
      return planConfig ? (planConfig.name || planConfig.id) : (config.plans[Google.profile.plan.name].name || Google.profile.plan.name);
    };

    $scope.money = function(credit) {
      return Math.floor(credit/10000)/100;
    };

    $scope.monthlyPrice = function() {
      // return '$'+($scope.monthlyPriceValue || ($scope.money(Premium.costs && Premium.costs.metrics && Premium.costs.metrics.profile && Premium.costs.metrics.profile.monthly || 0)));
      return '$'+$scope.monthlyPriceValue;
    };

    $scope.additionalCategoryName = function() {
      return Google.profile.plan.name === 'PAYWYUM' ? 'social account' : 'queue';
    };

    $scope.additionalQueueMonthlyPrice = function() {
      if (Google.profile.plan.name === 'PAYWYUM') {
        return Math.floor(Google.profile.premium.metrics.profile * 100) / 100;
      } else {
        return (Math.floor(Google.profile.premium.metrics.connectedAccount * 100) / 100) || 2.99;
      }
    };

    $scope.validUntil = function() {
      return Google.profile && Google.profile.plan.validUntil ? moment.utc(Google.profile.plan.validUntil).local().format('YYYY-MM-DD') : null;
    };

    $scope.nextPaymentDate = function() {
      return $scope.nextPayment && moment.utc($scope.nextPayment).local().format('YYYY-MM-DD');
    };

    $scope.nextPaymentFromNow = function() {
      return $scope.nextPayment && moment.utc($scope.nextPayment).local().fromNow();
    };

    $scope.vatPercent = function() {
      return 0;
    };

    $scope.shouldIncludeVat = function() {
      // not VAT registered
      return false;
      // only VAT registered
      // var isFromEU = $scope.vatPercent() ? true : false,
      //     subject = Google && Google.profile && Google.profile.subject,
      //     countryCode = subject && subject.country,
      //     isHomeCountry = countryCode === 'GB',
      //     isVatPayer = subject && subject.vatId ? true : false;
      // return (isHomeCountry || (isFromEU && !isVatPayer))
      // VAT + VAT MOSS registered
      // return (isFromEU && !isVatPayer && !isHomeCountry);
    };

    $scope.vatCountryName = function() {
      var countryCode = Google && Google.profile && Google.profile.subject && Google.profile.subject.country,
          country = countryCode && countries.findSorted(countryCode),
          countryName = country && country.name;
      return countryName;
    };

    $scope.vatIncludedPrice = function(price) {
      var shouldIncludeVat = $scope.shouldIncludeVat(),
          vatPercent = shouldIncludeVat && $scope.vatPercent() || 0,
          vat = vatPercent && (Math.ceil(price*vatPercent) / 100) || 0;
      return Math.ceil((price+vat) * 100)/100;
    };

    $scope.prepayBiggestDiscountMonths = function() {
      var months = 0;
      for (var years in $scope.prepayDiscountMonths) {
        months = Math.max(months, $scope.prepayDiscountMonths[years]);
      }
      return months;
    };

    $scope.prepayDiscount = function(years) {
      var price = $scope.monthlyPriceValue * $scope.prepayDiscountMonths[years];
      return price ? '$'+(Math.ceil(price * 100)/100) : '?';
    };

    $scope.prepayDiscountPercent = function(years) {
      return Math.round(($scope.prepayDiscountMonths[years] * 100) / (years * 12));
    };

    $scope.prepayPrice = function(years) {
      var price = $scope.monthlyPriceValue * (12 * years - $scope.prepayDiscountMonths[years]);
      return price ? '$'+(Math.ceil(price * 100)/100) : '?';
    };

    $scope.isCurrentPlan = function(planName) {
      return Google.profile.plan.name === planName;
    };

    $scope.isPlan = function(planName) {
      return $scope.selectedPlan === planName;
    };

    $scope.choosePlan = function(planName) {
      $scope.selectedPlan = planName;
      $anchorScroll('billing-form');
    };

    $scope.paymentInfoTitle = function() {
      if (Google.profile.plan.name === $scope.selectedPlan && $scope.isSubscribed) {
        return 'Update Payment Info';
      } else {
        return 'Upgrade to <b>'+$scope.getPlanName($scope.selectedPlan)+'</b> plan';
      }
    };

    $scope.updateButtonTitle = function() {
      if (Google.profile.plan.name === $scope.selectedPlan && $scope.isSubscribed) {
        return ($scope.saving ? 'Updating...': 'Update Payment Info');
      } else {
        return $scope.isSubscribed ?
        ($scope.saving ? 'Upgrading...': 'Upgrade to <b>'+$scope.getPlanName($scope.selectedPlan)+'</b> plan'):
        ($scope.saving ? 'Subscribing...': 'Subscribe to <b>'+$scope.getPlanName($scope.selectedPlan)+'</b> plan');
      }
    };

    function updateOrganization(callback) {
      Google.profile.subject.billTo = ($scope.billTo || '').replace(/\n/g,'<br/>');
      Google.profile.subject.billTo = Google.profile.subject.billTo && $sanitize(Google.profile.subject.billTo);
      Google.profile.subject.org = Google.profile.subject.org && $sanitize(Google.profile.subject.org);
      Google.profile.subject.vatId = Google.profile.subject.vatId && $sanitize(Google.profile.subject.vatId);

      Google.profileGoogleSaveOrganization(function(err) {
        if (err) {
          var msg = err.error && err.error.message;
          flash.pop({title: 'Billing', body: msg || 'We are sorry but we have not been able to complete update. Please try again.', type: 'error'});
        }
        callback(err);
      });
    }

    function isPAYWYUMBasedPlan() {
      var plan = Google.profile && Google.profile.plan && Google.profile.plan.name;
      return plan === 'PAYWYUM' || plan.indexOf('PAYWYUM_') === 0;
    }

    function fetchSubscriptionAmount() {
      if (isPAYWYUMBasedPlan()) {
        Google.billableProfilesCount(function(err, data) {
          $scope.monthlyPriceValue = Math.max(0, data && data.amount || 0);
          $scope.nextPayment = data && data.nextPay;
        });
      }
    }

    $scope.isPrepayAllowed = function() {
      return !$scope.prepayCompleted && $scope.monthlyPriceValue && $scope.nextPayment && Google.profile.subscription.gw === 'BRAINTREE' && isPAYWYUMBasedPlan();
    }

    $scope.prepay = function(years) {
      var title = years === 1 ? 'Prepay for a year': 'Prepay for '+years+' years';
      dialogs.confirm(title, 'Please, confirm that you\'d like to prepay '+$scope.prepayPrice(years)+' and get your '+$scope.prepayDiscount(years)+' discount.', 'Yes, I\'d like to prepay '+$scope.prepayPrice(years), function() {
        $scope.saving = true;
        $scope['prepayingYears'+years] = true;
        Google.braintreePrepay({ years: years }, function(err, data) {
          if (err) {
            var msg = err.error && err.error.message;
            flash.error(title, msg || 'Uknown error');
          } else {
            $scope.prepayCompleted = true;
            flash.success(title, 'Successfully pre-payed. Thank you!');
            fetchSubscriptionAmount();
          }
          $scope.saving = false;
          $scope['prepayingYears'+years] = false;
          $apply($scope);
        });
      });
    };

    var initBraintree;

    function finishBraintree() {
      if ($scope.isSubscribed && Google.profile.plan.name === $scope.selectedPlan) {
        Google.braintreeUpdateCard({
          paymentMethod: $scope.paymentMethod
        }, function(err, data) {

          if (err) {
            var msg = err.error && err.error.message;
            flash.error('Billing', msg || 'Uknown error');
          } else {
            Google.profile.subscription = data.subscription;

            flash.success('Billing', 'Successfully updated.');
          }

          initBraintree();

          $scope.saving = false;
          $apply($scope);
        });
      } else {
        Google.braintreeSubscribe({
          paymentMethod: $scope.paymentMethod,
          couponCode: null,
          plan: $scope.selectedPlan,
          prepayYears: $scope.subinterval === 'prepay' ? 1 : 0,
          interval: 'MONTH'
        }, function(err, data) {
          if (err) {
            var msg = err.error && err.error.message;
            flash.error('Billing', msg || 'Uknown error');
          } else {
            flash.success('Billing', 'Successfully subscribed.');

            Google.profile.plan = data.plan;
            Google.profile.use = data.use;
            Google.profile.subscription = data.subscription;
            Google.profile.accounts = data.accounts;

            $scope.selectedPlan = Google.profile.plan.name;
            $scope.monthlyPriceValue = (Google.profile.subscription && Google.profile.subscription.amount || 0) / 100;

            fetchSubscriptionAmount();

            $rootScope.$broadcast('accounts:refresh');

            $scope.isSubscribed = true;
          }

          initBraintree();

          $scope.saving = false;
          $apply($scope);
        });
      }
    }

    function onBraintreeError(err) {
      var msg = err && err.message;
      Log.error('Braintree error: ' + msg, { error: err });

      var ignoreErr = err.message === 'options.selector or options.container must reference a valid DOM node.';
      if (!ignoreErr) {
        flash.error('Payment Error', (msg?msg+'<br><b>':'')+'Please, try again.'+(msg&&'</b>'));
      }

      Braintree.clear();

      $scope.saving = false;
      $apply($scope);
    }

    function payOrUpdate() {
      Braintree.pay(function(result) {
        $scope.paymentMethod = enhancePaymentMethod(result);
        finishBraintree();
      }, onBraintreeError);
    }

    initBraintree = function () {
      Braintree.autoSetup('#dropin-container', function() {
        $scope.paymentMethod = null;
        $scope.isPaymentPrepared = true;
        $scope.isPaymentMethodSelected = Braintree.isPaymentMethodSelected();
        $scope.saving = false;
        $apply($scope);
      }, onBraintreeError, function() {
        $scope.isPaymentMethodSelected = Braintree.isPaymentMethodSelected();
        $apply($scope);
      });
    };

    $scope.setSubinterval = function(subinterval) {
      $scope.subinterval = subinterval;
    }

    $scope.finish = function($event, subinterval) {
      $scope.saving = true;
      updateOrganization(function(err) {
        if (err) {
          $scope.saving = false;
        } else {
          $timeout(function() { payOrUpdate(); });
        }
      });
    };

    if (Google.profile) {
      Google.profile.subject = Google.profile.subject || {};
      Google.profile.subject.invoiceEmail = Google.profile.subject.invoiceEmail || Google.user.email;
    }

    initBraintree();

    function c(name, title, photo, link, quote) {
      return { name: name, title: title, photo: photo, link: link, quote: quote };
    }

    var customers = [c(
      'Martin Shervington',
      'Speaker, Consultant, Author, Marketing Psychologist',
      'https://lh5.googleusercontent.com/-74yZewNa7Lc/AAAAAAAAAAI/AAAAAAABsWs/PRheuo2uAtg/photo.jpg?sz=60',
      'https://plus.google.com/114918475211209783081',
      'I think Friends+Me is an awesome tool that enables your Google+ content to really fly out the door and into other networks. <b>Highly Recommend.</b>'
    ), c(
      'Andrij "Andrew" Harasewych',
      'Marketing Strategist',
      'https://lh3.googleusercontent.com/-RiT4Ny7IE7U/AAAAAAAAAAI/AAAAAAACFek/HlJTRf7fRCU/photo.jpg?sz=60',
      'https://plus.google.com/103008963082975341976',
      'Friends+Me is a great solution for finding the perfect balance between an engaging social presence and the social automation we need as marketers and business owners to keep from going absolutely insane with busy work.'
    ), c(
      'Mark Traphagen',
      'Senior Director of Online Marketing',
      'https://lh3.googleusercontent.com/-kT6hRDf1K8U/AAAAAAAAAAI/AAAAAAABbOM/FKcofSyPuNw/photo.jpg?sz=60',
      'https://plus.google.com/107022061436866576067',
      'There simply isn\'t a better tool for resharing your Google+ content to other networks than Friends+Me. I love both the flexibility of choosing where I share (or if I share at all) using hashtags. And for Twitter, F+M automatically makes my Google+ post title line the tweet text.<br>Perfect! <b>I use Friends+ Me every day.</b>'
    ), c(
      'Ben Fisher',
      'Social SEO Strategist',
      'https://lh5.googleusercontent.com/-q0VyZL-5YMM/AAAAAAAAAAI/AAAAAAAABow/UvW7t40H-gU/photo.jpg?sz=60',
      'https://plus.google.com/102572320061138442096',
      'Once I saw Friends+Me I had to try it out. Now <b>we recommend Friends+Me</b> to all of our Google Plus brand management customers. This allows our clients to focus on one network and syndicate posts effortlessly to other social networks.'
    ), c(
      'Wade Harman',
      'Relationship Marketing Expert',
      'https://lh5.googleusercontent.com/-aP6K2_DaQl4/AAAAAAAAAAI/AAAAAAAAMTU/4n5QesJFPv0/photo.jpg?sz=60',
      'https://plus.google.com/+WadeHarman',
      'Friends+Me has been a direct asset in helping me become more visible across all of social media. The easy to use platform helps you to set it and go about your business on social. It takes care of the rest. That helps people keep you "Top of Mind" and that\'s important!<br>I\'ll always use Friends+Me!'
    ), c(
      'Carole Rigonalli',
      'Business Owner',
      'https://lh6.googleusercontent.com/-kNUFAcwLRgg/AAAAAAAAAAI/AAAAAAAAiEQ/Vky8N87e6rE/photo.jpg?sz=60',
      'https://plus.google.com/113708489830879834550',
      'As an entrepreneur and owner of 3 companies I know how crucial social media is. Since beta stage <a href="https://plus.google.com/+FriendsPlusMe" target="_blank">+Friends+Me</a> have offered outstanding service plus are constantly striving to get even better.<br>With <a href="https://plus.google.com/+AloisBělaška" target="_blank">+Alois Bělaška</a> and team we found a service that meets our high requirements in style, functionality and actuality and quality.'
    ), c(
      'Ian Anderson Gray',
      'Social Media Consultant & Trainer',
      'https://lh5.googleusercontent.com/-f4zJHsysXWU/AAAAAAAAAAI/AAAAAAAAJeY/rKd1POb-GLA/photo.jpg?sz=60',
      'https://plus.google.com/118089425632910430111',
      'I use Friends+Me every day and it is not an exaggeration to say it has been integral to the growth of my social part of our business. As well as turning Google+ into a powerful social media management tool which allows you to cross post selectively and intelligently to a plethora of social channels it\'s allowed me to invest in Google+ and it\'s wonderful community.'
    ), c(
      'Jeff Roach',
      'Strategic Connector and CEO of Sociallogical.com',
      'https://lh5.googleusercontent.com/-FocHrud2Luw/AAAAAAAAAAI/AAAAAAAAh-g/LROYPbOGTYQ/photo.jpg?sz=60',
      'https://plus.google.com/116229771858126207183',
      'I don\'t expect everyone to jump on this but for those who already know the superior value of Google+, this simple little service makes it easy to make Plus the centre of your sharing activity without causing you to lose the social networks you’ve built elsewhere.<br><a href="http://sociallogical.com/blog/heres-how-you-switch-to-google-without-leaving-your-facebook-friends-behind-if-you-want-to/" target="_blank">Switch To Google+ Without Leaving Your Facebook Friends Behind (If You Want To)</a>'
    ), c(
      'Jonathan MacDonald',
      'Thought expander and professional speaker',
      'https://lh4.googleusercontent.com/-4DKoakXp8qs/AAAAAAAAAAI/AAAAAAAAI3w/FwzbL9knIbE/photo.jpg?sz=60',
      'https://plus.google.com/110716550870137087250',
      'I love Friends+Me. It has totally streamlined my social sharing and I’m now reliant on it to ensure cross-platform content. <b>Brilliant work!</b>'
    ), c(
      'Ben Johnston',
      'Graphic designer',
      'https://lh3.googleusercontent.com/-SPCseUqXpHY/AAAAAAAAAAI/AAAAAAAAAHk/xuDPAp7KAzw/photo.jpg?sz=60',
      'https://plus.google.com/106047137421326227626',
      'Easy to use, yet you\'ve got the control of getting the post looking just how you want it in Google+. Scheduling works really well too.<br>A lot simpler to use than many social media management tools!'
    )];

    var i, idx;
    var showCustomers = [];

    while (showCustomers.length < 3) {
      idx = Math.floor(Math.random() * customers.length);
      if (showCustomers.length) {
        for (i = 0; i < showCustomers.length; i++) {
          if (showCustomers[i].idx === idx) {
            idx = -1;
            break;
          }
        }
      }
      if (idx > -1) {
        customers[idx].idx = idx;
        showCustomers.push(customers[idx]);
      }
    }

    $scope.showCustomers = showCustomers;

    fetchSubscriptionAmount();
  }]);
