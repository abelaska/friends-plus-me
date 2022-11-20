const { method } = require('../utils/http');

module.exports = [
  method('GET'),
  async () => {
      return 'User-agent: *\nDisallow: /\n';
  }
];
