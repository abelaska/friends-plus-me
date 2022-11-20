import { registerModel, Schema, SchemaObjectId, Mixed, dbUpdatedCount } from '../db';
import { Types, States } from '@fpm/constants';
import moment from 'moment';
import async from 'async';
import _ from 'underscore';
import log from '@fpm/logging';
import config from '@fpm/config';
import Coupon from './Coupon';
import PricingPlan from './PricingPlan';
import { Profile } from './Profile';
import User from './User';

var Post = new Schema({
  pid: SchemaObjectId, // profile._id
  aid: SchemaObjectId, // profile.accounts._id
  parentAid: SchemaObjectId, // profile.accounts._id
  uid: String, // profile.accounts.uid
  parentUid: String, // profile.accounts.parentUid
  categoryId: String, // profile.accounts.category.id

  ng: Boolean, // post scheduled for next-generation queue

  accountCode: Number, // typ socialni site a uctu (0=google+,1=twitter,2=facebook,3=linkedin)*10000+(0=Profile,1=Page,2=Group,5=Community)

  processor: String, // nazev processoru urceneho pro publikovani dane zpravy

  source: String, // source of the post: api, app, extension

  createdBy: SchemaObjectId, // user._id ktery draft vytvoril
  modifiedBy: SchemaObjectId, // user._id ktery draft naposled upravoval

  createdAt: {
    // cas vytvoreni prispevku
    type: Date,
    default: Date.now
  },
  modifiedAt: {
    // cas posledni modifikace prispevku
    type: Date,
    default: Date.now
  },
  completedAt: Date, // cas ne/uspesneho ukonceni zpracovani prispevku
  completedAt: Date, // cas ne/uspesneho ukonceni zpracovani prispevku

  publishAt: Date, // naplanovany cas pulikovani prispevku, pri opakovanem pokusu o publikovani se nastavuje hodnota (now + Math.exp(tries) * 60s)

  blockedAt: {
    // cas zablokovani dalsiho zpracovani prispevku, tyto prispevky jsou ponechavany ve fronte bez dalsiho zpracovani
    type: Date,
    default: null
  },

  lockedUntil: {
    // cas do kdy je zaznam uzamcen
    type: Date,
    default: Date.now
  },

  publish: {
    // Repeat every {interval} {intervalUnit} for {period} {periodUnit}
    parent: SchemaObjectId, // post._id of parent post with repeat object set    
    count: { // total number of times the posts should be scheduled
      type: Number, 
      default: 1
    },
    publishAt: [Date], // list of times the post is still scheduled for
    published: { // number of successfully published posts from the count
      type: Number, 
      default: 0
    },
    publishedAt: [Date], // list of times the post was successfully published at
    failed: Number, // number of failed published posts from the count
    failedAt: [Date], // list of times the post was failed to be published at
    interval: Number, // interval number
    intervalUnit: {
      // interval unit
      type: String,
      enum: ['hours', 'days', 'weeks', 'months']
    },
    period: Number, // period number
    periodUnit: {
      // period unit
      type: String,
      enum: ['hours', 'days', 'weeks', 'months']
    }

  },
 
  tries: {
    // pocet provedenych pokusu o odeslani zpravy, maximalni pocet pokusu o publikovani je 10
    type: Number,
    default: 0
  },

  failures: [
    Mixed /*          // seznam duvodu selhani publikovani
    tm:             Date,       // cas pokusu o publikovani
    message:        String,     // textovy popis duvodu selhani
    error:          Mixed       // odpoved s chybou prijata z ciloveho systemu
  */
  ],

  state: {
    // stav prispevku
    type: Number,
    default: States.post.draft.code
  },

  editable: {
    // true pokud je post editovatelny, false pokud ne
    type: Boolean,
    default: true
  },

  destinations: [
    Mixed /*      // seznam Google destinaci circle,collection,community
    id:             String,     // id google entity
    type:           String,     // typ google entity: public-circle,your-circles,extended-circles,circle,collection,community
  */
  ],

  html: String, // HTML s podobou prispevku
  attachments: Mixed /*   // attachments
    link: {
      photo: {
        url:        String,     // url originalniho obrazku
        original:   String,     // original photo url
        gcs:        String,     // url full-sized obrazku ulozeneho v Google Cloud Storage
        width:      Number,     // sirka originalniho obrazku
        height:     Number,     // vyska originalniho obrazku
        aniGif:     Boolean,    // true: animated gif, false: is not animated gif
      },
      url:          String,     // url sdileneho odkazu pred zkracenim link shortenerem
      short: {
        type:       String,     // typ link shorteneru: bitly
        url:        String      // shortened url
        aid:        ObjectId    // profile.accounts._id jehoz shortener byl pro zkraceni pouzit
      },
      title:        String,     // titulek prilohy
      domain:       String,     // domena odkazu url
      description:  String      // kratky popis stranky
    },
    photo: {
      url:          String,     // url umisteni obrazku
      original:     String,     // original photo url
      gcs:          String,     // url full-sized obrazku ulozeneho v Google Cloud Storage
      width:        Number,     // sirka originalniho obrazku (optional)
      height:       Number      // vyska originalniho obrazku (optional)
      contentType:  String,     // contentType: image/gif, image/jpeg, image/png
      aniGif:       Boolean     // true: animated gif, false: is not animated gif
    },
    video: {
      embedUrl:     String      // video embed url
    }
  */,

  appendNoShare: Boolean, // true pokud na konec postu pred publikovanim pridat no share hashtag, false pokud ne

  id: String, // identifikator prideleny cilovou siti po uspesnem publikovani
  url: String, // URL na publikovany prispevek

  extension: {
    // informace nutne pro publikovani prispevku pres extensionu
    publishers: [SchemaObjectId] // seznam uzivatelu users._id kteri muzou publikovat dany post
  },

  reshare: {
    // struktura doplnovana v pripade, ze se jedna o reshare google prispevku
    is: {
      // indikace toho, ze se jedna o prispevek typu reshare
      type: Boolean,
      default: false
    },
    id: String // identifikator Google+ prispevku k reshare
  },

  repost: {
    // struktura doplnovana v pripade, ze se jedna o repost
    is: {
      // indikace toho, ze se jedna o prispevek typu repost
      type: Boolean,
      default: false
    },
    id: String, // identifikator puvodniho prispevku
    url: String, // URL preposilaneho prispevku
    short: Mixed /*
      type:         String,     // typ link shorteneru: bitly
      url:          String,     // shortened url
      aid:          ObjectId    // profile.accounts._id jehoz shortener byl pro zkraceni pouzit
    */,
    src: SchemaObjectId // account._id zdrojoveho uctu repostu
  }
});

