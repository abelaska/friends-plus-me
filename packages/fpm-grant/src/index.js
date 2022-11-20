// @flow
import moment from 'moment';
import Promise from 'bluebird';
import config from '@fpm/config';
import log from '@fpm/logging';
import { Types } from '@fpm/constants';
import { ObjectId, Profile, AccountBlacklist, Audit } from '@fpm/db';
import allProviders from './providers';
import { rescheduleAccount } from './tools';

export const providers = allProviders;

const Grant = require('grant').express();

// /social/connect/:provider =>
// /social/connect/:provider/callback
// /social/callback

// http://localhost:9000/social/connect/facebook/callback
// http://app.friendsplus.me/social/connect/facebook/callback
// http://staging.friendsplus.me/social/connect/facebook/callback

const accountUrl = ({ pid, aid }) => `${config.get('http:ui:redirect:url')}/teams/${pid || '0'}/queues/${aid || 'add'}`;

const addAccountUrl = ({ pid, sid, provider }) =>
  `${config.get('http:ui:redirect:url')}/teams/${pid || '0'}/queues/add${provider ? `/${provider}` : ''}${
    provider && sid ? `/${sid}` : ''
  }`;

const returnResult = ({
  isReauth,
  /* isNewProfile, */
  message,
  gs,
  result,
  sid,
  aid,
  pid,
  provider,
  redir,
  req,
  res,
  type
}: Object) => {
  if (redir) {
    req.notify(type, message);
    const url = isReauth || provider === 'twitter' ? accountUrl({ pid, aid }) : addAccountUrl({ pid, sid, provider });
    return res.redirect(url);
  }

  result.state = gs;

  const data = JSON.stringify(result);
  const origin = config.get('http:ui:url');
  const html = `<html><body><script>window.opener.postMessage(${data},"${origin}");</script></body></html>`;
  return res.send(html);
};

const returnSuccess = (errDeps: Object) => returnResult({ ...errDeps, type: 'success' });

const returnError = ({ message, ...errDeps }: Object) =>
  returnResult({ ...errDeps, message, type: 'error', result: { error: { message } } });

const wrap = fn => (...args) => fn(...args).catch(args[2]);

const isFeatureAllowedForTeam = (team, featureName) => {
  const f = team.use[featureName];
  if (f === true) {
    return true;
  }
  if (!f) {
    return false;
  }
  if (f instanceof Date) {
    return f.valueOf() > new Date().valueOf();
  }
  return false;
};

const isFeatureDisallowedForTeam = (team, featureName) => !isFeatureAllowedForTeam(team, featureName);

