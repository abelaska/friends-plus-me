const { dbUpdatedCount, User } = require('@fpm/db');
const { Notifications } = require('@fpm/constants');
const { oauth, scopes } = require('../utils/oauth');
const { method, json, sanitizeBody, rateLimit } = require('../utils/http');
const { validateBody } = require('../utils/validations');

module.exports = [
  method('POST'),
  json(),
  validateBody(),
  oauth(),
  scopes('admin', 'users.write'),
  rateLimit(),
  sanitizeBody(),
  async req => {
    const nsu = req.user.notifications || {};
    const ns = req.body.notifications || {};
    const $set = {};

    Object.keys(ns)
      .filter(n => Notifications.list.indexOf(n) > -1)
      .forEach(n => {
        if (typeof ns[n] === typeof true && nsu[n] !== ns[n]) {
          $set[`notifications.${n}`] = ns[n];
        }
      });

    let ok = true;

    if (Object.keys($set).length) {
      ok = dbUpdatedCount(await User.update({ _id: req.user._id }, { $set })) > 0;
    }

    return { ok };
  }
];
