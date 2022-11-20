/* eslint import/no-extraneous-dependencies: "off", global-require: "off", import/no-dynamic-require: "off", no-multi-assign: "off", no-unused-vars: "off", no-mixed-operators: "off" */

import test from 'ava';
import { ExtendableError, ExtendableCodeError } from '../ExtendableError';

export class TestError extends ExtendableError {}

export class TestCodeError extends ExtendableCodeError {}

export class TestSpecificCodeError extends TestCodeError {
  constructor() {
    super('Specific error message', 'ERROR_CODE');
  }
}

test('ExtendableError', async t => {
  try {
    throw new TestError('error message');
  } catch (e) {
    t.truthy(e instanceof ExtendableError);
    t.truthy(e instanceof TestError);
    t.is(e.message, 'error message');
  }
});

test('ExtendableCodeError', async t => {
  try {
    throw new TestCodeError('error message', 'error code');
  } catch (e) {
    t.truthy(e instanceof ExtendableCodeError);
    t.truthy(e instanceof TestCodeError);
    t.is(e.message, 'error message (error code)');
    t.is(e.code, 'error code');
  }
});

test('ExtendableCodeError 2', async t => {
  try {
    throw new TestSpecificCodeError();
  } catch (e) {
    t.truthy(e instanceof ExtendableCodeError);
    t.truthy(e instanceof TestSpecificCodeError);
    t.is(e.message, 'Specific error message (ERROR_CODE)');
    t.is(e.code, 'ERROR_CODE');
  }
});
