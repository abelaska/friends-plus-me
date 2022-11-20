import Promise from 'bluebird';
import config from '@fpm/config';
import { Types } from '@fpm/constants';
import { User } from '@fpm/db';
import { newEvent } from './event';
import { sendEmail, fullName, fullEmail } from './email';
import { renderEmail } from './template';

const teamName = profile => (profile.name || '').trim().replace(/[ \t]+team/i, '');

const userWantsToReceiveNotification = (user, notificationName, defaultVal) => {
  const userPref = notificationName && user.notifications && user.notifications[notificationName];
  return userPref === null || userPref === undefined ? defaultVal : !!userPref;
};

const recepients = async (notificationName, ...userIds) =>
  (await Promise.map(
    Object.keys(
      userIds
        // filter our empty values
        .filter(id => id)
        // flatten
        .reduce((r, f) => r.concat(Array.isArray(f) ? f : [f]), [])
        // filter our empty values
        .filter(id => id)
        // to string
        .map(id => id.toString())
        // unique
        .reduce((r, id) => {
          r[id] = 1;
          return r;
        }, {})
    ),
    id => User.findById(id).exec()
  ))
    .filter(user => user && user.email && userWantsToReceiveNotification(user, notificationName, true))
    .map(user => fullEmail(user))
    .join(', ');

export const postPublishingFailed = async ({ profile, account, post }) =>
  Promise.all([
    sendEmail({
      to: await recepients(
        'post-publishing-failed',
        post.scheduledBy,
        account.creator,
        profile.members && profile.members.owner,
        profile.members && profile.members.manager
      ),
      from: config.get('email:sender'),
      bcc: config.get('email:bcc'),
      subject: `Warning: Failed to publish post to ${Types.networkName(account.network)} queue "${account.name}"`,
      // 'o:tag': 'notifications',
      'o:tag': 'post-publishing-failed',
      html: renderEmail('post-publishing-failed', {
        post_id: post._id.toString(),
        post_html: post.html,
        post_link: post.attachments && post.attachments.link && post.attachments.link.url,
        post_link_title: post.attachments && post.attachments.link && post.attachments.link.title,
        post_link_picture:
          post.attachments && post.attachments.link && post.attachments.link.photo && post.attachments.link.photo.url,
        post_picture: post.attachments && post.attachments.photo && post.attachments.photo.url,
        team_id: profile._id.toString(),
        team_name: teamName(profile),
        account_id: account._id.toString(),
        account_name: account.name,
        account_avatar: `${account.image}-cc`,
        account_network: Types.networkTypeName(account.network),
        account_network_name: Types.networkName(account.network),
        account_type: Types.accountTypeName(account.account),
        account_type_name: Types.accountName(account.account)
      })
    }),
    newEvent({
      name: 'post-publishing-failed',
      uid: account.creator,
      meta: {
        post_id: post._id.toString(),
        team_id: profile._id.toString(),
        team_name: teamName(profile),
        account_id: account._id.toString(),
        account_name: account.name,
        account_network: Types.networkTypeName(account.network),
        account_network_name: Types.networkName(account.network),
        account_type: Types.accountTypeName(account.account),
        account_type_name: Types.accountName(account.account)
      }
    })
  ]);

const accountReconnectRequiredTemplateName = account =>
  `account-requires-reconnect${account.network === Types.network.instagram.code ? '-instagram' : ''}`;

export const accountRequiresReconnect = async ({ profile, account }) =>
  Promise.all([
    sendEmail({
      to: await recepients(
        'account-requires-reconnect',
        account.creator,
        profile.members && profile.members.owner,
        profile.members && profile.members.manager
      ),
      from: config.get('email:sender'),
      bcc: config.get('email:bcc'),
      subject: `Warning: Friends+Me fails to access your ${Types.networkName(account.network)} account "${
        account.name
      }"`,
      // 'o:tag': 'notifications',
      'o:tag': accountReconnectRequiredTemplateName(account),
      html: renderEmail(accountReconnectRequiredTemplateName(account), {
        team_id: profile._id.toString(),
        team_name: teamName(profile),
        account_id: account._id.toString(),
        account_name: account.name,
        account_avatar: `${account.image}-cc`,
        account_network: Types.networkTypeName(account.network),
        account_network_name: Types.networkName(account.network),
        account_type: Types.accountTypeName(account.account),
        account_type_name: Types.accountName(account.account)
      })
    }),
    newEvent({
      name: 'account-requires-reconnect',
      uid: account.creator,
      meta: {
        team_id: profile._id.toString(),
        team_name: teamName(profile),
        account_id: account._id.toString(),
        account_name: account.name,
        account_network: Types.networkTypeName(account.network),
        account_network_name: Types.networkName(account.network),
        account_type: Types.accountTypeName(account.account),
        account_type_name: Types.accountName(account.account)
      }
    })
  ]);