Post.index({ aid: 1 });

Post.index({ pid: 1 });
Post.index({ state: 1, aid: 1 });

Post.index({ state: 1, aid: 1, publishAt: 1 });
Post.index({ state: 1, pid: 1, publishAt: 1 });

Post.index({ state: 1, aid: 1, completedAt: -1 });
Post.index({ state: 1, pid: 1, completedAt: -1 });

Post.index({ state: 1, aid: 1, createdAt: -1 });
Post.index({ state: 1, pid: 1, createdAt: -1 });

Post.index({ state: 1, pid: 1, modifiedAt: -1 });
Post.index({ state: 1, pid: 1, createdby: 1, modifiedAt: -1 });

Post.index({ state: 1, aid: 1, publishAt: -1, lockedUntil: -1 });

Post.index({ state: 1, accountCode: 1, publishAt: -1, lockedUntil: -1, blockedAt: -1 });

Post.index({ state: 1, aid: 1, accountCode: 1, publishAt: -1, lockedUntil: -1, blockedAt: -1 });

// returns: true||false
Post.virtual('isDraft').get(function() {
  return this.state === States.post.draft.code;
});

// returns: true||false
Post.virtual('isNotDraft').get(function() {
  return this.state !== States.post.draft.code;
});

// returns: true||false
Post.virtual('isPublishableOnlyByExtension').get(function() {
  return _.contains(Types.publishableOnlyByExtension, this.accountCode);
});

function lerror(err) {
  if (!err) {
    return err;
  }
  if (_.size(err)) {
    return err;
  }
  return err.toString();
}

