/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
import config from '../index';

test('should be defined', () => {
  expect(config).toBeTruthy();
  expect(config.get()).toBeTruthy();
  expect(config.get('NODE_ENV')).toBe('test');
  expect(config.get('npm_package_jest_globals_a_b:b_C:D')).toBe('E');
});
