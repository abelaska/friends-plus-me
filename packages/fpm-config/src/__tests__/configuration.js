/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
const config = require('../index');

test('should be defined', () => {
  expect(config.get()).toBeTruthy();
});