Post.methods._optimisticSave = function(callback, timeout, lockStartedAt) {
  lockStartedAt = lockStartedAt || new Date();
  timeout = timeout || config.get('post:storeTimeout') || 10000;

  this.save(
    function(err, obj) {
      if (err && err.name === 'VersionError' && new Date() - lockStartedAt < timeout) {
        return setTimeout(
          function() {
            this._optimisticSave(callback, timeout, lockStartedAt);
          }.bind(this),
          100
        );
      }
      callback(err, obj);
    }.bind(this)
  );
};

Post.methods._optimisticUpdate = function(update, callback, timeout, lockStartedAt) {
  lockStartedAt = lockStartedAt || new Date();
  timeout = timeout || config.get('post:storeTimeout') || 10000;

  this.update(
    update,
    function(err, updated) {
      if (err && err.name === 'VersionError' && new Date() - lockStartedAt < timeout) {
        return setTimeout(
          function() {
            this._optimisticUpdate(update, callback, timeout, lockStartedAt);
          }.bind(this),
          100
        );
      }
      callback(err, dbUpdatedCount(updated) || 0);
    }.bind(this)
  );
};

Post.methods.nextInSeconds = function() {
  var accType = Types.codeToNetworkAndAccount(this.accountCode),
    networkName = accType.network.typeName,
    accountName = accType.account.typeName,
    nextTryOffset =
      config.get('post:network:' + networkName + ':' + accountName + ':nextTryOffset') ||
      config.get('post:network:' + networkName + ':nextTryOffset') ||
      config.get('post:nextTryOffset') || 0,
    lockTimeBase =
      config.get('post:network:' + networkName + ':' + accountName + ':lockTimeBase') ||
      config.get('post:network:' + networkName + ':lockTimeBase') ||
      config.get('post:lockTimeBase') || 3;
  return nextTryOffset + Math.floor(Math.pow(lockTimeBase, this.tries || 0) * 60);
};

Post.methods.lock = function(callback, now) {
  now = now || moment.utc();

  var set = {
    lockedUntil: now.clone().add(3, 'minutes').add(this.nextInSeconds(), 'seconds').toDate()
  };

  this.lockedUntil = set.lockedUntil;

  this._optimisticUpdate(
    { $set: set },
    function(err, updated) {
      if (err) {
        log.error('Failed to lock post', {
          postId: this._id.toString(),
          set: set,
          updated: updated && updated.result,
          error: lerror(err)
        });
      }
      if (callback) {
        callback(err);
      }
    }.bind(this)
  );
};

Post.methods.failed = function(failure, callback, now) {
  now = now || moment.utc();

  var update = {
    $set: {
      state: States.post.failed.code,
      lockedUntil: now.toDate(),
      completedAt: now.toDate()
    }
  };

  this.state = update.$set.state;
  this.lockedUntil = update.$set.lockedUntil;
  this.completedAt = update.$set.completedAt;

  if (failure) {
    if (_.isString(failure)) {
      failure = {
        message: failure
      };
    }
    if (!failure.tm) {
      failure.tm = moment.utc().toDate();
    }
    update.$push = { failures: failure };
  }

  this._optimisticUpdate(
    update,
    function(err, updated) {
      if (err || !updated) {
        log.error('Failed to update failed post', {
          postId: this._id.toString(),
          updated: updated,
          error: lerror(err)
        });
      }

      if (failure) {
        this.failures.push(failure);
      }

      // TODO odeslat uzivateli notifikaci o selhani publikovani

      if (callback) {
        callback(err);
      }
    }.bind(this)
  );
};

Post.methods.retry = function(failure, callback, now) {
  now = now || moment.utc();

  var update = {
    $set: {
      state: States.post.retry.code,
      lockedUntil: now.toDate(),
      publishAt: now.clone().add(this.nextInSeconds(), 'seconds').toDate()
    }
  };

  this.state = update.$set.state;
  this.lockedUntil = update.$set.lockedUntil;
  this.publishAt = update.$set.publishAt;

  if (failure) {
    if (_.isString(failure)) {
      failure = {
        message: failure
      };
    }
    if (!failure.tm) {
      failure.tm = moment.utc().toDate();
    }
    update.$push = { failures: failure };
  }

  this._optimisticUpdate(
    update,
    function(err, updated) {
      if (err || !updated) {
        log.error('Failed to update retry post', {
          updated: updated,
          postId: this._id.toString(),
          error: lerror(err)
        });
      }

      if (failure) {
        this.failures.push(failure);
      }

      if (callback) {
        callback(err);
      }
    }.bind(this)
  );
};

