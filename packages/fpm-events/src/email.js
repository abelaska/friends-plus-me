// @flow
// config:
// 'email:debug'
// 'email:transports:mailgun'

const Promise = require('bluebird');
const LRU = require('lru-cache');
const crypto = require('crypto');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const nodemailer = require('nodemailer');
const mailgunTransport = require('nodemailer-mailgun-transport');
const sesTransport = require('nodemailer-ses-transport');

const mailgunConfig = config.get('email:transports:mailgun');
const sesConfig = config.get('email:transports:ses');
const transport = (mailgunConfig && mailgunTransport(mailgunConfig)) || (sesConfig && sesTransport(sesConfig));
const smtp = transport && nodemailer.createTransport(transport);
const isDebug = !smtp || config.get('email:debug');

export type EmailType = {
  to: string,
  cc?: string,
  bcc?: string,
  from: string,
  html?: string,
  text?: string,
  subject: string,
  'o:campaign'?: string,
  'o:tag'?: string
};

const sentEmailsCache = LRU({ max: 10000, maxAge: 24 * 60 * 60 * 1000 });

const emailHash = (email: EmailType) =>
  crypto
    .createHash('sha1')
    .update(`${email.to}:${email.subject}:${email.html}`)
    .digest('base64');

export const fullName = (user: Object) => user.name || user.fname || user.lname;

export const fullEmail = (user: Object) => {
  const name = fullName(user);
  return (name && `"${name}" <${user.email}>`) || user.email;
};

export const send = async (email: EmailType) => {
  if (isDebug) {
    log.debug(`Fake email sent to ${email.to}`, email);
    return new Error('Email in debug mode');
  }

  if (!email.to) {
    log.info('Will not send email without a single recepient, skipped', { email });
    return new Error('Will not send email without a single recepient, skipped');
  }

  const hash = emailHash(email);
  if (sentEmailsCache.get(hash)) {
    log.warn('Email already sent once in the last 24 hours, skipped', {
      to: email.to,
      subject: email.subject
    });
    return null;
  }

  let time = new Date();

  return new Promise((resolve, reject) => {
    const { to, subject } = email;

    if (!email.cc) {
      delete email.cc;
    }
    if (!email.bcc) {
      delete email.bcc;
    }

    return smtp.sendMail(email, (error, response) => {
      time = new Date() - time;
      if (error) {
        log.warn('Failed to send email', { time, email, response, error });
        return reject(error);
      }
      log.info('Email sent', { time, to, subject, response });

      sentEmailsCache.set(hash, true);

      return resolve(response);
    });
  });
};

export const sendEmail = send;
