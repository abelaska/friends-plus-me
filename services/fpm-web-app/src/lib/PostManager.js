const log = require('@fpm/logging').default;
const { Types, States } = require('@fpm/constants');
const { ObjectId, Profile, User, Post } = require('@fpm/db');
const _ = require('lodash');
const moment = require('moment');
const urlParser = require('url');
const auth = require('./auth');
const image = require('./image');

class PostManager {
  constructor(postScheduler) {
    this.postScheduler = postScheduler;
    this.maxMessageLength = 128 * 1024;
  }

  // data: {
  // post: {
  //   message,
  //   image: image url, image will be downloaded and stored in GCS bucket fpmi
  //   link: {
  //     url,
  //     title,
  //     description
  //   },
  // }
  // profile: profile._id pro ktery vytvorit novy draft
  // user: user who's scheduling this post
  // source: WEB || EXTENSION || MOBILE || DESKTOP
  // }
  draft(data) {
    const { user, source } = data;
    const { link, image } = data.post;
    const profileId = data.profile;
    const message = data.post.message || '';
    const html = this._textMessageToHtml(message);

    if (!message && !image && !link) {
      throw new Error('Post is empty');
    }

    if (message.length > this.maxMessageLength) {
      throw new Error(`Message is too long, ${message.length}>${this.maxMessageLength}`);
    }

    return this._fetchProfile(user, profileId).then(profile => {
      const isPermited =
        profile &&
        (user.isProfileOwnerOrManager(profile) ||
          user.isProfileContributor(profile) ||
          profile.accounts.reduce((r, account) => r || user.isAccountManager(account), false));

      if (!isPermited) {
        throw new Error('Access to profile not allowed');
      }

      return this._prepareAttachments(user, profile, link, image).then(attachments => {
        const post = new Post({
          html,
          source,
          attachments,
          pid: profile._id,
          createdBy: user._id
        });
        return post.save();
      });
    });
  }

  // data: {
  // post: {
  //   message,
  //   image: image url, image will be downloaded and stored in GCS bucket fpmi
  //   link: {
  //     url,
  //     title,
  //     description
  //   },
  // }
  // type: NOW || MANUAL || FIRSTBEST || NEXTBEST
  // accounts: [profile.accounts._id.toString(), ...]
  // publishAt: publish post at
  // user: user who's scheduling this post
  // source: WEB || EXTENSION || MOBILE || DESKTOP
  // reshare: {
  //   id // reshared google activity id
  // }
  // }
  create(data) {
    const { type, user, source, reshare, accounts } = data;
    const { link, image } = data.post;
    const message = data.post.message || '';
    const html = this._textMessageToHtml(message);

    if (!accounts || !accounts.length) {
      throw new Error('No queue defined');
    }

    if (!message && !image && !link) {
      throw new Error('Post is empty');
    }

    if (message.length > this.maxMessageLength) {
      throw new Error('Message is too long');
    }

    const isSchedule = type === 'MANUAL' || type === 'FIRSTBEST' || type === 'NEXTBEST';

    const publishAt = (data.publishAt && moment.utc(data.publishAt)) || null;
    const now = moment.utc();

    // determine list of affected profiles
    return Profile.distinct('_id', { 'accounts._id': { $in: accounts } }).then(profilesId => {
      // fetch profiles
      return Promise.map(profilesId, profileId => this._fetchProfile(user, profileId), { concurrency: 4 }).then(
        fullProfiles => {
          // filter out unused accounts
          const profilesWithAccounts = fullProfiles
            .map(profile => ({
              profile,
              accountsId: profile.accounts.map(a => a._id.toString()),
              accounts: profile.accounts.filter(
                account =>
                  !profile.isAccountBlocked(account) &&
                  accounts.indexOf(account._id.toString()) > -1 &&
                  (user.isProfileOwnerOrManager(profile) || user.isAccountManager(account))
              )
            }))
            .filter(i => i.accounts.length);

          const process = profilesWithAccounts => {
            // create array of destination accounts
            const processAccounts = profilesWithAccounts
              .filter(i => i.accounts.length)
              .map(r =>
                r.accounts.map(account => ({
                  account,
                  profile: r.profile,
                  accountsId: r.accountsId
                }))
              )
              .reduce((r, v) => r.concat(v), []);

            return this._prepareAttachments(user, null, link, image).then(attachments => {
              // create posts
              return Promise.map(
                processAccounts,
                ({ profile, account, accountsId }) => {
                  const isGoogle = account.network === Types.network.google.code;
                  const isReshare = isGoogle && reshare && reshare.id;
                  const processor = `${isReshare ? 'reshare' : 'post'}:${Types.networkTypeName(
                    account.network
                  )}:${Types.accountTypeName(account.account)}`;
                  const parentAccount =
                    account.parentUid &&
                    _.findWhere(profile.accounts, { network: account.network, uid: account.parentUid });
                  const post = new Post({
                    html,
                    source,
                    processor,
                    attachments,
                    aid: account._id,
                    pid: profile._id,
                    uid: account.uid,
                    parentAid: parentAccount && parentAccount._id,
                    parentUid: parentAccount && parentAccount.uid,
                    categoryId: account.category && account.category.id,
                    accountCode: Types.createCode(account.network, account.account),
                    destinations: isGoogle ? [{ id: 'public-circle', type: 'circle' }] : [],
                    blockedAt: account.state === States.account.enabled.code ? null : now.toDate(),
                    createdBy: user._id
                  });

                  if (isReshare) {
                    post.reshare = {
                      is: true,
                      id: reshare.id
                    };
                  }

                  if (
                    post.attachments &&
                    post.attachments.link &&
                    post.attachments.link.short &&
                    post.attachments.link.short.aid
                  ) {
                    post.attachments.link.short.aid = new ObjectId(post.attachments.link.short.aid);
                  }

                  if (account.network === Types.network.google.code) {
                    post.appendNoShare =
                      _.chain(profile.accountPossibleRouteDestinations(account))
                        .uniq()
                        .intersection(accountsId)
                        .value().length > 0;
                  }

                  if (post.isPublishableOnlyByExtension) {
                    post.extension.publishers = profile.usersWhoCanPublishToAccount(account);
                  } else {
                    delete post.extension;
                  }

                  switch (type) {
                    case 'FIRSTBEST':
                    case 'NEXTBEST':
                      try {
                        return this._prepareScheduleTime(account, post, type).then(() => post.save());
                      } catch (error) {
                        log.error('Failed to prepare schedule time', {
                          type,
                          accountId: account._id.toString(),
                          error
                        });
                        post.publishAt = now.clone();
                        post.state = States.post.scheduledByUser.code;
                      }
                      break;
                    case 'NOW':
                    case 'MANUAL':
                      if (publishAt && publishAt.isBefore(now)) {
                        post.publishAt = now.clone();
                      } else {
                        post.publishAt = (publishAt || now).toDate();
                      }
                      post.state = States.post.scheduledByUser.code;
                      break;
                  }

                  return post.save();
                },
                { concurrency: 4 }
              ).then(posts => {
                User.update({ _id: user._id }, { $set: { 'extension.lastAccounts': accounts } }, error => {
                  if (error) {
                    log.error('Failed to save destination accounts of the last share', {
                      userId: user._id.toString(),
                      accounts,
                      error
                    });
                  }
                });

                return posts;
              });
            });
          };

          // TODO v budoucnosti ukoncit publikovani a odeslat klientovi zpet seznam uctu pro ktere neni mozne prispevek naplanovat
          // filter out accounts with queue size limit reached
          if (isSchedule) {
            return Promise.map(profilesWithAccounts, r => this._checkQueueLimit(r), { concurrency: 4 }).then(process);
          }
            return process(profilesWithAccounts);
        }
      );
    });
  }

