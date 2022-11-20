/* eslint no-case-declarations: "off" */
const moment = require('moment-timezone');
const { EmailVerify } = require('@fpm/db');
const { verifyAccountEmail } = require('@fpm/events');
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { method, rateLimit } = require('../utils/http');

const ALLOWED_VERIFICATIONS_PER_DAY = 20;

module.exports = [
  method('GET'),
  oauth(),
  scopes('admin'),
  rateLimit(),
  async req => {
    const { user, query: { redirect: redirectUrl } } = req;

    const todayVerificationsCount = await EmailVerify.count({
      uid: user._id,
      createdAt: {
        $gt: moment
          .utc()
          .startOf('day')
          .toDate(),
        $lte: moment
          .utc()
          .endOf('day')
          .toDate()
      }
    });

    if (todayVerificationsCount >= ALLOWED_VERIFICATIONS_PER_DAY) {
      return createError(
        'invalid_request',
        `Daily limit of user "${user._id.toString()}" verifications(${todayVerificationsCount}) reached`
      );
    }

    const emailVerify = await new EmailVerify({ uid: user._id, redirectUrl }).save();
    const verifyLink = `https://api.friendsplus.me/users.verifyEmail?id=${emailVerify.id}`;

    await verifyAccountEmail({ user, verifyLink });

    return { ok: true, user_id: user._id.toString(), verify_id: emailVerify.id, verify_link: verifyLink };
  }
];
