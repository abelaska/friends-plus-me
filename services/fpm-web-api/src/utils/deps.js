// @flow
/* eslint no-multi-assign: "off", no-unused-vars: "off" */
const config = require('@fpm/config');
const moment = require('moment-timezone');
const { CacheRedis } = require('@fpm/cache-redis');
const { OAuthTokenCryptor } = require('@fpm/token');
const { Hydra } = require('@fpm/hydra');
const { PostScheduler } = require('@fpm/post');
const { AssetsManager } = require('@fpm/assets');
const { AccountManager } = require('@fpm/accounts');
const { QueueManager } = require('@fpm/queue');
const { Auth0Mgmt } = require('@fpm/auth0');

type CreateQueueManagerArgs = {
  constArgs?: Object,
  now?: string,
  randomize?: boolean
};

const initDeps = () => {
  const cryptor = new OAuthTokenCryptor();
  const cache = new CacheRedis({ cryptor, config });
  const hydra = new Hydra({ cache });
  const auth0 = new Auth0Mgmt({ cache });
  const postScheduler = new PostScheduler();
  const assetsManager = new AssetsManager({
    imageProxyConfig: config.get('image:proxy')
  });
  const accountManager = new AccountManager();

  let queueManager;
  let createQueueManager;

  if (config.get('isTest')) {
    createQueueManager = ({ constArgs = { redisConfig: {} }, now, randomize = false }: CreateQueueManagerArgs = {}) => {
      class QueueManagerTesting extends QueueManager {
        _now: ?string;
        constructor(...args: Array<any>) {
          super(...args);
          this._now = now;
        }
        setNow(str: string) {
          this._now = str;
        }
        now() {
          return moment.utc(this._now);
        }
        random(num: number) {
          return randomize ? super.random(num) : 0;
        }
      }
      return new QueueManagerTesting(constArgs);
    };
    queueManager = createQueueManager();
  } else {
    queueManager = new QueueManager({ config });
  }

  return {
    auth0,
    cryptor,
    cache,
    hydra,
    postScheduler,
    assetsManager,
    accountManager,
    queueManager,
    createQueueManager
  };
};

module.exports.initDeps = initDeps;
