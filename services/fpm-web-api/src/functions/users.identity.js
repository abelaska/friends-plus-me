const { User } = require('@fpm/db');
const { oauth, scope, scopes } = require('../utils/oauth');
const { method, rateLimit } = require('../utils/http');

module.exports = [
  method('GET'),
  oauth(),
  scopes('admin', 'identity', 'identity.basic'),
  rateLimit(),
  async req => {
    const isAvatarVisible = scope(req, 'identity') || scope(req, 'identity.avatar') || scope(req, 'admin');
    const isEmailVisible = scope(req, 'identity') || scope(req, 'identity.email') || scope(req, 'admin');

    const fetchedUser = await User.findById(
      req.user._id,
      `_id name${isAvatarVisible ? ' image' : ''}${isEmailVisible ? ' email' : ''}`
    ).exec();

    const user = {
      user_id: fetchedUser._id.toString(),
      name: fetchedUser.name
    };

    if (isAvatarVisible) {
      user.avatar = fetchedUser.image;
    }

    if (isEmailVisible) {
      user.email = fetchedUser.email;
    }

    return { ok: true, user };
  }
];
