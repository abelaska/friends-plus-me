import isURL from 'validator/lib/isURL';

export const isArrayOfUrls = ({ field }) => {
  const isEmpty = field.value.replace(/[, \t]/g, '') === '';
  if (isEmpty) {
    return [false, `The ${field.label} should contain at least one valid URL.`];
  }
  const uniq = {};
  const urls = field.value.split(',').map(s => s.trim());
  for (let i = 0; i < urls.length; i++) {
    if (!isURL(urls[i], { protocols: ['http', 'https'], require_protocol: true, require_tld: false })) {
      return [false, `The ${field.label} contains invalid URL "${urls[i]}"`];
    }
    if (uniq[urls[i]]) {
      return [false, `The ${field.label} contains "${urls[i]}" more than once`];
    }
    uniq[urls[i]] = 1;
  }
  return [true];
};
