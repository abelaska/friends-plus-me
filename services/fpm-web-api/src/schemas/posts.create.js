const { schema } = require('../utils/validations');

module.exports = {
  required: ['html'],
  additionalProperties: false,
  properties: {
    html: { type: 'string' },
    link: schema.URL,
    picture: schema.URL,
    pictures: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: schema.URL
    }
  }
};
