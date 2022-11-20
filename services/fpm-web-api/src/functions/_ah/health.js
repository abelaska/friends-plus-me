const { send } = require('micro');
const { ObjectId, User } = require('@fpm/db');
const { method } = require('../../utils/http');

module.exports = [
  method('GET'),
  async (req, res) => {
    try {
      await User.findById(ObjectId(), '_id');
      return 'ok';
    } catch (error) {
      return send(res, 500, 'fail');
    }
  }
];
