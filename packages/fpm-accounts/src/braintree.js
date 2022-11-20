import braintree from 'braintree';
import config from '@fpm/config';

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
const clientDef = clientsByMerchantId[config.get('braintree:merchant:default:merchantId')];

export const braintreeClientByMerchantId = merchantId => merchantId && clientsByMerchantId[merchantId];

export const braintreeConfigByMerchantId = merchantId =>
  merchantId && braintreeMerchantsConfig.find(m => m.merchantId === merchantId);

export const braintreeClientByProfile = profile => {
  const merchantId =
    profile && profile.subscription && profile.subscription.merchant && profile.subscription.merchant.merchantId;
  return clientsByMerchantId[merchantId] || clientDef;
};
