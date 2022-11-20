/*jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { dbUpdatedCount, Profile } = require('@fpm/db');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const google = require('../lib/google');
const tools = require('../lib/tools');

// BitlyStrategy.prototype.userProfile = function(accessToken, done) {
//   this._oauth2.get('https://api-ssl.bitly.com/v3/user/info', accessToken, function (err, body, res) {
//     if (err) { return done(new Error('failed to fetch user profile', err)); }
//     try {
//       var json = JSON.parse(body),
//           data = json.data;

//       var profile = { provider: 'bitly' };
//       profile.id = data && data.login;
//       profile.fullName = data && data.full_name;
//       profile.displayName = data && data.display_name;
//       profile.profileUrl = data && data.profile_url;
//       profile.profileImage = data && data.profile_image;

//       profile._raw = body;
//       profile._json = json;

//       done(null, profile);
//     } catch(e) {
//       done(e);
//     }
//   });
// };

function googlPassportAuth(req, failureRedirect) {
  return passport.authorize('googl-authz', {
    failureRedirect: failureRedirect,
    accessType: 'offline',
    prompt: 'consent',
    includeGrantedScopes: true,
    scope: 'profile https://www.googleapis.com/auth/urlshortener'
  }, function(/*req, res*/  ){
    // this function will not be called.
  });
}

module.exports = function(app/*, accountManager*/) {

  var baseUrl = config.get('http:ui:redirect:url'),
      errorUrl = baseUrl+'/';

  passport.use('googl-authz', new GoogleStrategy({
      clientID: config.get('google:clientId'),
      clientSecret: config.get('google:clientSecret'),
      callbackURL: config.get('http:api:url')+'/1/googl/auth/return',
      passReqToCallback: true
    },
    function(req, accessToken, refreshToken, profile, done) {

      // log.debug('Goo.gl callback', {accessToken:accessToken, refreshToken:refreshToken, profile:profile});

      google.storeGoogleRefreshToken({ token: accessToken, secret: refreshToken }, function(err, newSecret) {
        done(null, {
          profile: profile,
          token: accessToken,
          secret: newSecret || refreshToken
        });
      });
    }
  ));

  function createReturnUrl(req) {
    return req.query.r || errorUrl;
  }

  app.get('/1/googl/auth/profile/:profile', tools.tokenRequired, function(req, res, next) {

    var url = createReturnUrl(req);

    req.session['googl:assign'] = {
      pid: req.params.profile,
      returnUrl: url
    };

    googlPassportAuth(req, url)(req, res, next);
  });

  app.get('/1/googl/auth/account/:account', tools.tokenRequired, function(req, res, next) {

    var url = createReturnUrl(req);

    req.session['googl:assign'] = {
      accountId: req.params.account,
      returnUrl: url
    };

    googlPassportAuth(req, url)(req, res, next);
  });

  app.get('/1/googl/auth/return', tools.tokenRequired, function(req, res, next) {
      if (req.query.code) {
        next();
      } else {
        res.redirect(errorUrl);
      }
    },
    passport.authorize('googl-authz', {failureRedirect: errorUrl}),
    function(req, res) {

      var all,
          user = req.user,
          assign = req.session['googl:assign'],
          url = assign && assign.returnUrl ? assign.returnUrl : errorUrl,
          profile = req.account;

      delete req.session['googl:assign'];

      /* */

      function callback(err, updated) {
        if (err) {
          req.notify('error','Failed to enable Goo.gl link shortener for queue. Please try again.');
          log.error('Failed to enable Goo.gl shortener for account', {
            userId: user._id.toString(),
            accountId: assign.accountId ? assign.accountId : null,
            profileId: assign.pid ? assign.pid : null,
            error: err});
        } else
        if (dbUpdatedCount(updated)) {
          if (all) {
            req.notify('success','Link shortener successfully switched to Goo.gl for all queues.');
          } else {
            req.notify('success','Queus link shortener successfully switched to Goo.gl.');
          }
        } else {
          if (all) {
            req.notify('warning','No queues found.');
            log.warn('No Goo.gl queues not found for user '+user.email, {
              userId: user._id.toString()});
          } else {
            req.notify('warning','Queues not found.');
            log.warn('Goo.gl queue "'+assign.accountId+'" not found for user '+user.email, {
              userId: user._id.toString()});
          }
        }
        res.redirect(url);
      }

      if (assign && (assign.pid || assign.accountId)) {

        var set,
            s = {
              type: 'googl',
              googl: {
                id: profile.profile && profile.profile.id,
                name: profile.profile && profile.profile.displayName || null,
                secret: profile.secret || null,
                token: profile.token || null
              }
            };
        all = assign.pid ? true : false;
        var query = all ? {'_id': assign.pid} : {'accounts._id': assign.accountId};

        Profile.findOne(query, '_id use members accounts._id', function(err, profile) {
          if (profile) {
            if (user.canManageProfile(profile)) {

              if (all) {
                if (profile.accounts.length > 0) {
                  set = {};
                  for (var i = 0; i < profile.accounts.length; i++) {
                    set['accounts.'+i+'.shortener'] = s;
                  }
                }
              } else {
                set = {'accounts.$.shortener': s};
              }
              if (set) {
                Profile.update(query, {$set: set}, callback);
              } else {
                callback(null, 0);
              }
            } else {
              req.notify('warning', 'You are not allowed to manage this profile.');
              log.warn('User '+user.email+' cannot manage profile '+profile._id.toString()+' Goo.gl configuration');
              res.redirect(url);
            }
          } else {
            req.notify('warning', 'Profile not found in database.');
            log.warn('Profile for Goo.gl configuration update not found', {
              query: JSON.stringify(query)});
            res.redirect(url);
          }
        });
      } else {
        req.notify('warning', 'Required paramers not assigned!');
        res.redirect(url);
      }
    }
  );
};