export const teamMemberAccepted = async ({ profile, inviter, invitee }) =>
  Promise.all([
    sendEmail({
      to: fullEmail(inviter),
      from: config.get('email:sender'),
      bcc: config.get('email:bcc'),
      subject: `${fullName(invitee)} has accepted your invitation to join the "${teamName(
        profile
      )}" team on Friends+Me.`,
      // 'o:tag': 'notifications',
      'o:tag': 'team-member-accepted',
      html: renderEmail('team-member-accepted', {
        team_id: profile._id.toString(),
        team_name: teamName(profile),
        team_members_count: profile.membersCount(),
        invitee_name: fullName(invitee),
        invitee_email: invitee.email,
        invitee_avatar: `${invitee.image}-cc`
      })
    }),
    newEvent({
      uid: inviter._id,
      name: 'team-member-accepted',
      meta: {
        team_id: profile._id.toString(),
        team_name: teamName(profile),
        team_members_count: profile.membersCount(),
        invitee_name: fullName(invitee),
        invitee_email: invitee.email,
        invitee_avatar: invitee.image
      }
    })
  ]);

export const teamMemberInvited = async ({ profile, inviter, inviteeCode, inviteeEmail }) =>
  Promise.all([
    sendEmail({
      to: inviteeEmail,
      from: config.get('email:team:invite:sender'),
      bcc: config.get('email:team:invite:bcc'),
      subject: `${fullName(inviter)} has invited you to join the "${teamName(profile)}" team on Friends+Me.`,
      // 'o:tag': 'notifications',
      'o:tag': 'team-member-invited',
      html: renderEmail('team-member-invited', {
        team_id: profile._id.toString(),
        team_name: teamName(profile),
        team_members_count: profile.membersCount(),
        inviter_name: fullName(inviter),
        inviter_email: inviter.email,
        inviter_avatar: `${inviter.image}-cc`,
        invitee_code: inviteeCode
      })
    }),
    newEvent({
      user: inviter,
      name: 'team-member-invited',
      meta: {
        team_id: profile._id.toString(),
        team_name: profile.name,
        team_members_count: profile.membersCount(),
        invitee_code: inviteeCode,
        invitee_email: inviteeEmail
      }
    })
  ]);

export const verifyAccountEmail = async ({ user, verifyLink }) =>
  Promise.all([
    sendEmail({
      to: fullEmail(user),
      from: config.get('email:sender'),
      bcc: config.get('email:bcc'),
      subject: 'Verify your e-mail',
      'o:tag': 'verify-email',
      html: renderEmail('verify-email', { verify_link: verifyLink })
    }),
    newEvent({
      name: 'verify-email',
      uid: user._id,
      meta: {}
    })
  ]);

export const deviceAlert = async ({ subject, text = '' }) =>
  sendEmail({
    to: config.get('email:devicealert:to'),
    from: config.get('email:devicealert:from'),
    bcc: config.get('email:devicealert:bcc'),
    subject: subject || config.get('email:devicealert:subject') || 'Friends+Me Device Alert',
    'o:tag': 'dead-alert',
    text
  });

export const teamFeatureTrialExpired = async ({ team, featureCode, featureName }) =>
  Promise.all([
    sendEmail({
      to: await recepients(
        'team-feature-trial-expired',
        team.members && team.members.owner,
        team.members && team.members.manager
      ),
      from: config.get('email:sender'),
      bcc: config.get('email:bcc'),
      subject: `Warning: Your Friends+Me ${featureName} feature trial has expired`,
      // 'o:tag': 'notifications',
      'o:tag': `team-feature-trial-expired${featureCode ? `-${featureCode}` : ''}`,
      html: renderEmail('team-feature-trial-expired', {
        team_id: team._id.toString(),
        team_name: teamName(team),
        feature_code: featureCode,
        feature_name: featureName
      })
    }),
    newEvent({
      name: 'team-feature-trial-expired',
      pid: team._id,
      meta: {
        team_id: team._id.toString(),
        team_name: teamName(team),
        feature_code: featureCode,
        feature_name: featureName
      }
    })
  ]);
