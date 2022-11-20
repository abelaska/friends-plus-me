/* eslint import/no-extraneous-dependencies: "off", global-require: "off", import/no-dynamic-require: "off", no-multi-assign: "off", no-unused-vars: "off", no-mixed-operators: "off" */
import { MongoMemoryServer } from 'mongodb-memory-server';
import config from '@fpm/config';
import { startRedisServer, stopRedisServer } from '@fpm/redis';
import { dbConnect, dbDisconnect } from '@fpm/db';

let mongoServer;

export const testingBeforeAll = ({ db = true, redis = true } = {}) => async () => {
  if (db) {
    // https://github.com/nodkz/mongodb-memory-server
    mongoServer = new MongoMemoryServer({ debug: false });
    config.set('db:url', await mongoServer.getConnectionString(true));
    await dbConnect();
  }
  if (redis) {
    await startRedisServer();
  }
};

export const testingAfterAll = () => async () => {
  await dbDisconnect();

  if (mongoServer) {
    mongoServer.stop();
    mongoServer = null;
  }

  await stopRedisServer();
};

export const equalObjectId = (a, b) => expect(a && a.toString()).toBe(b && b.toString());
