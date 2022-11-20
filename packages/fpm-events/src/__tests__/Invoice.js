const test = require('ava');
const moment = require('moment');

test('should be the right date', t => {
  t.is(moment.utc('20170701', 'YYYYMMDD').format(), '2017-07-01T00:00:00Z');
});
