/* eslint no-unused-vars: "off", no-multi-assign: "off", no-mixed-operators: "off" */
const unix = (module.exports.unix = dt => dt && Math.floor((dt instanceof Date ? dt.valueOf() : dt) / 1000));

const dateDaysBefore = (module.exports.dateDaysBefore = (days = 1) =>
  new Date(new Date().valueOf() - days * 24 * 60 * 60 * 1000));

const dateDaysAfter = (module.exports.dateDaysAfter = (days = 1) =>
  new Date(new Date().valueOf() + days * 24 * 60 * 60 * 1000));

const dateMinusHours = (module.exports.dateMinusHours = (dt, hours = 1) =>
  new Date(dt.valueOf() - hours * 60 * 60 * 1000));

const datePlusHours = (module.exports.datePlusHours = (dt, hours = 1) =>
  new Date(dt.valueOf() + hours * 60 * 60 * 1000));