Post.methods.published = function(postId, postUrl, callback, now) {
  now = now || moment.utc();

  var set = {
    id: postId,
    url: postUrl,
    state: States.post.published.code,
    lockedUntil: now.toDate(),
    completedAt: now.toDate()
  };

  this.id = set.id;
  this.url = set.url;
  this.state = set.state;
  this.lockedUntil = set.lockedUntil;
  this.completedAt = set.completedAt;

  this._optimisticUpdate(
    { $set: set },
    function(err, updated) {
      if (err) {
        log.error('Failed to update published post', {
          postId: this._id.toString(),
          updated: updated,
          error: lerror(err)
        });
      }
      if (callback) {
        callback(err);
      }
    }.bind(this)
  );
};

function extensionPublishRequestToAccountsId(user, networks, isForExtension, callback) {
  var accounts = [];

  User.findOne({ _id: user._id }, function(err, user) {
    if (err || !user) {
      return callback(err || { error: { message: 'User ' + user._id.toString() + ' not found' } });
    }

    Profile.find(
      {
        _id: { $in: _.chain(user.profiles).values().flatten().value() }
      },
      '_id use members accounts._id accounts.members accounts.uid accounts.parentUid accounts.account accounts.network',
      function(err, profiles) {
        if (err) {
          return callback(err);
        }

        var a, ac, uids, networkCode, canManageProfile;
        _.chain(networks).pairs().each(function(pair) {
          uids = pair[1];
          networkCode = Types.network[pair[0]] && Types.network[pair[0]].code;
          if (networkCode !== undefined && networkCode !== null && uids.length) {
            _.each(profiles, function(profile) {
              canManageProfile = user.canManageProfile(profile);
              if (profile.accounts.length > 0) {
                for (var i = 0; i < profile.accounts.length; i++) {
                  a = profile.accounts[i];
                  ac = Types.createCode(networkCode, a.account);
                  if (
                    a.network === networkCode &&
                    (_.contains(uids, a.uid) || _.contains(uids, a.parentUid)) &&
                    (canManageProfile || user.canManageAccount(a)) &&
                    (!isForExtension || _.contains(Types.publishableOnlyByExtension, ac))
                  ) {
                    accounts.push(a._id);
                  }
                }
              }
            });
          }
        });

        callback(null, accounts);
      }
    );
  });
}

Post.static('blockAll', function(account, callback, now) {
  now = now || moment.utc();
  this.update(
    {
      aid: account._id,
      state: { $lt: States.post.published.code }
    },
    {
      $set: {
        blockedAt: now.toDate()
      }
    },
    { multi: true },
    function(err, updated) {
      if (err) {
        log.error('Failed to block all posts', {
          accountId: account._id.toString(),
          error: lerror(err)
        });
        return callback && callback(err);
      }

      if (dbUpdatedCount(updated)) {
        log.info('Blocked ' + dbUpdatedCount(updated) + ' posts', {
          accountId: account._id.toString()
        });
      }

      if (callback) {
        callback(err);
      }
    }.bind(this)
  );
});

