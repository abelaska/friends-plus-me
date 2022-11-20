import { registerModel, Schema, SchemaObjectId, ObjectId, Mixed } from '../db';

var Audit = new Schema(
  {
    ev: String,
    tm: { type: Date, default: Date.now },
    uid: SchemaObjectId, // users._id
    pid: SchemaObjectId, // profiles._id
    aid: SchemaObjectId, // profiles.accounts._id
    data: Mixed
  },
  {
    versionKey: false
  }
);

Audit.index(
  {
    pid: 1
  },
  { unique: false }
);

Audit.static('account', function(eventName, uid, pid, aid, data, callback) {
  this.log(
    eventName,
    {
      uid: uid,
      pid: pid,
      aid: aid
    },
    data,
    callback
  );
});

Audit.static('profile', function(eventName, uid, pid, data, callback) {
  this.log(
    eventName,
    {
      uid: uid,
      pid: pid
    },
    data,
    callback
  );
});

Audit.static('user', function(eventName, uid, pid, data, callback) {
  this.log(
    eventName,
    {
      uid: uid,
      pid: pid
    },
    data,
    callback
  );
});

// ids : { uid, pid, aid }
Audit.static('log', function(eventName, ids, data, callback) {
  this.create(
    {
      ev: eventName,
      uid: ids && ids.uid && new ObjectId(ids.uid.toString()),
      pid: ids && ids.pid && new ObjectId(ids.pid.toString()),
      aid: ids && ids.aid && new ObjectId(ids.aid.toString()),
      data: data
    },
    function(err, data) {
      if (err) {
        log.error('Failed to save audit log', {
          event: eventName,
          pid: ids && ids.pid && ids.pid.toString(),
          aid: ids && ids.aid && ids.aid.toString(),
          data: data,
          error: err
        });
      }
      if (callback) {
        callback(err);
      }
    }
  );
});

export default registerModel('Audit', Audit);
