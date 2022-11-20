/* jshint node: true */
'use strict';

const braintree = require('braintree');
const config = require('@fpm/config');

const braintreeMerchantsConfig = Object.values(config.get('braintree:merchant'));

const clientsByMerchantId = braintreeMerchantsConfig.reduce((r, m) => {
  r[m.merchantId] = braintree.connect({
    environment: braintree.Environment[config.get('braintree:environment')],
    merchantId: m.merchantId,
    publicKey: m.publicKey,
    privateKey: m.privateKey
  });
  return r;
}, {});
const legacyClientDef = clientsByMerchantId[config.get('braintree:merchant:old:merchantId')];
const clientDef = clientsByMerchantId[config.get('braintree:merchant:default:merchantId')];

exports.braintreeClientByMerchantId = merchantId => merchantId && clientsByMerchantId[merchantId];

exports.braintreeConfigByMerchantId = merchantId => merchantId && braintreeMerchantsConfig.find(m => m.merchantId === merchantId);

exports.braintreeClientByProfile = profile => {
  const sub = profile && profile.subscription;
  const merchant = sub && sub.merchant;
  const customerId = sub && sub.gw === 'BRAINTREE' && sub.customer && sub.customer.id;
  const merchantId = merchant && merchant.merchantId;
  return (!merchantId && customerId && legacyClientDef) || clientsByMerchantId[merchantId] || clientDef;
};