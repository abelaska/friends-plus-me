/* eslint no-unused-vars: "off", no-multi-assign: "off" */

// eslint-disable-next-line camelcase
const createError = (module.exports.createError = (error, error_description) => {
  return { ok: false, error, error_description };
});