  _fetchAndStoreImage(user, profile, url) {
    return image.fetchAndStoreImage({ url, user, pid: profile && profile._id });
  }

  _prepareAttachments(user, profile, link, imageUrl) {
    let attachments;

    if (link) {
      link.domain = link.domain || urlParser.parse(link.url).hostname;
      attachments = { link };
    }

    if (imageUrl) {
      return this._fetchAndStoreImage(user, profile, imageUrl).then(photo => {
        if (link) {
          link.photo = photo;
        } else {
          attachments = { photo };
        }
        return Promise.resolve(attachments);
      });
    }

    return Promise.resolve(attachments);
  }

  _checkQueueLimit(r) {
    return Promise.filter(r.accounts, a => this._checkAccountQueueLimit(r.profile, a), { concurrency: 4 }).then(
      accounts => {
        r.accounts = accounts;
        return r;
      }
    );
  }

  _checkAccountQueueLimit(profile, account) {
    return new Promise((resolve, reject) => {
      const networkName = Types.networkTypeName(account.network);
      const accountName = Types.accountTypeName(account.account);
      const use = profile.use;
      const network = (use && use.network && networkName && use.network[networkName]) || null;
      const globalLimit = use && use.maxQueueSizePerAccount;
      const networkLimit = (network && network.maxQueueSizePerAccount) || null;
      const accountLimit =
        (network && accountName && network[accountName] && network[accountName].maxQueueSizePerAccount) || null;
      const maxQueueSize = accountLimit || networkLimit || globalLimit || -1;

      if (maxQueueSize <= 0) {
        return resolve(maxQueueSize < 0, maxQueueSize);
      }

      Post.count(
        {
          aid: account._id,
          state: { $lt: States.post.draft.code }
        },
        (error, count) => {
          if (error) {
            log.error('Failed to determine account queue size', {
              accountId: account._id.toString(),
              profileId: profile._id.toString(),
              error
            });
            return reject(error);
          }
          resolve(maxQueueSize > count, maxQueueSize, count);
        }
      );
    });
  }

  _prepareScheduleTime(account, post, type) {
    return new Promise((resolve, reject) => {
      const getTime = this.postScheduler[type === 'NEXTBEST' ? 'nextTime' : 'firstTime'].bind(this.postScheduler);
      getTime(account._id, (err, scheduledTime) => {
        if (err || !scheduledTime) {
          return reject(
            err || { error: { message: `Scheduled time(${type}) for queue ${account._id.toString()} not defined!` } }
          );
        }
        post.publishAt = scheduledTime.toDate();
        post.state = States.post.scheduledByScheduler.code;
        resolve(post);
      });
    });
  }

  _fetchProfile(user, profileId) {
    return new Promise((resolve, reject) => {
      auth.rest.everyProfileTeamMember(
        user,
        profileId,
        (user, profile) => resolve(profile),
        reject,
        '_id use members routes accounts._id accounts.members accounts.network accounts.account accounts.uid accounts.parentUid accounts.category accounts.state'
      );
    });
  }

  _textMessageToHtml(msg) {
    return (`<p>${msg}</p>`).replace(/\n\n/g, '</p><p></p><p>').replace(/([^\n]*)\n/g, '$1</p><p>');
  }
}

module.exports = PostManager;
