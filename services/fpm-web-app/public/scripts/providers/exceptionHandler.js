'use strict';

angular.module('$exceptionHandler', []).provider('$exceptionHandler', function() {

  var ExHandler = ['$window','$log','$initialState','Log','stacktrace','config','_', function($window, $log, $initialState, Log, stacktrace, config, _) {

    this.lastErrors = [];

    var pushError = function(errorMessage, stackTrace) {
      this.lastErrors.push({
        errorMessage: errorMessage,
        stackTrace: stackTrace
      });

      if (this.lastErrors.length > 10) {
        this.lastErrors.shift();
      }
    }.bind(this);

    var acceptError = function(errorMessage, stackTrace) {
      var found = false;

      if (this.lastErrors.length) {
        for (var i = 0; i < this.lastErrors.length; i++) {
          if (!_.difference(stackTrace, this.lastErrors[i].stackTrace).length &&
              errorMessage === this.lastErrors[i].errorMessage) {
            found = true;
            break;
          }
        }
      }

      if (!found) {
        pushError(errorMessage, stackTrace);
      }

      return !found;
    }.bind(this);

    return function(exception, cause) {

      if ($window.Raven) {
        $window.Raven.captureException(exception);
      }

      $log.error.apply($log, arguments);

      try {
        var userAgent = $window.navigator ? $window.navigator.userAgent || '' : '',
            vendor = $window.navigator ? $window.navigator.vendor || '' : '',
            user = $initialState && $initialState.user || null,
            errorMessage = exception.toString(),
            stackTrace = stacktrace.print({ e: exception }),
            error = {
          url: $window.location.href,
          stacktrace: stackTrace,
          cause: cause||'',
          useragent: userAgent,
          vendor: vendor,
          user: user ? user._id : null,
          email: user ? user.email : null,
          version: config.version
        };

        if (acceptError(errorMessage, stackTrace)) {
          Log.error(errorMessage, error);
        }
      } catch(loggingError) {
        $log.warn('Error logging failed', loggingError);
      }
    }.bind(this);
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(ExHandler, {});
  }];
});
