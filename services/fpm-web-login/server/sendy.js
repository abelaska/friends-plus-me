const rp = require('request-promise');
const log = require('@fpm/logging').default;
const config = require('@fpm/config');

const isEnabled = config.get('sendy:enabled');

const subscribeList = async ({ listId, listName, user }) => {
  if (!isEnabled) {
    return log.debug(`Skipped, subscribe ${user.email} to Sendy newsletter ${listName || listId}`);
  }

  const tm = new Date();
  const rsp = await rp({
    method: 'POST',
    url: config.get('sendy:subscribeUrl'),
    encoding: 'utf-8',
    timeout: config.get('sendy:timeout') || 30000,
    headers: {
      Accept: '*/*',
      'User-Agent': `fpm-login/${config.get('version')}`
    },
    form: {
      list: listId,
      email: user.email,
      name: user.name,
      FirstName: user.fname,
      LastName: user.lname,
      Locale: user.locale,
      boolean: true
    },
    resolveWithFullResponse: true
  });

  const isOk = rsp && (rsp.statusCode === 200 || rsp.statusCode === 201);
  if (isOk) {
    log.info(`Sendy list ${listName || listId} subscribed to ${user.email}`, {
      time: new Date() - tm,
      statusCode: rsp.statusCode,
      body: rsp.body
    });
  } else {
    log.error(`Failed to subscribe Sendy list ${listName || listId} to ${user.email}`, {
      time: new Date() - tm,
      statusCode: rsp.statusCode,
      error: rsp.body
    });
  }

  return isOk ? rsp.body : null;
};
module.exports.subscribeList = subscribeList;

const sendySubscribeNewUser = async user =>
  subscribeList({ user, listName: 'signup', listId: config.get('sendy:lists:signup') });
module.exports.sendySubscribeNewUser = sendySubscribeNewUser;
