// @flow
import Promise from 'bluebird';
import { Types } from '@fpm/constants';
import { FetchAccount, Profile } from '@fpm/db';

type ProfileManagerConstructor = {
  queueManager: Object
};

class ProfileManager {
  queueManager: Object;

  constructor({ queueManager }: ProfileManagerConstructor = {}) {
    this.queueManager = queueManager;
  }

  blockLastActiveAccount(profile: Profile, networkCode: ?number, accountCode: ?number) {
    const accounts = profile.accounts.filter(a => {
      if (networkCode !== undefined && networkCode !== null && a.network !== networkCode) {
        return false;
      }
      if (accountCode !== undefined && accountCode !== null && a.account !== accountCode) {
        return false;
      }
      return !profile.isAccountBlocked(a);
    });

    const account = accounts.length > 0 && accounts[accounts.length - 1];
    if (account) {
      profile.blockAccount(account);
    }
    return account;
  }

  blockLastActiveAccountOfType(profile: Profile, networkCode: ?number, accountCode: ?number) {
    return this.blockLastActiveAccount(profile, networkCode, accountCode);
  }

  blockLastActiveAccountOfNetwork(profile: Profile, networkCode: ?number) {
    return this.blockLastActiveAccount(profile, networkCode);
  }

  unblockFirstBlockedAccount(profile: Profile) {
    const limits = (profile.use ? profile.use.network : null) || {};

    const accounts = profile.accounts.filter(a => profile.isAccountBlocked(a));
    if (!accounts.length) {
      return;
    }

    let unblock;
    let account;
    let networkName;
    let accountName;
    let networkLimit;
    let accountLimit;

    for (let i = 0; i < accounts.length; i++) {
      unblock = true;
      account = accounts[i];
      accountName = Types.accountTypeName(account.account);
      networkName = Types.networkTypeName(account.network);
      networkLimit = limits[networkName] || {};

      if (networkLimit) {
        accountLimit = networkLimit[accountName] || {};
        /* jshint -W041 */
        if (this.isMetricLimited(accountLimit)) {
          unblock = profile.countActiveAccountsByType(account.network, account.account) < accountLimit.limit;
        }
        if (unblock && this.isMetricLimited(networkLimit)) {
          unblock = profile.countActiveAccountsByNetwork(account.network) < networkLimit.limit;
        }
      }

      if (unblock) {
        profile.enableAccount(account);
        return account;
      }
    }
  }

  isLimited(limit: ?number) {
    return limit !== undefined && limit !== null && limit !== -1;
  }

  isMetricLimited(metricLimit: ?Object) {
    return metricLimit && this.isLimited(metricLimit.limit);
  }

  isGoogleSource(account: ?Object) {
    return (
      account &&
      account.network === Types.network.google.code &&
      (account.account === Types.account.profile.code || account.account === Types.account.page.code)
    );
  }

  async updateAccountsByUseLimits(profile: Profile) {
    // pokud se jedna subscription FREE planu tak zmenit vsem evidovanym uctum shortener na fplusme
    const { accounts, use } = profile;
    if (!use || !accounts || !accounts.length) {
      return profile.save();
    }

    const enableAccounts = [];
    const disableAccounts = [];
    const filterEnabledAccount = account => account && enableAccounts.push(account);
    const filterDisabledOrBlockedAccount = account => account && disableAccounts.push(account);

    let network;
    let networkCode;
    let account;
    let accountCode;

    Object.keys(use.network || {}).forEach(networkName => {
      network = use.network[networkName];
      networkCode = Types.network[networkName].code;

      // nejdriv omezeni podle typu sitoveho uctu
      Object.keys(network).forEach(accountName => {
        if (Types.account[accountName]) {
          account = network[accountName];
          accountCode = Types.account[accountName].code;

          if (this.isMetricLimited(account)) {
            while (profile.countActiveAccountsByType(networkCode, accountCode) > account.limit) {
              filterDisabledOrBlockedAccount(this.blockLastActiveAccountOfType(profile, networkCode, accountCode));
            }
          }
        }
      });

      // pak omezeni poctu samotneho poctu uctu dane site
      if (this.isMetricLimited(network)) {
        while (profile.countActiveAccountsByNetwork(networkCode) > network.limit) {
          filterDisabledOrBlockedAccount(this.blockLastActiveAccountOfNetwork(profile, networkCode));
        }
      }
    });

    const maxAccounts = this.isLimited(use.maxAccounts) ? use.maxAccounts : Number.MAX_VALUE;
    const blockedAccounts = profile.accounts.reduce((r, a) => r + (profile.isAccountBlocked(a) ? 1 : 0), 0);
    const activeAccounts = profile.accounts.length - blockedAccounts;

    if (activeAccounts > maxAccounts) {
      // nejake ucty zablokovat
      let blockCount = activeAccounts - maxAccounts;
      while (blockCount-- > 0) {
        filterDisabledOrBlockedAccount(this.blockLastActiveAccount(profile));
      }
    } else if (activeAccounts < maxAccounts && blockedAccounts > 0) {
      // nejake ucty muzeme odblokovat
      let unblockCount = maxAccounts - activeAccounts;
      if (unblockCount > blockedAccounts) {
        unblockCount = blockedAccounts;
      }
      while (unblockCount-- > 0) {
        filterEnabledAccount(this.unblockFirstBlockedAccount(profile));
      }
    }

    await profile.save();

    await Promise.all([
      Promise.map(
        disableAccounts.filter(a => a.ng),
        acc => this.queueManager.blockQueue({ queueId: acc._id, inactiveReason: 'Blocked due to team limits change' }),
        { concurrency: 8 }
      ),
      Promise.map(enableAccounts.filter(a => a.ng), acc => this.queueManager.enableQueue({ queueId: acc._id }), {
        concurrency: 8
      }),
      Promise.map(
        disableAccounts.filter(a => this.isGoogleSource(a)),
        acc =>
          // disable fetch for account
          FetchAccount.update(
            { _id: acc._id },
            { $set: { nextFetch: null, refreshAt: null, fetchUpdatedAt: new Date() } }
          ),
        { concurrency: 8 }
      ),
      Promise.map(
        enableAccounts.filter(a => this.isGoogleSource(a)),
        acc =>
          // enable fetch for account
          FetchAccount.update(
            { _id: acc._id },
            {
              $set: {
                fetchTries: 0,
                nextFetch: new Date(),
                prevFetch: new Date(),
                fetchUpdatedAt: new Date()
              },
              $unset: { refreshAt: '' }
            }
          ),
        { concurrency: 8 }
      )
    ]);
  }
}

export default ProfileManager;
