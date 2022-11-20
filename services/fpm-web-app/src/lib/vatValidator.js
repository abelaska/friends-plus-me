/* jshint node: true */
/* jshint -W106 */
'use strict';

const { countries } = require('@fpm/constants');
const validateVat = require('validate-vat');

module.exports = function isVatValid(countryCode, vatNumber, callback/*, failFast*/) {
  countryCode = countryCode.toUpperCase();
  if (!countries.isEU(countryCode)) {
    return callback(undefined, true);
  }
  vatNumber = vatNumber.toUpperCase();
  // Remove the "GB" from the VAT number
  if(vatNumber.indexOf(countryCode) === 0) {
    vatNumber = vatNumber.substring(countryCode.length);
  }
  validateVat(countryCode, vatNumber, function(err, validationInfo) {
    callback(err, (validationInfo && validationInfo.valid) || false);
  });
};

// isVatValid('CZ', 'CZ01600125', function(err, isValid) {
// isVatValid('CZ', 'CZ67985726', function(err, isValid) {
// isVatValid('IE', 'IE6388047V', function(err, isValid) {
// isVatValid('IE', 'IE9700053D', function(err, isValid) {
// isVatValid('GB', 'GB117223643', function(err, isValid) {
// isVatValid('DE', 'DE261444898', function(err, isValid) {
// isVatValid('IE', '0000000000000', function(err, isValid) {
//   console.log('err', err, 'isValid', isValid);
// });
