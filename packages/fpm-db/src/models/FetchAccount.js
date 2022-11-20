import { registerModel, Schema, SchemaObjectId } from '../db';
import moment from 'moment';
import async from 'async';
import log from '@fpm/logging';
import PricingPlan from './PricingPlan';

var FetchAccount = new Schema({
  // _id = profile.accounts._id
  pid: SchemaObjectId, // profile._id

  created: { type: Date, default: Date.now }, // cas vytvoreni uctu

  prio: Number, // profile plan priority, vyssi cislo znaci vyssi prioritu pred ostatnima
  plan: String, // nazev aktualniho planu uzivatele
  interval: Number, // jaky je sekundovy interval mezi google+ fetch

  prevFetch: Date, // cas posledniho pokusu o ziskani novych G+ aktivit
  nextFetch: Date, // naplanovany cas pro dalsi ziskani novych Google+ aktivit
  lastFetch: Date, // cas posledniho fetch aktivity ulozene k repostu

  blockedAt: Date, // cas kdy doslo k zablokovani fetch
  fetchUpdatedAt: { type: Date, default: Date.now }, // cas posledni aktualizace zaznamu s vlivem na fetch interval

  refreshAt: Date, // cas kdy provest dalsi pokus o refresh access tokenu
  refreshTries: {
    // pocet selhavsich pokusu o ziskani tokenu v rade
    type: Number,
    default: 0
  },

  fetchTries: {
    // pocet selhavsich pokusu o fetch novych aktivit
    type: Number,
    default: 0
  }
});

FetchAccount.index(
  {
    nextFetch: 1,
    blockedAt: 1
  },
  { unique: false }
);

FetchAccount.index(
  {
    fetchUpdatedAt: -1,
    nextFetch: 1,
    blockedAt: 1
  },
  { unique: false }
);

FetchAccount.index(
  {
    nextFetch: 1,
    prevFetch: 1 // od nejstarsich po nejmladsi
  },
  { unique: false }
);

FetchAccount.index(
  {
    pid: 1
  },
  { unique: false }
);

FetchAccount.index(
  {
    _id: 1,
    pid: 1
  },
  { unique: false }
);

FetchAccount.index(
  {
    _id: 1,
    blockedAt: 1
  },
  { sparse: true }
);

FetchAccount.index(
  {
    plan: 1,
    interval: 1,
    lastFetch: 1
  },
  { unique: false }
);

FetchAccount.index(
  {
    plan: 1,
    interval: 1,
    lastFetch: 1,
    created: 1
  },
  { unique: false }
);

function _findProfilePlanFetchInterval(profile, callback) {
  PricingPlan.findPlan(profile.plan.name, profile, function(err, plan) {
    if (err || !plan) {
      callback(err);
    } else {
      callback(null, plan.fetchInterval);
    }
  });
}

FetchAccount.static('register', function(profile, account, updateExisting, callback, now) {
  now = now ? now.clone() : moment.utc();

  _findProfilePlanFetchInterval(
    profile,
    function(err, interval) {
      if (err) {
        callback(err);
      } else {
        var nextFetch = now.clone().add(interval, 'seconds').toDate();

        this.create(
          {
            _id: account._id,
            pid: profile._id,
            interval: interval,
            plan: profile.plan.name,
            prio: profile.plan.name === 'FREE' ? 0 : 1,
            nextFetch: profile.isAccountEnabled(account) ? nextFetch : null,
            prevFetch: nextFetch,
            lastFetch: now.toDate(),
            fetchUpdatedAt: now.toDate(),
            created: account.started
          },
          function(err, faccount) {
            if (err && err.code === 11000 && updateExisting) {
              // E11000 duplicate key error index
              this.findByIdAndUpdate(
                account._id,
                {
                  $set: {
                    interval: interval,
                    plan: profile.plan.name,
                    prio: profile.plan.name === 'FREE' ? 0 : 1,
                    nextFetch: profile.isAccountEnabled(account) ? nextFetch : null,
                    lastFetch: now.toDate(),
                    fetchUpdatedAt: now.toDate()
                  }
                },
                {
                  new: true
                },
                callback ||
                  function(err) {
                    if (err) {
                      log.error('Failed to update FetchAccount model', {
                        profileId: profile._id.toString(),
                        accountId: account._id.toString(),
                        error: err
                      });
                    }
                  }
              );
            } else if (callback) {
              callback(err, faccount);
            } else if (err) {
              log.error('Failed to create FetchAccount model', {
                profileId: profile._id.toString(),
                accountId: account._id.toString(),
                error: err
              });
            }
          }.bind(this)
        );
      }
    }.bind(this)
  );
});

