import config from '@fpm/config';
import { createLogger, format, transports } from 'winston';

const secureObject = (obj, depth) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  const sobj = {};
  const d = depth || 0;
  if (d >= 5) {
    return sobj;
  }
  let p;
  let pL;
  const ks = Object.keys(obj);
  for (let i = 0; i < ks.length; i++) {
    p = ks[i];
    pL = p.toLowerCase();
    if (pL.indexOf('token') > -1 || pL.indexOf('secret') > -1) {
      sobj[p] = '__SECURED__';
    } else if (typeof obj[p] === 'object') {
      sobj[p] = secureObject(obj[p], d + 1);
    } else {
      sobj[p] = obj[p];
    }
  }
  return sobj;
};

const SPLAT = Symbol.for('splat');

const rewriterSecure = format(info => {
  if (info && info[SPLAT]) {
    info[SPLAT] = secureObject(info[SPLAT]);
  }
  return info;
});

export const log = new createLogger({ 
  format: format.combine(
    format.timestamp(),
    rewriterSecure(),
    format.json()
  ),
  transports: [new transports.Console({ 
    level: config.get('log:console:level') || 'debug',
    stderrLevels: ['error'] 
  })] 
});

log.errorAndThrow = (error, ...args) => {
  log.error(error, ...args);
  throw error instanceof Error ? error : new Error(error);
};

if (config.get('isProd')) {
  process.on('uncaughtException', err => {
    console.log('error: uncaughtException', new Date(), err.message, err.stack);

    log.error('uncaughtException', { message: err.message, stack: err.stack });

    if (config.get('defaults:onUncaughtException:exit')) {
      process.exit(config.get('defaults:onUncaughtException:code'));
    }
  });
}

if (!config.get('isTest')) {
  log.info(`Start ${config.get('name')}:${config.get('version')}`, {
    env: config.get('env'),
    node: process.versions.node
  });
}

export default log;
