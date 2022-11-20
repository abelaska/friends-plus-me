import nconf from 'nconf';
import appRootDir from 'app-root-dir';
import { realpathSync, readFileSync } from 'fs';
import path from 'path';
import { processEnvDir } from './env';
import { nconfFile } from './file';

const appDir = realpathSync(path.join(appRootDir.get(), '..'));
const confDir = `${appDir}/conf`;
const env = (process.env.NODE_ENV || 'development').toLowerCase();
const isDev = env === 'development';
const isTest = env === 'test';
const isStag = env === 'staging';
const isProd = env === 'production' || isStag;

const { name, version } = JSON.parse(readFileSync(`${appDir}/package.json`, { encoding: 'utf-8' }));

processEnvDir(process.env.ENV_DIR || '/etc/env');

nconf
  .env({ separator: '__' })
  .argv()
  .use('memory')
  .defaults(nconfFile(`${confDir}/config-defaults.toml`))
  .overrides(nconfFile(`${confDir}/config-${env}.toml`));

nconf.set('appDir', appDir);
nconf.set('env', env);
nconf.set('isTest', isTest);
nconf.set('isStag', isStag);
nconf.set('isStaging', isStag);
nconf.set('isProd', isProd);
nconf.set('isProduction', isProd);
nconf.set('isDev', isDev);
nconf.set('isDevelopment', isDev);
nconf.set('name', name);
nconf.set('version', version);
nconf.set('instance-id', isDev ? 'dev' : require('os').hostname());

export default nconf;
