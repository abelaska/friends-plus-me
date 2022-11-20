/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const nanoid = require('nanoid');
const xss = require('xss');

const newClientSecret = (module.exports.newClientSecret = () => nanoid(48));
const newClientId = (module.exports.newClientId = () => nanoid(24));

const twoDigits = (module.exports.twoDigits = num => `${num < 10 ? '0' : ''}${num}`);

const isTrue = (module.exports.isTrue = v => {
  if (!v) {
    return false;
  }
  if (v > 0) {
    return true;
  }
  v = v.toLowerCase();
  return v === 'true' || v === 'yes';
});

const containsAll = (module.exports.containsAll = (a, b) => a.every(i => b.includes(i)));

const sameMembers = (module.exports.sameMembers = (a, b) => containsAll(a, b) && containsAll(b, a));

const sanitizeObj = (module.exports.sanitizeObj = (obj, ...ignoreKeys) => {
  Object.keys(obj)
    .filter(key => ignoreKeys.indexOf(key) === -1)
    .forEach(key => {
      switch (typeof obj[key]) {
        case 'string':
          obj[key] = xss(obj[key]);
          break;
        case 'object':
          obj[key] = sanitizeObj(obj[key], ...ignoreKeys);
          break;
        default:
          break;
      }
    });
  return obj;
});