export default ({
  router,
  assetsManager,
  accountManager,
  queueManager,
  googleTokens,
  tokenRequired,
  mobileProxyClient
}: Object) => {
  const grant = new Grant(config.get('grant'));

  const addProfile = (pid, profile) => {
    return new Promise((resolve, reject) => {
      accountManager.addProfile(
        pid,
        profile,
        (error, socialProfileId) => (error && reject(error)) || resolve(socialProfileId)
      );
    });
  };

  const addAccount = (user, profile, account) => {
    return new Promise((resolve, reject) => {
      accountManager.addAccount(
        profile,
        account,
        user,
        (error, newAccount) => (error && reject(error)) || resolve(newAccount)
      );
    });
  };

  const isAccountBlacklisted = ({ provider, uid }) => {
    return new Promise((resolve, reject) => {
      AccountBlacklist.check(provider, uid, error => {
        if (error) {
          if (error.code === 'account_blacklisted') {
            return resolve(true);
          }
          return reject(error);
        }
        return resolve(false);
      });
    });
  };

  const secureProfile = profile => {
    if (!profile) {
      return profile;
    }
    const p = profile.toObject();
    p.__v = undefined;
    p.profiles =
      (p.profiles &&
        p.profiles.map(sp => {
          sp.oauth = undefined;
          return sp;
        })) ||
      [];
    p.accounts =
      (p.accounts &&
        p.accounts.map(a => {
          a.token = undefined;
          a.secret = undefined;
          a.tagline = undefined;
          return a;
        })) ||
      [];
    return p;
  };

  // /social/callback
  router.get(
    config.get('grant:server:callback'),
    tokenRequired,
    wrap(async (req, res) => {
      const { aid, pid, gs, redir = false } = req.session.grantCtx || {};
      const { response, provider } = req.session.grant || {};

      delete req.session.grant;
      delete req.session.grantCtx;

      const raw = response && response.raw;
      const user = req.user;
      const errorDeps = {
        gs,
        redir,
        aid,
        pid,
        provider,
        req,
        res,
        isReauth: !!aid,
        isNewProfile: false,
        sid: null
      };

      if (!user) {
        return returnError({ ...errorDeps, message: 'Unknown user!' });
      }
      if (!raw || !provider) {
        return returnError({ ...errorDeps, message: 'Invalid grant!' });
      }

      const profile = await Profile.findById(pid).exec();
      if (!profile) {
        return returnError({ ...errorDeps, message: 'Team not found!' });
      }
      if (!user.canManageProfile(profile)) {
        return returnError({ ...errorDeps, message: 'Permission denied!' });
      }

      const now = moment.utc().toDate();
      const token = response.access_token;
      const secret = response.refresh_token || response.access_secret;
      const expiresIn = (raw && raw.expires_in) || null;
      const expiresAt =
        (expiresIn &&
          moment
            .utc()
            .add(expiresIn, 'seconds')
            .toDate()) ||
        null;

      // ziskani informaci o uctu za pomoci nove ziskaneho access tokenu
      const detail = await providers[provider].normalizedUserDetail({ token, secret });
      const { uid } = detail;

      // check blacklist
      const isBlacklisted = await isAccountBlacklisted({ provider, uid });
      if (isBlacklisted) {
        return returnError({ ...errorDeps, message: 'Account is blacklisted!' });
      }

      // store avatar
      if (detail.image && config.get('isProduction')) {
        try {
          const avatarAsset = await assetsManager.fetchAndStoreAvatar({
            url: detail.image,
            user,
            pid
          });
          detail.image = avatarAsset.picture.proxy;
        } catch (e) {
          log.error('Failed to fetch and store avatar', {
            url: detail.image,
            userId: user && user._id && user._id.toString(),
            pid: pid && pid.toString(),
            error: e.toString(),
            stack: e.stack
          });
        }
      }

      // store / update social profile
      const socialProfile = {
        uid,
        email: detail.email,
        image: detail.image,
        name: detail.name,
        url: detail.url,
        meta: detail.meta,
        connectedAt: now,
        network: Types.network[provider].code,
        account: Types.account.profile.code,
        oauth: { token, secret, expiresAt }
      };

      // if (provider === 'linkedin') {
      //   console.log('grant detail', pid && pid.toString(), JSON.stringify(detail));
      //   console.log('grant socialProfile', pid && pid.toString(), JSON.stringify(socialProfile));
      // }

      errorDeps.isNewProfile =
        profile.profiles.filter(p => p.uid === socialProfile.uid && p.network === socialProfile.network).length === 0;

      const socialProfileId = await addProfile(pid, socialProfile);

      // if (provider === 'linkedin') {
      //   console.log('grant socialProfileId', pid && pid.toString(), socialProfileId);
      // }

      /* $FlowFixMe */
      socialProfile._id = socialProfileId;

      const sid = socialProfileId.toString();
      errorDeps.sid = sid;

      // reschedule accounts posts
      const rescheduleAccounts = profile.accounts.filter(
        a => a.network === socialProfile.network && (a.parentUid === socialProfile.uid || a.uid === socialProfile.uid)
      );
      // if (provider === 'linkedin') {
      //   console.log('grant rescheduleAccounts', pid && pid.toString(), rescheduleAccounts.map(a => a._id.toString()));
      // }
      if (rescheduleAccounts.length) {
        await Promise.map(rescheduleAccounts, rescheduleAccount, { concurrency: 8 });
      }

      await providers[provider].afterProfileUpdated({
        user,
        profile,
        socialProfile,
        googleTokens,
        queueManager,
        accountManager
      });

      // fresh and secure list of profiles and accounts
      const securedProfile = secureProfile(await Profile.findById(pid, '_id profiles routes accounts').exec());
      const result = {
        data: {
          pid,
          sid,
          aid,
          routes: (securedProfile && securedProfile.routes) || [],
          accounts: (securedProfile && securedProfile.accounts) || [],
          profiles: (securedProfile && securedProfile.profiles) || []
        }
      };

      return returnSuccess({
        ...errorDeps,
        result,
        message: `Account successfully ${errorDeps.isNewProfile ? '' : 're-'}authenticated.`
      });
    })
  );

  const storePid = wrap(async (req, res, next) => {
    if (req.query.code || !req.query.pid) {
      return next();
    }

    if (req.session.grantCtx) {
      delete req.session.grantCtx;
    }

    const {
      user,
      query: { aid, pid, gs }
    } = req;
    const redir = req.query.redir === '1';

    delete req.query.aid;
    delete req.query.pid;
    delete req.query.gs;
    delete req.query.redir;
    delete req.query.fpmetoken;

    if (redir) {
      // clear notify message
      req.notify();
    }

    if (!pid) {
      return returnError({ gs, redir, aid, pid, req, res, message: 'Team not specified!' });
    }

    // validate that profile exists and user is allowed to add accounts
    const profile = await Profile.findById(pid, '_id members accounts._id').exec();
    if (!profile) {
      return returnError({ gs, redir, aid, pid, req, res, message: 'Team not found!' });
    }
    if (!user.canManageProfile(profile)) {
      return returnError({ gs, redir, aid, pid, req, res, message: 'Access to team not allowed!' });
    }
    if (aid) {
      const accounts = profile.accounts.filter(a => a._id.toString() === aid);
      if (!accounts.length) {
        return returnError({ gs, redir, aid, pid, req, res, message: 'Account not found!' });
      }
    }

    req.session.grantCtx = { aid, pid, redir, gs };

    return next();
  });

  // /social/connect/:provider?pid=${pid}&redir={1|0}&gs={...}
  router.use(config.get('grant:server:path'), tokenRequired, storePid, (req, res, next) => {
    try {
      grant(req, res, next);
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/1/team/:profile/accounts',
    tokenRequired,
    wrap(async (req, res) => {
      if (!req.body.account) {
        return res.status(400).send({ error: { message: 'Invalid account' } });
      }

      const pid = req.params.profile;
      const user = req.user;
      const profile = await Profile.findById(pid).exec();
      if (!profile) {
        return res.status(400).send({ error: { message: 'Team not found!' } });
      }
      if (!user.canManageProfile(profile)) {
        return res.status(400).send({ error: { message: 'Permission denied' } });
      }

      // { uid, sid, account, token, image, name, url, category: { id, name } } = req.body.account;
      const { uid, sid, network, account } = req.body.account;
      const isInstagram = network === Types.network.instagram.code;

      if (isInstagram && isFeatureDisallowedForTeam(profile, 'instagram')) {
        return res.status(400).send({ error: { message: 'Instagram not enabled for this team' } });
      }

      const sps = profile.profiles.filter(p => p._id.toString() === sid);
      let socialProfile = sps.length && sps[0];
      if (!socialProfile) {
        if (isInstagram) {
          socialProfile = {
            network,
            uid,
            image: req.body.account.image,
            name: req.body.account.name,
            url: req.body.account.url,
            connectedAt: new Date(),
            account: Types.account.profile.code,
            oauth: { token: req.body.account.token }
          };
        } else {
          return res.status(400).send({ error: { message: 'Social account not found.' } });
        }
      }

      const provider = Types.networkTypeName(socialProfile.network);
      const accountType = Types.accountTypeName(account);

      // check blacklist
      const isBlacklisted = await isAccountBlacklisted({ provider, uid });
      if (isBlacklisted) {
        return res.status(400).send({ error: { message: 'Account is blacklisted!' } });
      }

      const newAccountData = await providers[provider].prepareNewAccount({
        user,
        profile,
        socialProfile,
        googleTokens,
        queueManager,
        accountManager,
        assetsManager,
        account: req.body.account
      });

      let newAccount = profile.findAccountByAccount(newAccountData);
      if (newAccount) {
        // await Profile.update({ 'accounts._id': newAccount._id }, { $set: { 'accounts.$': newAccount } });
        await providers[provider].afterAccountUpdated({
          user,
          profile,
          account: newAccount,
          socialProfile,
          accountManager,
          assetsManager,
          queueManager,
          googleTokens
        });
      } else {
        // check limits
        if (profile.isAnotherAccountDisallowed) {
          return res
            .status(400)
            .send({ error: { message: "You've reached the limit for number of connected queues." } });
        }
        if (profile.isAnotherAccountDisallowedByTypeName(provider)) {
          return res
            .status(400)
            .send({ error: { message: `You've reached the limit for number of connected ${provider} queues.` } });
        }
        if (profile.isAnotherAccountDisallowedByTypeName(provider, accountType)) {
          return res.status(400).send({
            error: {
              message: `You've reached the limit for number of connected ${provider} queues of type ${accountType}.`
            }
          });
        }

        newAccountData._id = new ObjectId();
        newAccount = await addAccount(user, profile, newAccountData);
        await providers[provider].afterAccountCreated({
          user,
          profile,
          account: newAccount,
          socialProfile,
          accountManager,
          queueManager,
          googleTokens
        });

        Audit.account('account:added', user._id, profile._id, newAccount._id, {
          account: newAccount.account,
          network: newAccount.network
        });
      }

      const securedProfile = secureProfile(await Profile.findById(pid, '_id profiles routes accounts').exec());
      const result = {
        pid,
        sid,
        aid: newAccount._id.toString(),
        routes: (securedProfile && securedProfile.routes) || [],
        accounts: (securedProfile && securedProfile.accounts) || [],
        profiles: (securedProfile && securedProfile.profiles) || []
      };
      return res.json(result);
    })
  );

  // body: { login, password, securityCode }
  router.post(
    '/1/team/:teamId/instagram/connect',
    tokenRequired,
    wrap(async (req, res) => {
      const { teamId } = req.params || {};
      const { login, password, securityCode } = req.body || {};
      if (!login || !password) {
        return res.status(400).json({ error: { message: 'Invalid credentials' } });
      }

      const user = req.user;
      const team = await Profile.findById(teamId).exec();
      if (!team) {
        return res.status(400).send({ error: { message: 'Team not found!' } });
      }
      if (!user.canManageProfile(team)) {
        return res.status(400).send({ error: { message: 'Permission denied' } });
      }
      if (isFeatureDisallowedForTeam(team, 'instagram')) {
        return res.status(400).send({ error: { message: 'Instagram not enabled for this team' } });
      }

      let reply;
      try {
        const userEnc = await mobileProxyClient.encryptUser({ login, password });
        const securityCodeEnc = await mobileProxyClient.encryptSecurityCode(securityCode);
        reply = await mobileProxyClient.instagramUserVerify({ login, user: userEnc, securityCode: securityCodeEnc });
      } catch (error) {
        log.error('Failed to verify instagram credentials', { teamId, login, error: error.stack });
        return res.status(500).json({ error: { message: 'Instagram credentials verification failed' } });
      }

      const { error, info, ...account } = reply;
      const { code } = error || {};
      const isInvalidPassword = code === 'INVALID_CREDENTIALS';
      const isSuspiciousLoginAttempt = code === 'SUSPICIOUS_LOGIN_ATTEMPT';
      if (isInvalidPassword) {
        return res.status(400).json({ error: { code, message: 'Invalid credentials' } });
      }
      if (isSuspiciousLoginAttempt) {
        return res.status(400).json({ error: { code, message: 'Credentials verification interrupted' } });
      }
      if (error) {
        log.warn('Instagram credentials invalid', { error });
        return res.status(500).json({ error: { code, message: 'Authentication failed. Please try again.' } });
      }
      if (info) {
        const minRequiredPosts = 5;
        const posts = isNaN(info.posts) ? -1 : parseInt(info.posts, 10);
        if (posts < minRequiredPosts) {
          return res.status(400).json({
            error: {
              code: 'NOT_ENOUGH_PUBLISHED_POSTS',
              message: `The Instagram account has to has at least ${minRequiredPosts} posts.`
            }
          });
        }

        const enabled2fa = !!info['2fa'];
        if (enabled2fa) {
          return res.status(400).json({
            error: {
              code: '2FA_NOT_SUPPORTED',
              message: 'Instagram accounts with two-factor authentication enabled are not supported.'
            }
          });
        }
      }

      const { name, url, avatar, uid, token } = account;

      return res.json({ queue: { name, url, avatar, uid, token } });
    })
  );

  return router;
};