Post.static('unblockAll', function(account, callback, now) {
  now = now || moment.utc();
  this.update(
    {
      aid: account._id,
      state: { $lt: States.post.publishing.code }
    },
    {
      $set: {
        blockedAt: null
      }
    },
    { multi: true },
    function(err, updated) {
      if (err) {
        log.error('Failed to unblock all posts', {
          accountId: account._id.toString(),
          error: lerror(err)
        });
        return callback && callback(err);
      }

      if (dbUpdatedCount(updated)) {
        log.info('Unblocked ' + dbUpdatedCount(updated) + ' posts', {
          accountId: account._id.toString()
        });
      }

      if (callback) {
        callback(err);
      }

      // var foundPosts = 0;

      // async.doWhilst(
      //   function(cb) {

      //     this.find({
      //       aid: account._id,
      //       state: {$lt: States.post.publishing.code},
      //       blockedAt: {$ne: null}
      //     }, '_id blockedAt publishAt lockedUntil', {limit: 25}, function(err, posts) {

      //       foundPosts = posts && posts.length || 0;

      //       if (err || !posts) {
      //         return cb(err);
      //       }

      //       async.eachLimit(posts, 8, function(post, cb2) {
      //         var blockedDiffSecs = Math.max(now.diff(moment.utc(post.blockedAt), 'seconds'), 0);
      //         if (blockedDiffSecs > 0) {
      //           post.update({
      //             $set: {
      //               blockedAt: null,
      //               lockedUntil:  moment.utc(post.lockedUntil).add(blockedDiffSecs, 'seconds').toDate(),
      //               publishAt: moment.utc(post.publishAt).add(blockedDiffSecs, 'seconds').toDate()
      //             }
      //           }, cb2);
      //         } else {
      //           cb2();
      //         }
      //       }, cb);
      //     }.bind(this));
      //   }.bind(this),
      //   function() { return foundPosts > 0; },
      //   function(err) {
      //     callback && callback(err);
      //   });
    }.bind(this)
  );
});

Post.static('acquirePostsByNetworkAndUid', function(
  user,
  networks,
  isForExtension,
  maxPostsPerAccountPerFetch,
  callback,
  now
) {
  extensionPublishRequestToAccountsId(
    user,
    networks,
    isForExtension,
    function(err, accountsId) {
      if (err) {
        log.error('Failed to fetch profiles', {
          userId: user._id.toString(),
          networks: networks,
          error: lerror(err)
        });
        return callback(err);
      }
      if (accountsId.length) {
        this.acquirePostsByAccounts(
          accountsId,
          maxPostsPerAccountPerFetch,
          function(err, posts) {
            if (err) {
              log.error('Failed to acquire posts', {
                userId: user._id.toString(),
                networks: networks,
                error: lerror(err)
              });
              return callback(err);
            }
            callback(null, posts);
          },
          now
        );
      } else {
        // log.info('No accounts found for posts fetch by network', {
        //   userId: user._id.toString(),
        //   networks: networks});

        callback(null, []);
      }
    }.bind(this)
  );
});

Post.static('acquirePostsByNetworkAndUidAndCodes', function(
  user,
  networks,
  accountCodes,
  maxPostsPerAccountPerFetch,
  callback,
  now
) {
  extensionPublishRequestToAccountsId(
    user,
    networks,
    false,
    function(err, accountsId) {
      if (err) {
        log.error('Failed to fetch profiles', {
          userId: user._id.toString(),
          networks: networks,
          accountCodes: accountCodes,
          error: lerror(err)
        });
        return callback(err);
      }
      if (accountsId.length) {
        this.acquirePostsByAccountsAndCodes(
          accountsId,
          accountCodes,
          maxPostsPerAccountPerFetch,
          function(err, posts) {
            if (err) {
              log.error('Failed to acquire posts', {
                userId: user._id.toString(),
                networks: networks,
                accountCodes: accountCodes,
                error: lerror(err)
              });
              return callback(err);
            }
            callback(null, posts);
          },
          now
        );
      } else {
        // log.info('No accounts found for posts fetch by network', {
        //   userId: user._id.toString(),
        //   networks: networks});

        callback(null, []);
      }
    }.bind(this)
  );
});

Post.static('acquirePosts', function(query, maxPosts, callback, now) {
  now = now || moment.utc();

  var lastPost,
    maxTries,
    accType,
    posts = [],
    lockUntil = now.clone().add(10, 'minutes').toDate();

  async.doWhilst(
    function(cb) {
      this.findOneAndUpdate(
        query,
        {
          $inc: {
            tries: 1
          },
          $set: {
            state: States.post.publishing.code,
            lockedUntil: lockUntil
          }
        },
        {
          new: true
        },
        function(err, post) {
          lastPost = null;

          if (err || !post) {
            return cb(err);
          }

          accType = Types.codeToNetworkAndAccount(post.accountCode);

          maxTries =
            config.get('post:network:' + accType.network.typeName + ':' + accType.account.typeName + ':maxTries') ||
            config.get('post:network:' + accType.network.typeName + ':maxTries') ||
            config.get('post:maxTries');

          if (post.tries >= maxTries) {
            post.failed('Maximum number of ' + maxTries + ' tries reached', cb, now);
          } else {
            posts.push(post);
            lastPost = post;
            post.lock(cb, now);
          }
        }
      );
    }.bind(this),
    function() {
      return posts.length < maxPosts && lastPost;
    },
    function(err) {
      if (err) {
        return callback(err);
      }
      callback(null, posts);
    }.bind(this)
  );
});

