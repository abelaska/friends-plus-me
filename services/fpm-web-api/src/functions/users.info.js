const { ObjectId, Profile } = require('@fpm/db');
const { User } = require('@fpm/db');
const { Notifications } = require('@fpm/constants');
const { oauth, scopes, isEmailVisibleByScope } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { method, rateLimit } = require('../utils/http');
const { unix } = require('../utils/time');
const { isTrue } = require('../utils/text');

module.exports = [
  method('GET'),
  oauth(),
  scopes('admin', 'users.read'),
  rateLimit(),
  async req => {
    const { query } = req;
    const full = isTrue(query.full || 'false');
    const userId = (ObjectId.isValid(query.user) && query.user) || req.user._id.toString();

    const isMe = userId === req.user._id.toString();
    if (!isMe) {
      const dbTeams = await Profile.find({ _id: { $in: req.user.profiles.owner } }, '_id members').exec();
      const members = dbTeams
        .map(t => Object.values(t.members))
        .reduce((r, v) => r.concat(v), [])
        .map(m => m.toString())
        .filter(m => m);
      const isMember = members.indexOf(userId) > -1;
      if (!isMember) {
        return createError('access_denied');
      }
    }

    const loadFields = ['_id', 'name', 'image', 'created'];
    const isEmailVisible = isMe || isEmailVisibleByScope(req);
    if (isEmailVisible) {
      loadFields.push('email');
    }

    const isNotificationsVisible = isMe && full;
    if (isNotificationsVisible) {
      loadFields.push('notifications');
    }

    const fetchedUser = await User.findById(userId, loadFields.join(' ')).exec();
    if (!fetchedUser) {
      return createError('user_not_found');
    }

    const email = fetchedUser.email;

    const notifications =
      fetchedUser.notifications &&
      Notifications.list.reduce((r, n) => {
        r[n] =
          fetchedUser.notifications[n] === undefined || fetchedUser.notifications[n] === null
            ? true
            : !!fetchedUser.notifications[n];
        return r;
      }, {});

    const user = {
      user_id: fetchedUser._id.toString(),
      name: fetchedUser.name,
      email,
      created: unix(fetchedUser.created),
      avatar: fetchedUser.image,
      notifications
    };

    return { ok: true, user };
  }
];
