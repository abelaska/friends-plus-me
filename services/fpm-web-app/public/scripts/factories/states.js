/*jshint -W015*/
'use strict';

angular.module('states', []).factory('states', ['$rootScope', function($rootScope) {

    var states = {

      profile: {
        signedUp: {
          code: 0
        },
        activated: { // (pridan account)
          code: 1
        }
      },

      account: {
        enabled: {
          code: 0
        },
        disabled: {
          code: 1
        },
        blocked: {
          code: 2
        },
        reconnectRequired: {
          code: 3
        }
      },
      
      user: {
        deleted: {
          code: 0
        },
        enabled: {
          code: 1
        },
        blocked: {
          code: 2
        }
      },

      post: {
        scheduledByScheduler: {
          code: -51
        },
        scheduledByUser: {
          code: -50
        },
        smallerIsScheduled: {
          code: -49
        },
        retry: {
          code: -2
        },
        publishing: {
          code: -1
        },
        draft: {
          code: 0
        },
        failed: {
          code: 1
        },
        published: {
          code: 100
        }
      }
    };

    function codeToName(code) {
      /*jshint validthis:true */
      return this[code] ? this[code].name : 'unknown('+code+')';
    }

    var state;
    for (var model in states) {
      for (var name in states[model]) {
        state = states[model][name];
        state.name = name;
        states[model][state.code] = state;
      }
      state = states[model];
      state.codeToName = codeToName.bind(state);
    }

    $rootScope.states = states;

    return states;
  }]);