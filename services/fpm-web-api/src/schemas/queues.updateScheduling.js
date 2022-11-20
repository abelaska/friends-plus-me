// @flow
const { scheduleDays, schedulingTypes } = require('../utils/scheduling');

const conditionalRequired = (prop: string, propValues: Array<string>, required: Array<string>) => ({
  if: {
    required: [prop],
    properties: { [prop]: { enum: propValues } }
  },
  then: { required },
  continue: true
});

module.exports = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    timezone: { type: 'string', format: 'timezone' },
    type: { type: 'string', enum: schedulingTypes },
    delay: { type: 'number', minimum: 0, maximum: 31 * 24 * 60 * 60 },
    counts: {
      type: 'object',
      required: scheduleDays,
      additionalProperties: false,
      properties: {
        mon: { type: 'number', minimum: 0, maximum: 1000 },
        tue: { type: 'number', minimum: 0, maximum: 1000 },
        wed: { type: 'number', minimum: 0, maximum: 1000 },
        thu: { type: 'number', minimum: 0, maximum: 1000 },
        fri: { type: 'number', minimum: 0, maximum: 1000 },
        sat: { type: 'number', minimum: 0, maximum: 1000 },
        sun: { type: 'number', minimum: 0, maximum: 1000 }
      }
    },
    schedules: {
      type: 'array',
      minItems: 0,
      items: {
        type: 'object',
        required: ['days', 'times'],
        additionalProperties: false,
        properties: {
          days: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'string',
              enum: scheduleDays
            }
          },
          times: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'string',
              format: 'time-hour-minute'
            }
          }
        }
      }
    }
  },
  switch: [
    conditionalRequired('type', ['times'], ['schedules']),
    conditionalRequired('type', ['counts'], ['counts']),
    conditionalRequired('type', ['delay'], ['delay'])
  ]
};
