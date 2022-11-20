// @flow
import Promise from 'bluebird';
import Warlock from 'node-redis-warlock';
import log from '@fpm/logging';
import { ObjectId, Queue } from '@fpm/db';
import { createRedisClient } from '@fpm/redis';
import { QueueLockedError, QueueNotFoundError } from './QueueError';

// https://www.npmjs.com/package/node-redis-warlock
export type LockType = {
  ttl: number,
  retryCount: number,
  retryDelay: number
};

export type Lock = {
  resource: string,
  unlock: Function
};

export type QueueLockConstructor = {
  config?: ?Object,
  redisConfig?: ?Object,
  WarlockOverride?: Object
};

export type AcquireQueueLockFce = {
  queue: Queue, // queue to lock
  timeout?: number // acquire queue timeout in ms
};

export default class QueueLock {
  warlock: Warlock;
  postLock: LockType;
  queueLock: LockType;

  constructor({ config, redisConfig, WarlockOverride }: QueueLockConstructor) {
    if (!config && !redisConfig) {
      throw new Error('Redis configuration not set');
    }

    const W: Warlock = WarlockOverride || Warlock;

    this.warlock = new W(createRedisClient(config || redisConfig));
    this.postLock = {
      ttl: 3 * 60 * 1000,
      retryCount: 15,
      retryDelay: 200
    };
    this.queueLock = {
      ttl: 5 * 1000,
      retryCount: 5,
      retryDelay: 75
    };
  }

  async withPostLock({ post }: Object, lockedFunc: Function) {
    // lock queue
    const queueId = post.aid;
    const qLock = await this.lockQueue(this.postLock, queueId);
    if (!qLock) {
      throw new QueueLockedError(queueId);
    }
    try {
      // fetch queue
      const foundQueue = await Queue.findById(queueId)
        .lean()
        .exec();
      if (!foundQueue) {
        throw new QueueNotFoundError(queueId);
      }
      return await lockedFunc({ queue: foundQueue });
    } finally {
      // release queue lock
      await this.unlockQueue(qLock);
    }
  }

  queueLockName(queueId: string) {
    if (!queueId) {
      throw new Error('Cannot determine queue lock name');
    }
    return `locks:qm:queue:${queueId}`;
  }

  lockTries(lock: LockType, timeout: number): number {
    const lockTimeout = lock.retryCount * lock.retryDelay;
    return Math.ceil(timeout / lockTimeout);
  }

  async acquireQueueLock({ queue, timeout = 3000 }: AcquireQueueLockFce) {
    let lock;
    if (queue) {
      let tries = this.lockTries(this.queueLock, timeout);
      if (queue) {
        while (tries-- > 0 && !lock) {
          // eslint-disable-next-line no-await-in-loop
          lock = queue && (await this.lockQueue(this.queueLock, queue._id));
        }
      }
    }
    return (lock && { lock, queue }) || null;
  }

  async lockQueue(lock: LockType, queueId: string | ObjectId): Promise<?Lock> {
    const resource = this.queueLockName(queueId.toString());
    return new Promise((resolve, reject) => {
      this.warlock.optimistic(resource, lock.ttl, lock.retryCount, lock.retryDelay, (err, unlock) => {
        if (err) {
          log.error('Queue lock acquire failure', { message: err.toString(), stack: err.stack });
          return resolve();
        }
        return resolve(typeof unlock === 'function' ? { resource, unlock } : null);
      });
    });
  }

  async unlockQueue(qLock: Lock) {
    try {
      if (qLock) {
        await qLock.unlock();
      }
    } catch (e) {
      log.error('Failed to release queue lock', {
        lock: qLock.resource,
        message: e.toString(),
        stack: e.stack
      });
    }
  }
}
