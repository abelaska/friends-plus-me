'use strict';

angular.module('braintree', []).provider('Braintree', function() {

  var Braintree = ['$rootScope','$window', 'Google', 'flash', function($rootScope, $window, Google, flash) {

    this.dropinInstance = null;

    this.teardown = function(callback) {
      if (this.dropinInstance) {
        var dropinInstance = this.dropinInstance;
        this.dropinInstance = null;
        dropinInstance.teardown(function() {
          if (callback) {
            callback();
          }
        }.bind(this));
      } else {
        if (callback) {
          callback();
        }
      }
    }.bind(this);

    this.pay = function(onPaymentMethodReceived, onError) {
      if (!this.dropinInstance) {
        return onError({ message: 'Payment not initialized' });
      }
      this.dropinInstance.requestPaymentMethod(function(err, payload) {
        if (err) {
          return onError(err);
        }
        onPaymentMethodReceived(payload);
      }.bind(this));
    }.bind(this);

    this.clear = function() {
      if (this.dropinInstance) {
        this.dropinInstance.clearSelectedPaymentMethod();
      }
    }.bind(this);

    this.isPaymentMethodSelected = function() {
      return !!(this.dropinInstance && this.dropinInstance.isPaymentMethodRequestable());
    }.bind(this);

    this.setup = function(selector, onReady, onError, onPaymentMethodChange) {
      Google.braintreeClientToken(function(err, result) {
        var clientToken = result && result.clientToken;
        if (err) {
          flash.error('Payment Error', 'Failed to initiate Braintree payment UI.<br><b>Please, refresh your browser.</b>');
          if (onError) {
            return onError(err || {error:{message:'Failed to generate client token.'}});
          } else {
            return;
          }
        }
        if (!clientToken) {
          return;
        }
        $window.braintree.dropin.create({
          authorization: clientToken,
          selector: selector,
          paymentOptionPriority: ['card', 'paypal', 'paypalCredit'],
          paypal: {
            flow: 'vault'
          },
          paypalCredit: {
            flow: 'vault'
          }
        }, function(err, dropinInstance) {
          if (err) {
            if (onError) {
              onError(err);
            }
            return;
          }
          this.dropinInstance = dropinInstance;

          var onPaymentMethodChangeEvent = function(/* event */) {
            if (onPaymentMethodChange) {
              onPaymentMethodChange();
            }
          };

          dropinInstance.on('paymentMethodRequestable', onPaymentMethodChangeEvent);
          dropinInstance.on('noPaymentMethodRequestable', onPaymentMethodChangeEvent);
          dropinInstance.on('paymentOptionSelected', onPaymentMethodChangeEvent);

          if (onReady) {
            onReady();
          }
        }.bind(this));
      }.bind(this));
    }.bind(this);

    this.autoSetup = function(selector, onReady, onError, onPaymentMethodChange) {
      this.teardown(function() {
        this.setup(selector, onReady, onError, onPaymentMethodChange);
      }.bind(this));
    }.bind(this);

    $rootScope.$on('$stateChangeSuccess', function(/*event, toState, toParams, fromState, fromParams*/) {
      this.teardown();
    }.bind(this));

    return this;
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(Braintree, {
    });
  }];
});