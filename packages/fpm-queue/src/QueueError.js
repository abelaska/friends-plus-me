import { ObjectId } from '@fpm/db';
import { ExtendableCodeError } from '@fpm/error';

export class QueueError extends ExtendableCodeError {}

export class QueueSizeLimitReachedError extends QueueError {
  limit: number;
  constructor(sizeLimit: number, queueId: ?string | ?ObjectId) {
    super(
      `Queue${(queueId && ` ${queueId.toString()}`) || ''} size limit of ${sizeLimit} scheduled posts reached`,
      'QUEUE_SIZE_LIMIT_REACHED'
    );
    this.limit = sizeLimit;
  }
}

export class QueueLockedError extends QueueError {
  constructor(queueId: ObjectId | string) {
    super(`Queue ${queueId.toString()} is still locked`, 'QUEUE_LOCKED');
  }
}

export class QueueNotFoundError extends QueueError {
  constructor(queueId: ObjectId | string) {
    super(`Queue ${queueId.toString()} not found`, 'QUEUE_NOT_FOUND');
  }
}

export class QueueInvalidSchedulerError extends QueueError {
  constructor(message: string) {
    super(message, 'INVALID_SCHEDULER');
  }
}
