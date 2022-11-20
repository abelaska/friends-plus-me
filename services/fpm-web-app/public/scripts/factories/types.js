/*jshint -W015*/
'use strict';

angular.module('types', []).factory('types', ['$rootScope', function($rootScope) {

  var types = {
        network: {
          'google': {
            code: 0,
            name: 'Google+',
            accountTypes: ['profile','page']
          },
          'twitter': {
            code: 1,
            name: 'Twitter',
            defaultHashtagGroups: ['t','tf','tl','tfl'],
            accountTypes: ['profile']
          },
          'facebook': {
            code: 2,
            name: 'Facebook',
            defaultHashtagGroups: ['f','ft','fl','ftl'],
            accountTypes: ['profile','page','group']
          },
          'linkedin': {
            code: 3,
            name: 'Linkedin',
            defaultHashtagGroups: ['l','lt','lf','ltf'],
            accountTypes: ['profile','page','group']
          },
          'tumblr': {
            code: 4,
            name: 'Tumblr',
            defaultHashtagGroups: ['u'],
            accountTypes: ['blog','privblog']
          },
          // 'appnet': {
          //   code: 5,
          //   name: 'APP.NET',
          //   defaultHashtagGroups: ['a'],
          //   accountTypes: ['profile']
          // },
          'pinterest': {
            code: 6,
            name: 'Pinterest',
            defaultHashtagGroups: ['p'],
            accountTypes: ['board']
          },
          'instagram': {
            code: 7,
            name: 'Instagram',
            defaultHashtagGroups: ['i'],
            accountTypes: ['profile'],
            beta: true
          }
        },
        account: {
          'profile': {
            code: 0,
            name: 'Profile'
          },
          'page': {
            code: 1,
            name: 'Page'
          },
          'group': {
            code: 2,
            name: 'Group'
          },
          'blog': {
            code: 3,
            name: 'Blog'
          },
          'privblog': {
            code: 4,
            name: 'Private Blog'
          },
          'community': {
            code: 5,
            name: 'Community'
          },
          'collection': {
            code: 6,
            name: 'Collection'
          },
          'board': {
            code: 7,
            name: 'Board'
          },
          'circle': {
            code: 8,
            name: 'Circle'
          }
        },

        publishableOnlyByExtension: [],

        createCode: function(networkCode, accountCode) {
          return (networkCode * 10000) + accountCode;
        },

        createCodeByName: function(networkName, accountName) {
          return types.createCode(types.network[networkName].code, types.account[accountName].code);
        },

        findByCode: function(source, code) {
          for (var key in source) {
            if (source[key].code === code) {
              return source[key];
            }
          }
          return null;
        },

        networkTypeName: function(networkCode) {
          for (var key in types.network) {
            if (types.network[key].code === networkCode) {
              return key;
            }
          }
          return null;
        },

        accountTypeName: function(accountCode) {
          for (var key in types.account) {
            if (types.account[key].code === accountCode) {
              return key;
            }
          }
          return null;
        },

        typeName: function(networkCode, accountCode) {
          return types.networkName(networkCode) + ' ' +
                  (networkCode === types.network.linkedin.code && accountCode === types.account.page.code ? 'Company ' : '') +
                  types.accountName(accountCode);
        },

        networkTypeNameOfAccount: function(account) {
          return account ? types.networkTypeName(account.network) : account;
        },

        networkNameOfAccount: function(account) {
          return account ? types.networkName(account.network) : null;
        },

        typeNameOfAccount: function(account) {
          return !account ? account :
                 (types.networkName(account.network) + ' ' +
                  (account.network === types.network.linkedin.code && account.account === types.account.page.code ? 'Company ' : '') +
                  types.accountName(account.account));
        },

        typeNameForSentence: function(account) {
          return !account ? account :
                 (types.networkName(account.network) + ' ' +
                  (account.network === types.network.linkedin.code && account.account === types.account.page.code ? 'company ' : '') +
                  types.accountName(account.account).toLowerCase());
        },

        networkByCode: function(networkCode) {
          return types.findByCode(types.network, networkCode);
        },

        accountByCode: function(accountCode) {
          return types.findByCode(types.account, accountCode);
        },

        networkName: function(networkCode) {
          return types.networkByCode(networkCode).name;
        },

        accountName: function(accountCode) {
          return types.accountByCode(accountCode).name;
        }
      };

    types.publishableOnlyByExtension.push(types.createCodeByName('google', 'circle'));
    types.publishableOnlyByExtension.push(types.createCodeByName('google', 'profile'));
    types.publishableOnlyByExtension.push(types.createCodeByName('google', 'community'));
    types.publishableOnlyByExtension.push(types.createCodeByName('google', 'collection'));

    $rootScope.types = types;

    return types;
  }]);