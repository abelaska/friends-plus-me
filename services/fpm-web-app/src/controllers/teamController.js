/*jshint node: true */
'use strict';

const log = require('@fpm/logging').default;
const { Profile } = require('@fpm/db');
const _ = require('underscore');

module.exports = ({ router }) => {

  // https://localhost:9000/team/invitation/51bf1261c8c464646d000001/538c8afc5bb34f3619a3a596

  function signoutSession(req) {
    if (req.session && Object.keys(req.session).length) {
      _.chain(req.session).keys().without('cookie').each(function(key) {
        delete req.session[key];
      });
    }
  }

  router.get('/team/invitation/:profileId/:invitationId', function(req, res) {

    var profileId = req.params.profileId,
        invitationId = req.params.invitationId;

    delete req.session.teaminvitation;

    signoutSession(req);

    if (!profileId || !invitationId) {
      res.redirect('/');
      return;
    }

    Profile.findOne({_id: profileId}, '_id invitations', function(err, profile) {
      if (err || !profile) {
        log.error('Failed to find team invitation', {
          profileId: profileId,
          invitationId: invitationId,
          error: err});
        req.notify('error', 'Failed to process team invitation. Please try again.');
        res.redirect('/');
      } else {
        var invitation = profile.invitations ? profile.invitations[invitationId] : null;
        if (invitation) {
          req.session.teaminvitation = {
            id: invitationId,
            profileId: profileId,
            inviterId: invitation.inviterId,
            role: invitation.role
          };
          res.redirect('/signin');
        } else {
          log.warn('Applied team invitation not found', {
            profileId: profileId,
            invitationId: invitationId,
            error: err});
          req.notify('warning', 'Team invitation is no longer valid.');
          res.redirect('/');
        }
      }
    });
  });
};
