/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
// const { default as config, init } = require('../index');
const log = require('../index').default;

test('should be defined', () => {
  expect(log).toBeTruthy();
  expect(log.info).toBeTruthy();
});
