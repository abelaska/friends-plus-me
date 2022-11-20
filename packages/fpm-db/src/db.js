import cloneDeep from 'lodash/cloneDeep';
import config from '@fpm/config';
import log from '@fpm/logging';
import mongoose from 'mongoose';
import Promise from 'bluebird';
import uuid from 'uuid';

mongoose.Promise = Promise;

export const dbConnect = async ({ skipSequenceInit } = {}) => {
  const options = config.get('db:options') && cloneDeep(config.get('db:options'));
  options.promiseLibrary = Promise;

  mongoose.connection.on('error', error =>
    log.error('Database error', { message: error.toString(), stack: error.stack })
  );
  mongoose.connection.on('connecting', () => log.info('Database connecting'));
  mongoose.connection.on('reconnected', () => log.warn('Database reconnected'));
  mongoose.connection.on('disconnecting', () => log.warn('Database disconnecting'));
  mongoose.connection.on('disconnected', () => log.warn('Database disconnected'));
  mongoose.connection.on('connected', () => log.info('Database connected'));

  // eslint-disable-next-line no-template-curly-in-string
  const url = config.get('db:url').replace('${RANDOM_DATABASE}', `db-${uuid.v4()}`);
  const db = await mongoose.connect(url, options);

  if (!skipSequenceInit) {
    await mongoose
      .model('Sequence')
      .prepareSequences()
      .then(() => log.info('Database sequences ready'))
      .catch(err => log.error('Database sequence not ready', err, err.toString()));
  }

  return db;
};

export const dbDisconnect = async () => mongoose.disconnect();

export const Types = mongoose.Types;

export const ObjectId = Types.ObjectId;

export const Schema = mongoose.Schema;

export const Mixed = Schema.Types.Mixed;

export const SchemaObjectId = Schema.Types.ObjectId;

export const registerModel = (modelName, schema) => {
  try {
    return mongoose.connection.model(modelName);
  } catch (e) {
    return mongoose.model(modelName, schema);
  }
};

export const dbUpdatedCount = updated => (updated && ((updated.result && updated.result.n) || updated.n)) || 0;

export const dbNotUpdated = updated => !dbUpdatedCount(updated);
