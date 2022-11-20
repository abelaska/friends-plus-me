import { Audit, ObjectId } from '@fpm/db';

export const newAudit = async ({ name, user, uid, pid, aid, meta: data }) =>
  new Audit({
    pid,
    aid,
    data,
    ev: name,
    uid: new ObjectId(uid || (user && user._id))
  }).save();
