export class ExtendableError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

export class ExtendableCodeError extends ExtendableError {
  code: ?number;

  constructor(message: string, code: ?number) {
    super(`${message}${code === undefined || code === null ? '' : ` (${code})`}`);
    this.code = code;
  }
}
