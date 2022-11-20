const { Notifications } = require('@fpm/constants');

module.exports = {
  additionalProperties: false,
  minProperties: 1,
  properties: {
    notifications: {
      minProperties: 1,
      properties: Notifications.list.reduce((r, n) => {
        r[n] = { type: 'boolean' };
        return r;
      }, {})
    }
  }
};
