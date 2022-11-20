/* jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const { Profile } = require('@fpm/db');

const baseUrl = config.get('http:ui:redirect:url');

function errorUrl(pid) {
  return baseUrl + '/teams/'+(pid || '0')+'/queues/add';
}

exports.onlyProfileManager =
function onlyProfileManager(req, res, user, profileId, successCallback, profileSelect, overrideErrorUrl) {
  Profile.findById(profileId, profileSelect || null, function(err, profile) {
    if (profile) {
      if (user.canManageProfile(profile)) {
        successCallback(user, profile);
      } else {
        req.notify('warning', 'You are not allowed to manage this team.');
        res.redirect(overrideErrorUrl || errorUrl(profileId));
      }
    } else {
      if (err) {
        req.notify('error', 'Failed to find team in database.');
        log.error('Failed to find profile '+profileId+' in database for auth', {error: err});
        res.redirect(overrideErrorUrl || errorUrl(profileId));
      } else {
        req.notify('warning', 'Team not found in database.');
        log.error('Team '+profileId+' not found, cannot auth');
        res.redirect(overrideErrorUrl || errorUrl(profileId));
      }
    }
  });
};

exports.onlyAccountManager =
function onlyAccountManager(req, res, user, accountId, successCallback, profileSelect, overrideErrorUrl) {
  Profile.findOne({'accounts._id': accountId}, profileSelect || null, function(err, profile) {
    if (profile) {
      var account = profile.findAccountById(accountId);
      if (user.canManageProfile(profile) || user.canManageAccount(account)) {
        successCallback(user, profile, account);
      } else {
        req.notify('warning', 'You are not allowed to manage this queue.');
        res.redirect(overrideErrorUrl || errorUrl(profile._id.toString()));
      }
    } else {
      if (err) {
        req.notify('error', 'Failed to find team in database.');
        log.error('Failed to find team with queue '+accountId, {error: err});
        res.redirect(overrideErrorUrl || errorUrl(profile._id.toString()));
      } else {
        req.notify('warning', 'Team not found in database.');
        log.error('Failed to find team with queue '+accountId);
        res.redirect(overrideErrorUrl || errorUrl(profile._id.toString()));
      }
    }
  });
};

function onlyAccountManagerRest(res, user, accountId, successCallback, profileSelect) {
  if (!accountId) {
    res.status(404).send({error: {message: 'Team with queue '+accountId+' not found'}});
    return;
  }
  Profile.findOne({'accounts._id': accountId}, profileSelect || null, function(err, profile) {
    if (profile) {
      var account = profile.findAccountById(accountId);
      if (!account) {
        res.status(500).send({error: {message: 'Team '+profile.id.toString()+' queue '+accountId+' not found'}});
      } else
      if (user.canManageProfile(profile) || user.canManageAccount(account)) {
        successCallback(user, profile, account);
      } else {
        res.status(403).send({error: {message: 'User <strong>'+user.name+'</strong> is not allowed to manage queue <strong>'+account.name+'</strong> of team '+profile.id.toString()}});
      }
    } else {
      if (err) {
        log.error('Failed to find team with queue '+accountId, {
          error: err});
        res.status(500).send({error: {message: 'Failed to find team with queue '+accountId}});
      } else {
        res.status(404).send({error: {message: 'Team with queue '+accountId+' not found'}});
      }
    }
  });
}

function onlyProfileManagerRest(res, user, profileId, successCallback, profileSelect) {
  Profile.findById(profileId, profileSelect || null, function(err, profile) {
    if (profile) {
      if (user.canManageProfile(profile)) {
        successCallback(user, profile);
      } else {
        res.status(403).send({error: {message: 'User '+user._id.toString()+' is not allowed to manage team '+profileId}});
      }
    } else {
      if (err) {
        log.error('onlyProfileManagerRest: failed to find team '+profileId, {
          error: err});
        res.status(500).send({error: {message: 'Failed to find team '+profileId}});
      } else {
        res.status(404).send({error: {message: 'Team '+profileId+' not found'}});
      }
    }
  });
}

function everyProfileTeamMember(user, profileId, successCallback, errorCallback, profileSelect) {
  Profile.findById(profileId, profileSelect || null, function(err, profile) {
    if (profile) {
      if (user.isTeamMember(profile)) {
        return successCallback(user, profile);
      }
      return errorCallback && errorCallback({message: 'User '+user._id.toString()+' is not team '+profileId+' member'});
    }
    if (err) {
      log.error('everyProfileTeamMember: failed to find team '+profileId, {
        error: err});
      return errorCallback && errorCallback({message: 'Failed to find team '+profileId});
    }
    if (errorCallback) { errorCallback({message: 'Team '+profileId+' not found'}); }
  });
}

function everyProfileTeamMemberRest(res, user, profileId, successCallback, profileSelect) {
  Profile.findById(profileId, profileSelect || null, function(err, profile) {
    if (profile) {
      if (user.isTeamMember(profile)) {
        successCallback(user, profile);
      } else {
        res.status(403).send({error: {message: 'User '+user._id.toString()+' is not team '+profileId+' team member'}});
      }
    } else {
      if (err) {
        log.error('everyProfileTeamMemberRest: failed to find team '+profileId, {
          error: err});
        res.status(500).send({error: {message: 'Failed to find team '+profileId}});
      } else {
        res.status(404).send({error: {message: 'Team '+profileId+' not found'}});
      }
    }
  });
}

function onlyAccountManagerRestMiddleware(req, res, next) {
  onlyAccountManagerRest(res, req.user, req.params.accountId, function(user, profile, account) {
    req.profile = profile;
    req.account = account;
    next();
  });
}

function onlyProfileManagerRestMiddleware(req, res, next) {
  onlyProfileManagerRest(res, req.user, req.params.profileId, function(user, profile) {
    req.profile = profile;
    next();
  });
}

exports.rest = {
  onlyProfileManager: onlyProfileManagerRest,
  onlyAccountManager: onlyAccountManagerRest,
  everyProfileTeamMember: everyProfileTeamMember,
  everyProfileTeamMemberRest: everyProfileTeamMemberRest,
  middleware: {
    onlyAccountManager: onlyAccountManagerRestMiddleware,
    onlyProfileManager: onlyProfileManagerRestMiddleware
  }
};
