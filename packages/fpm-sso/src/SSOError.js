import { ExtendableCodeError } from '@fpm/error';

export class SSOError extends ExtendableCodeError {}

export class SSONotInitializedError extends SSOError {
  constructor() {
    super('SSO not initialized', 'SSO_NOT_INITIALIZED');
  }
}

export class SSOStoreError extends SSOError {
  constructor(errorMsg: ?string) {
    super(`SSO store error: ${errorMsg}`, 'SSO_STORE_ERROR');
  }
}

export class SSOInvalidSessionIdError extends SSOError {
  constructor() {
    super('Invalid session id', 'SSO_INVALID_SESSION_ID');
  }
}

export class SSOInvalidDataError extends SSOError {
  constructor() {
    super('Invalid data', 'SSO_INVALID_DATA');
  }
}
