import Promise from 'bluebird';
import { registerModel, Schema, ObjectId } from '../db';

// id, name, initialValue
const sequences = [
  ['000000000000000000000001', 'Shortener', null],
  ['000000000000000000000002', 'Affiliate', 352323446],
];

const Sequence = new Schema({
  seq: {
    type: Number,
    default: 0,
  }, // hodnota sekvence
});

const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function seqToHash(seq) {
  let result = '';
  let mod;
  while (seq > 0) {
    mod = seq % chars.length;
    result = chars.charAt(mod) + result;
    seq = (seq - mod) / chars.length;
  }
  return result;
}

function hashToSeq(hash) {
  let ch;
  let idx;
  let base = 1;
  let seq = 0;
  for (let i = 0; i < hash.length; i++) {
    ch = hash[hash.length - 1 - i];
    idx = chars.indexOf(ch);
    seq += idx * base;
    base *= chars.length;
  }
  return seq;
}

Sequence.static('seqToHash', seqToHash);
Sequence.static('hashToSeq', hashToSeq);

Sequence.static('next', async function get(name, callback) {
  return new Promise((resolve, reject) => {
    this
      .findOneAndUpdate(
        {
          _id: new ObjectId(name),
        },
        {
          $inc: {
            seq: 1,
          },
        },
        {
          new: true,
        },
      )
      .exec((err, seq) => {
        if (err) {
          return reject(err);
        }
        resolve({
          seq: seq.seq,
          hash: seqToHash(seq.seq),
        });
      });
  });
});

Sequence.static('nextMore', async function getMore(name, count, callback) {
  return new Promise((resolve, reject) => {
    this
      .findOneAndUpdate(
        {
          _id: new ObjectId(name),
        },
        {
          $inc: {
            seq: count,
          },
        },
        {
          new: true,
        },
      )
      .exec((err, seq) => {
        if (err) {
          return reject(err);
        }
        const hashs = [];
        const seqs = [];

        for (let i = 0; i < count; i++) {
          seqs.unshift(seq.seq - i);
          hashs.unshift(seqToHash(seq.seq - i));
        }

        resolve({
          seqs,
          hashs,
        });
      });
  });
});

Sequence.static('prepareSequences', async function prepareSequences() {
  return Promise.map(
    sequences,
    s => {
      return new Promise((resolve, reject) => {
        this.findOne(
          {
            _id: s[0],
          },
          (err, seq) => {
            if (err) {
              return reject(err);
            }
            if (seq) {
              return resolve(seq);
            }
            this.create(
              {
                _id: new ObjectId(s[0]),
                seq: s[2] || 0,
              },
              (err0, seq0) => {
                if (err0) {
                  return reject(err0);
                }
                resolve(seq0);
              },
            );
          },
        );
      });
    },
    { concurrency: 2 },
  );
});

const setupSeq = (id, name) => {
  Sequence.static(`next${name}`, async function getSeq(callback) {
    return this.next(id, callback);
  });
  Sequence.static(`next${name}s`, async function getSeqs(count, callback) {
    return this.nextMore(id, count, callback);
  });
};

sequences.forEach(seq => setupSeq(...seq));

export default registerModel('Sequence', Sequence);