Post.static('acquirePostsByAccountCode', function(accountCode, maxPosts, callback, now) {
  now = now || moment.utc();
  this.acquirePosts(
    {
      state: { $lt: States.post.draft.code },
      accountCode: accountCode,
      publishAt: { $lte: now.toDate() },
      lockedUntil: { $lte: now.toDate() },
      blockedAt: null
    },
    maxPosts,
    callback,
    now
  );
});

Post.static('acquirePostsByAccountCodes', function(accountCodes, maxPosts, callback, now) {
  now = now || moment.utc();
  this.acquirePosts(
    {
      state: { $lt: States.post.draft.code },
      accountCode: { $in: accountCodes },
      publishAt: { $lte: now.toDate() },
      lockedUntil: { $lte: now.toDate() },
      blockedAt: null
    },
    maxPosts,
    callback,
    now
  );
});

Post.static('acquirePostsByAccountCodeRange', function(accountCodeGte, accountCodeLt, maxPosts, callback, now) {
  now = now || moment.utc();
  this.acquirePosts(
    {
      state: { $lt: States.post.draft.code },
      accountCode: { $gte: accountCodeGte, $lt: accountCodeLt },
      publishAt: { $lte: now.toDate() },
      lockedUntil: { $lte: now.toDate() },
      blockedAt: null
    },
    maxPosts,
    callback,
    now
  );
});

Post.static('acquirePostsByAccount', function(accountId, maxPosts, callback, now) {
  now = now || moment.utc();
  this.acquirePosts(
    {
      state: { $lt: States.post.draft.code },
      aid: accountId,
      publishAt: { $lte: now.toDate() },
      lockedUntil: { $lte: now.toDate() },
      blockedAt: null
    },
    maxPosts,
    callback,
    now
  );
});

Post.static('acquirePostsByAccountAndCodes', function(accountId, accountCodes, maxPosts, callback, now) {
  now = now || moment.utc();
  this.acquirePosts(
    {
      state: { $lt: States.post.draft.code },
      aid: accountId,
      accountCode: { $in: accountCodes },
      publishAt: { $lte: now.toDate() },
      lockedUntil: { $lte: now.toDate() },
      blockedAt: null
    },
    maxPosts,
    callback,
    now
  );
});

Post.static('acquirePostsByAccounts', function(accountsId, maxPostsPerAccount, callback, now) {
  var acquiredPosts = [];

  if (accountsId.length) {
    async.eachLimit(
      accountsId,
      4,
      function(accountId, cb) {
        this.acquirePostsByAccount(
          accountId,
          maxPostsPerAccount,
          function(err, posts) {
            if (err) {
              return cb(err);
            }
            if (posts.length) {
              acquiredPosts = acquiredPosts.concat(posts);
            }
            cb();
          },
          now
        );
      }.bind(this),
      function(err) {
        if (err) {
          return callback(err);
        }
        callback(null, acquiredPosts);
      }
    );
  } else {
    callback(null, acquiredPosts);
  }
});

Post.static('acquirePostsByAccountsAndCodes', function(accountsId, accountCodes, maxPostsPerAccount, callback, now) {
  var acquiredPosts = [];

  if (accountsId.length) {
    async.eachLimit(
      accountsId,
      4,
      function(accountId, cb) {
        this.acquirePostsByAccountAndCodes(
          accountId,
          accountCodes,
          maxPostsPerAccount,
          function(err, posts) {
            if (err) {
              return cb(err);
            }
            if (posts.length) {
              acquiredPosts = acquiredPosts.concat(posts);
            }
            cb();
          },
          now
        );
      }.bind(this),
      function(err) {
        if (err) {
          return callback(err);
        }
        callback(null, acquiredPosts);
      }
    );
  } else {
    callback(null, acquiredPosts);
  }
});

export default registerModel('Post', Post);
