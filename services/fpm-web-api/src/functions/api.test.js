const { method } = require('../utils/http');

module.exports = [
  method('GET'),
  async req => {
    const { query } = req;
    if (query.error) {
      return { ok: false, error: query.error, args: query };
    }
    return { ok: true, args: query };
  }
];
