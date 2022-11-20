const { schema } = require('../utils/validations');

module.exports = {
  required: ['name', 'url', 'callbacks'],
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    description: { type: 'string', maxLength: 140 },
    url: schema.URL,
    picture: schema.URL,
    callbacks: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: schema.CallbackURL
    },
    company: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        url: schema.URL
      }
    }
  }
};
