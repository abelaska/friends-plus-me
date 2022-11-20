/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
import { processEnvDir } from '../env';

test('should load env files', () => {
  processEnvDir(`${__dirname}/env`);
  expect(process.env.env__key__0).toBe('value1');
  expect(process.env.test__key0__key1__key2).toBe('value2');
});
