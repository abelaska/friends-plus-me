// @flow

// config:
// 'email:debug'
// 'email:transports:mailgun'
// 'email:invoice:bcc' || 'email:bcc'
// 'email:invoice:sender'
// 'email:invoice:subject'

import type { EmailType } from './email';

const Promise = require('bluebird');
const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { countries } = require('@fpm/constants');
const { User, Profile } = require('@fpm/db');
const moment = require('moment');
const pug = require('pug');
const mailer = require('./email');

class Invoice {
  owner: ?Object;
  tx: Object;
  profile: Object;
  homeCountryCode: string;
  templateFilename: string;
  isCRCompany: boolean;
  profile: Profile;

  constructor({ profile, tx }: Object) {
    this.owner = null;
    this.tx = tx;
    this.profile = profile;
    this.isCRCompany = moment.utc(tx.payedAt).isBefore(moment.utc('20170701', 'YYYYMMDD'));
    this.homeCountryCode = this.isCRCompany ? 'CZ' : 'GB';
    this.templateFilename = `${__dirname}/../template/invoice${this.isCRCompany ? '-cr' : ''}.pug`;
  }

  async getProfile() {
    if (!this.profile) {
      this.profile = await Profile.findById(this.tx.pid).exec();
      if (!this.profile) {
        throw new Error(`Profile ${this.tx.pid.toString()} not found`);
      }
    }
    return this.profile;
  }

  async getOwner() {
    if (!this.owner) {
      const profile = await this.getProfile();
      this.owner = (profile.contact && profile.contact.email && profile.contact) || null;
      if (!this.owner) {
        this.owner = profile.ownerId && (await User.findById(profile.ownerId).exec());
        if (!this.owner) {
          throw new Error(`Profile ${profile._id.toString()} owner ${profile.ownerId.toString()} not found`);
        }
      }
    }
    return this.owner;
  }

  async email() {
    const owner = await this.getOwner();
    const profile = await this.getProfile();
    return (profile.subject && profile.subject.invoiceEmail) || (owner && mailer.fullEmail(owner));
  }

  async send() {
    const html = await this.render();
    const to = await this.email();
    const mailOptions: EmailType = {
      to,
      html,
      'o:tag': 'invoice',
      from: config.get('email:invoice:sender'),
      subject: config.get('email:invoice:subject'),
      bcc: config.get('email:invoice:bcc') || config.get('email:bcc')
    };
    return mailer.send(mailOptions);
  }

  async model() {
    const profile = await this.getProfile();
    const sub = this.tx.subscr;
    const subId = sub.id || '';
    const txTm = moment.utc(this.tx.tm);
    const isPaywyu = sub.plan === 'PAYWYU' || sub.plan === 'PAYWYUM';
    const periodFrom = txTm.format('YYYY.M.D');
    const periodTo = txTm
      .clone()
      .add(isPaywyu ? -1 : 1, sub.interval === 'MONTH' ? 'months' : 'years')
      .format('YYYY.M.D');
    const model = {
      profile,
      owner: await this.getOwner(),
      txDate: periodFrom,
      tx: this.tx,
      vatPercent: this.tx.vatInc || 0,
      gross: this.tx.amount,
      vat: this.tx.vat,
      vatId: this.tx.subject.vatId,
      isReverseCharge: this.tx.subject.vatId && this.tx.subject.country !== this.homeCountryCode,
      net: this.tx.net,
      chargePeriod: `${periodFrom} - ${periodTo}`,
      billTo: '',
      paymentDescription: '?',
      country: countries.list[this.tx.subject.country] + (countries.isEU(this.tx.subject.country) ? ' (EU)' : '')
    };

    const billTo = [];
    if (this.owner) {
      billTo.push(this.owner.name);
    }
    if (this.tx.subject.org) {
      billTo.push(this.tx.subject.org);
    }
    if (this.tx.subject.billTo) {
      billTo.push(this.tx.subject.billTo);
    }
    model.billTo = billTo.join('<br>');

    switch (sub.gw) {
      case 'BRAINTREE':
        if (!sub.method) {
          sub.method = sub.paypal && sub.paypal.email ? 'paypal' : sub.card && sub.card.last4 ? 'creditcard' : null;
        }
        if (!sub.method || sub.method === 'creditcard') {
          model.paymentDescription = `Credit Card payment (x${sub.card.last4})`;
        } else if (sub.method === 'paypal') {
          model.paymentDescription = `PayPal payment (${sub.paypal.email}, ${sub.customer.id}${
            subId ? `, ${subId}` : ''
          })`;
        } else if (sub.method === 'coinbase') {
          model.paymentDescription = `Coinbase payment (${sub.coinbase.email}, ${sub.customer.id}${
            subId ? `, ${subId}` : ''
          })`;
        }
        break;
      case 'PAYPAL':
        model.paymentDescription = `PayPal payment (${sub.customer.id}${subId ? `, ${subId}` : ''})`;
        break;
      default:
        break;
    }
    return model;
  }

  async render() {
    const model = await this.model();
    const txId = this.tx._id.toString();
    const profile = await this.getProfile();
    const profileId = profile._id.toString();
    return new Promise((resolve, reject) => {
      pug.renderFile(this.templateFilename, model, (error, html) => {
        if (error) {
          log.error('Failed to render invoice', { txId, profileId, message: error.toString(), error });
          return reject(error);
        }
        log.info('Rendered invoice', { txId, profileId });
        return resolve(html);
      });
    });
  }
}

export default Invoice;
