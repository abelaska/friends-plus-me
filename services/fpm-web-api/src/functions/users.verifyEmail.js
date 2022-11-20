/* eslint no-case-declarations: "off" */
const Promise = require('bluebird');
const { EmailVerify, User } = require('@fpm/db');
const { createError } = require('../utils/error');
const { method, args, rateLimit, redirect } = require('../utils/http');
const { isTrue } = require('../utils/text');

module.exports = [
  method('GET'),
  args('id'),
  rateLimit(),
  async (req, res) => {
    const { query: { id }, deps: { auth0 } } = req;

    const emailVerify = await EmailVerify.findOne({ id }).exec();
    if (!emailVerify) {
      return createError('invalid_request', 'Invalid email verification');
    }
    if (emailVerify.expiresAt.valueOf() <= new Date().valueOf()) {
      return createError('invalid_request', 'Expired email verification');
    }

    const user = await User.findById(emailVerify.uid).exec();
    if (!user) {
      return createError('user_not_found');
    }
    if (!user.isEnabled) {
      return createError('user_inactive');
    }

    const tasks = [
      EmailVerify.update({ _id: emailVerify._id }, { $set: { verifiedAt: new Date() } }),
      EmailVerify.update(
        { uid: user._id, _id: { $ne: emailVerify._id }, expiresAt: { $gt: new Date() } },
        { $set: { expiresAt: new Date() } },
        { multi: true }
      ),
      User.update({ _id: user._id }, { $set: { emailVerified: true } })
    ];

    if (user.auth0Id) {
      tasks.push(auth0.updateUser(user.auth0Id, { email_verified: true }));
    }

    await Promise.all(tasks);

    if (emailVerify.redirectUrl) {
      return redirect(res, 301, emailVerify.redirectUrl);
    }

    return { ok: true, id, user_id: user._id.toString() };
  }
];
