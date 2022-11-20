'use strict';

angular.module('fpmApp')
  .controller('TeamMembersCtrl', ['$rootScope', '$scope', '$state', '$apply', 'flash', 'dialogs', 'Google', 'Premium', '_', 'states', 'types', 'moment', 'Intercom', function($rootScope, $scope, $state, $apply, flash, dialogs, Google, Premium, _, states, types, moment, Intercom) {

    $scope.Google = Google;

    $scope.activeMembers = function() {
      return Premium.costs && Premium.costs.metrics && Premium.costs.metrics.member && Premium.costs.metrics.member.count || 0;
    };

    $scope.dailyPrice = function() {
      return '$'+$scope.money(Premium.costs && Premium.costs.metrics && Premium.costs.metrics.member && Premium.costs.metrics.member.daily || 0);
    };

    $scope.money = function(credit) {
      return Math.floor(credit/10000)/100;
    };

    $scope.roleName = function(role) {
      switch (role) {
      case 'contributor':
        return 'Contributor';
      case 'owner':
        return 'Team Owner';
      case 'manager':
        return 'Team Manager';
      case 'amanager':
        return 'Queue Manager';
      default:
        return 'Unknown';
      }
    };

    $scope.profileRole = function(profile) {
      var roles = ['owner','manager','amanager','contributor'];

      for (var i = 0; i < roles.length; i++) {
        if (_.contains(profile.members[roles[i]], Google.user._id)) {
          return $scope.roleName(roles[i]);
        }
      }

      return $scope.roleName();
    };

    $scope.switchProfile = function(profile) {
      $rootScope.switchToProfile(profile);
      $scope.load(true);
    };

    function checkNextInvitationAllowed(allowedCallback) {
      var maxPeople = (Google.profile.use.maxMembers || 0) + 1,
          profileMembers = _.chain(Google.profile.members).values().flatten().value().length,
          provileInvitations = _.size(Google.profile.invitations);

      var isAllowed = (profileMembers+provileInvitations) < maxPeople ? true : false;
      if (isAllowed) {
        return allowedCallback();
      }

      dialogs.premiumRequired({
        lines: function() {
          return [
            'It\'s great to see that you want to invite another team member!',
            'You can upgrade to <strong>invite more members</strong>.'
          ];
        },
        featureName: function() {return 'add-team-member';}
      });
    }

    function errMessage(err, defaultMsg) {
      return (err && err.error ? err.error.message || null : null) || defaultMsg;
    }

    function update(result) {

      Google.profile.members = result.profile.members;
      Google.profile.invitations = result.profile.invitations;

      var invitations = [];

      if (Google.profile.invitations && _.size(Google.profile.invitations)) {
        var pairs = _.pairs(Google.profile.invitations);

        for (var i = 0; i < pairs.length; i++) {
          pairs[i][1].id = pairs[i][0];
          invitations.push(pairs[i][1]);
        }
      }

      $scope.members = result.members;
      $scope.invitations = invitations;

      $apply($scope);
    }

    $scope.removeMember = function(member) {
      console.log('member', member);
      dialogs.confirm('Remove Team Member',
        'Please, confirm the removal of '+member.name+' team member.',
        'Remove Member',
        function() {
          Google.profileRemoveMember(member._id, function(err, result) {
            if (result) {
              Intercom.event('team_member_removed', { email: member.email, role: member.role });
              flash.success('Remove Team Member', 'Team member <strong>'+member.name+'</strong> was successfully removed.');
              update(result);
            } else {
              flash.error('Remove Team Member', errMessage(err, 'Removal of team member <strong>'+member.name+'</strong> failed. Please try again.'));
            }
          });
        });
    };

    $scope.cancelInvitation = function(invitation) {
      dialogs.confirm('Cancel Team Invitation',
        'Please, confirm the cancelation of '+invitation.email+' team invitation.',
        'Cancel Invitation',
        function() {
          Google.profileCancelInvitation(invitation.id,function(err, result) {
            if (result) {
              Intercom.event('team_member_invitation_canceled', { email: invitation.email, role: invitation.role });
              flash.success('Cancel Team Invitation', 'Team invitation for <strong>'+invitation.email+'</strong> was successfully canceled.');
              update(result);
            } else {
              flash.error('Cancel Team Invitation', errMessage(err, 'Cancellation of team invitation for <strong>'+invitation.email+'</strong> failed. Please try again.'));
            }
          });
        });
    };

    $scope.invite = function(email) {

      if (!email) {
        return '';
      }

      var myEmail = Google && Google.user && Google.user.email;
      if (myEmail && email === myEmail) {
        flash.error('Team Invitation', 'You cannot invite yourself as another manager.');
        return '';
      }

      checkNextInvitationAllowed(function() {
        Google.profileInviteMember({
          email: email,
          role: $scope.inviteRole
        },function(err, result) {
          if (result) {
            Intercom.event('team_member_invited', { email: email, role: $scope.inviteRole });
            flash.success('Team Invitation', 'Team invitation sent to <strong>'+email+'</strong>.');
            update(result);
          } else {
            flash.error('Team Invitation', errMessage(err, 'Failed to send team invitation to <strong>'+email+'</strong>. Please try again.'));
          }
        });
      });

      return '';
    };

    $scope.isExpired = function(account) {
      return account.expire ? (moment.utc(account.expire).unix() < moment.utc().unix() ? true : false) : false;
    };

    function accountTypeName(account, showFull) {
      var state = $scope.isExpired(account) ? 'Expired' :
            (account.state === states.account.enabled.code ? '' :
              (account.state === states.account.disabled.code ? 'Disabled' :
                (account.state === states.account.blocked.code ? 'Blocked' :
                  (account.state === states.account.reconnectRequired.code ? 'Reconnect Required' : '???'))));
      return types.typeNameOfAccount(account) + (showFull ? (state ? ' <strong class="deactivated">'+state+'</strong>' : '') : '');
    }
    $scope.accountTypeName = accountTypeName;

    $scope.listOfAccountsToAssign = function(member) {
      return _.filter(Google.profile.accounts, function(account) {
        return account.members && account.members.manager ?
               !_.contains(account.members.manager, member._id) : true;
      });
    };

    $scope.listOfAssignedAccounts = function(member) {
      return _.filter(Google.profile.accounts, function(account) {
        return account.members && account.members.manager ?
               _.contains(account.members.manager, member._id) : false;
      });
    };

    $scope.removeAssignedAccount = function(account, member) {
      Google.removeAccountMember(account, member._id, function(err, result) {
        if (err) {
          flash.error('Remove Queue Mamager', errMessage(err, 'Failed to remove team member from the list of queue managers.'));
        } else {
          if (result && result.account) {
            account.members = result.account.members;

            flash.success('Remove Queue Mamager', 'List of queue managers <strong>'+account.name+'</strong> successfully updated.');

            $apply($scope);
          }
        }
      });
    };

    $scope.assignAccount = function(account, member) {
      Google.addAccountMember(account, 'manager', member._id, function(err, result) {
        if (err) {
          flash.error('Add Queue Mamager', errMessage(err, 'Failed to add team member to the list of queue managers.'));
        } else {
          if (result && result.account) {
            account.members = result.account.members;

            flash.success('Add Queue Mamager', 'List of queue managers <strong>'+account.name+'</strong> successfully updated.');

            $apply($scope);
          }
        }
      });
      return false;
    };

    $scope.isUpgradeButtonDisabled = function () {
      var plan = Google.profile && Google.profile.plan && Google.profile.plan.name;
      return plan && !(plan === 'FREE' || plan === 'FREEFOREVER' || plan === 'TRIAL');
    };

    $scope.load = function(redir) {

      $scope.members = [];
      $scope.invitations = [];
      $scope.isOwner = _.contains(Google.profile.members.owner, Google.user._id);
      $scope.isManager = _.contains(Google.profile.members.manager, Google.user._id);
      $scope.isAccountManager = _.contains(Google.profile.members.amanager, Google.user._id);
      $scope.isOwnerOrManager = $scope.isOwner || $scope.isManager;
      $scope.inviteRole = $scope.isOwner ? 'manager' : 'contributor';

      if ($scope.isOwnerOrManager) {
        $scope.loadingMembers = true;
        Google.profileMembers(function(err, result) {
          $scope.loadingMembers = false;
          if (err) {
            flash.error('Loading Team Members', errMessage(err, 'Failed to load team members.'));
          } else {
            update(result);
            if (redir) {
              $state.go('profiles.pid.queue', { pid: Google.profile._id });
            }
          }
        });
      } else {
        $apply($scope);
        if (redir) {
          $state.go('profiles.pid.queue', { pid: Google.profile._id });
        }
      }
    };

    $scope.load();
  }]);