FetchAccount.static('enable', function(account, callback, now) {
  now = now ? now.clone() : moment.utc();

  this.findById(
    account._id,
    function(err, fa) {
      if (fa) {
        var nextFetch = now.clone().add(fa.interval, 'seconds').toDate();
        this.update(
          { _id: account._id },
          {
            $set: {
              fetchTries: 0,
              nextFetch: nextFetch,
              prevFetch: now.toDate(),
              fetchUpdatedAt: now.toDate()
            },
            $unset: {
              refreshAt: ''
            }
          },
          callback ||
            function(err) {
              if (err) {
                log.error('Failed to enable FetchAccount', {
                  accountId: account._id.toString(),
                  error: err
                });
              }
            }
        );
      } else {
        if (callback) {
          callback(err);
        }
      }
    }.bind(this)
  );
});

FetchAccount.static('disable', function(account, callback) {
  this.update(
    { _id: account._id },
    { $set: { nextFetch: null, refreshAt: null, fetchUpdatedAt: moment.utc().toDate() } },
    callback ||
      function(err) {
        if (err) {
          log.error('Failed to disable FetchAccount', {
            accountId: account._id.toString(),
            error: err
          });
        }
      }
  );
});

FetchAccount.static('unblock', function(account, callback, now) {
  now = now ? now.clone() : moment.utc();
  this.update(
    {
      _id: account._id,
      blockedAt: { $lte: now.toDate() }
    },
    {
      $set: {
        fetchTries: 0,
        nextFetch: now.toDate(),
        fetchUpdatedAt: now.toDate()
      },
      $unset: {
        refreshAt: '',
        blockedAt: ''
      }
    },
    callback ||
      function(err) {
        if (err) {
          log.error('Failed to unblock FetchAccount', {
            accountId: account._id.toString(),
            error: err
          });
        }
      }
  );
});

FetchAccount.static('block', function(account, callback) {
  const now = moment.utc().toDate();
  this.update(
    { _id: account._id },
    { $set: { nextFetch: null, refreshAt: null, blockedAt: now, fetchUpdatedAt: now } },
    callback ||
      function(err) {
        if (err) {
          log.error('Failed to block FetchAccount', {
            accountId: account._id.toString(),
            error: err
          });
        }
      }
  );
});

FetchAccount.static('removeProfileAccounts', function(profile, callback) {
  this.remove(
    { pid: profile._id },
    callback ||
      function(err) {
        if (err) {
          log.error('Failed to remove all profile FetchAccount ', {
            profileId: profile._id.toString(),
            error: err
          });
        }
      }
  );
});

FetchAccount.static('updatePlan', function(profile, callback, now) {
  now = now ? now.clone() : moment.utc();

  _findProfilePlanFetchInterval(
    profile,
    function(err, interval) {
      if (err) {
        callback(err);
      } else {
        async.parallel(
          [
            async.apply(
              this.update.bind(this),
              { pid: profile._id },
              {
                $set: {
                  interval: interval,
                  plan: profile.plan.name,
                  prio: profile.plan.name === 'FREE' ? 0 : 1,
                  fetchUpdatedAt: now.toDate()
                }
              },
              { multi: true }
            ),
            async.apply(
              this.update.bind(this),
              { pid: profile._id, nextFetch: { $ne: null } },
              {
                $set: {
                  nextFetch: now.clone().add(interval, 'seconds').toDate(),
                  lastFetch: now.toDate(),
                  fetchUpdatedAt: now.toDate()
                }
              },
              { multi: true }
            )
          ],
          callback ||
            function(err) {
              if (err) {
                log.error('Failed to update FetchAccount plan', {
                  profileId: profile._id.toString(),
                  plan: profile.plan.name,
                  error: err
                });
              }
            }
        );
      }
    }.bind(this)
  );
});

FetchAccount.static('updateLastFetch', function(profile, account, callback, now) {
  now = now ? now.clone() : moment.utc();
  this.update(
    { _id: account._id, pid: profile._id },
    {
      $set: { lastFetch: now.toDate() }
    },
    callback ||
      function(err) {
        if (err) {
          log.error('Failed to update FetchAccount lastFetch', {
            profileId: profile._id.toString(),
            plan: profile.plan.name,
            error: err
          });
        }
      }
  );
});

export default registerModel('FetchAccount', FetchAccount);
