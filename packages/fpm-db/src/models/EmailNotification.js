import { registerModel, Schema, SchemaObjectId, Mixed } from '../db';
import { States } from '@fpm/constants';
import log from '@fpm/logging';
import moment from 'moment';

var EmailNotification = new Schema({
  aid: SchemaObjectId, // profile.accounts._id
  pid: SchemaObjectId, // profile._id

  sender: String, // sender email
  bcc: String, // BCC

  recepients: [
    {
      // vyplnuje az proces zpracovavajici notifikaci
      uid: SchemaObjectId, // user._id
      fname: String, // first name
      lname: String, // last name
      name: String, // full name
      email: String // emailova adresa ve tvaru "{full_name}" <{user.email}>
    }
  ],

  template: {
    name: String, // nazev notifikace, slouzi k vyberu odpovidajiciho template
    title: String, // titulek pojmenovavajici notifikaci
    data: Mixed // data vstupujici do renderovani template
  },

  gateway: {
    reply: Mixed // odpoved od mailove brany odesilajici email notifikaci
  },

  state: {
    type: Number,
    default: 0 // -1-failed,0-waiting,100-sent
  },

  createdAt: {
    // cas vzniku notifikace
    type: Date,
    default: Date.now
  },
  failedAt: Date, // cas selhani posledniho pokusu o odeslani
  sentAt: Date // cas uspesneho odeslani
});

EmailNotification.methods.failed = function(callback, now) {
  now = now || moment.utc();

  var set = {
    state: States.emailNotification.failed.code,
    failedAt: now.toDate()
  };

  this.failedAt = set.failedAt;
  this.state = set.state;

  this.update(
    { $set: set },
    function(err, updated) {
      if (err) {
        log.error('Failed to update failed email notification', {
          notificationId: this._id.toString(),
          updated: updated && updated.result,
          error: err
        });
      }
      if (callback) {
        callback(err);
      }
    }.bind(this)
  );
};

EmailNotification.methods.sent = function(gatewayReply, callback, now) {
  now = now || moment.utc();

  var set = {
    state: States.emailNotification.sent.code,
    sentAt: now.toDate(),
    'gateway.reply': gatewayReply
  };

  this.sentAt = set.sentAt;
  this.state = set.state;
  this.gateway = (this.gateway || {}).reply = gatewayReply;

  this.update(
    { $set: set },
    function(err, updated) {
      if (err) {
        log.error('Failed to update failed email notification', {
          notificationId: this._id.toString(),
          updated: updated && updated.result,
          error: err
        });
      }
      if (callback) {
        callback(err);
      }
    }.bind(this)
  );
};

export default registerModel('EmailNotification', EmailNotification);
