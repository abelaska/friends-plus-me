// config:
// 'intercom:token'

import config from '@fpm/config';
import { User } from '@fpm/db';
import { Client } from 'intercom-client';
import { fullEmail } from './email';
import { newAudit } from './audit';

const token = config.get('intercom:token');
const client = token && new Client({ token });

export const newEvent = async ({ id, name, email, uid, pid, aid, user, meta }) => {
  const result = [await newAudit({ name, uid, user, pid, aid, meta })];
  try {
    if (client) {
      result.push(
        await client.events.create({
          id,
          email,
          event_name: name,
          created_at: Math.round(new Date().getTime() / 1000),
          user_id: (uid && uid.toString && uid.toString()) || (user && user._id && user._id.toString()) || uid,
          metadata: meta
        })
      );
    }
  } catch (error) {
    const msg = error.toString();
    const isUserNotFound = msg.indexOf('"message":"User Not Found"') > -1;
    const ignoreErrors = isUserNotFound;
    if (!ignoreErrors) {
      throw error;
    }
    result.push(error);
  }
  return result;
};

export const newLead = async ld => client && client.leads.create(ld);

export const findLeads = async query => client && client.leads.listBy(query);

export const findUsers = async query => client && client.users.find(query);

export const newUser = async ld => client && client.users.create(ld);

export const newMessage = async msg => client && client.messages.create(msg);

export const profileFullEmail = async profile => {
  let contact = profile && profile.contact && profile.contact.email && profile.contact;
  if (!contact) {
    contact = profile.ownerId && (await User.findById(profile.ownerId).exec());
    if (!contact) {
      throw new Error(
        `Profile ${profile._id.toString()} owner ${profile.ownerId && profile.ownerId.toString()} not found`
      );
    }
  }
  return fullEmail(contact);
};
