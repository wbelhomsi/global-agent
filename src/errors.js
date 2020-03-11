// @flow

/* eslint-disable fp/no-class, fp/no-this */

import ExtendableError from 'es6-error';

export class UnexpectedStateError extends ExtendableError {
  constructor (message, code = 'UNEXPECTED_STATE_ERROR') {
    super(message);

    this.code = code;
  }
}
