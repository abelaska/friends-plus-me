/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const Promise = require('bluebird');
const { ObjectId, User, Profile, ProfileName } = require('@fpm/db');
const log = require('@fpm/logging').default;
const { unix } = require('./time');
const { teamQueues, enhanceQueuesUsers } = require('./queue');

const mapTeamMemberRole = {
  owner: 'owner',
  manager: 'tmanager',
  amanager: 'qmanager',
  contributor: 'contributor'
};

const transformDbTeam = (module.exports.transformDbTeam = async ({ user, dbTeam, excludeMembers, excludeQueues }) => {
  const tm3 = new Date();
  const profileName = await ProfileName.findOne({ uid: user._id, pid: dbTeam._id }, 'name').exec();

  const members =
    !excludeMembers &&
    Object.keys(dbTeam.members)
      .map(role => dbTeam.members[role].map(m => ({ role: mapTeamMemberRole[role], user_id: m.toString() })))
      .reduce((r, v) => r.concat(v), []);

  const tm2 = new Date();
  const queues = excludeQueues ? undefined : await teamQueues({ user, dbTeam });
  log.debug(`transformDbTeam:queues tm:${new Date() - tm2}`);
  log.debug(`transformDbTeam:team tm:${new Date() - tm3}`);

  return {
    team_id: dbTeam._id.toString(),
    created: unix(dbTeam.created),
    name: (profileName && profileName.name) || dbTeam.name,
    members,
    queues
  };
});

const extractTeams = async ({ user, dbTeams, excludeMembers, excludeQueues }) => {
  const tm = new Date();
  dbTeams = await Promise.map(
    dbTeams,
    async dbTeam => transformDbTeam({ user, dbTeam, excludeMembers, excludeQueues }),
    {
      concurrency: 16
    }
  );
  log.debug(`extractTeams tm:${new Date() - tm}`);
  return dbTeams;
};

const fetchUserTeams = async ({ user, teamId, excludeMembers, excludeQueues }) => {
  const query = teamId ? { _id: teamId } : { _id: { $in: user.memberOfProfiles } };
  const dbTeams = await Profile.find(query, '_id created name members accounts use').exec();
  return extractTeams({ user, dbTeams, excludeMembers, excludeQueues });
};

const assignUserForFetch = ({ userId, users, fetchUsers }) => {
  if (!users[userId] || typeof users[userId] !== 'object') {
    users[userId] = 1;
    fetchUsers.push(userId);
  }
};

const enhanceTeamsUsers = async ({ teams, users, isEmailVisible }) => {
  const tm = new Date();
  const fetchUsers = [];

  users = users || {};

  teams.forEach(t => {
    if (t.members) {
      t.members.forEach(m => assignUserForFetch({ users, fetchUsers, userId: m.user_id }));
    }
    if (t.queues) {
      t.queues.forEach(q => assignUserForFetch({ users, fetchUsers, userId: q.created_by.user_id }));
    }
  });

  if (fetchUsers.length) {
    (await User.find(
      { _id: { $in: fetchUsers } },
      `_id name image${isEmailVisible ? ' email' : ''}`
    ).exec()).forEach(u => {
      users[u._id.toString()] = {
        name: u.name,
        avatar: u.image,
        email: u.email
      };
    });
  }

  await Promise.mapSeries(teams, async t => {
    if (t.members) {
      t.members = t.members.map(m => {
        const user = users[m.user_id];
        if (user) {
          m.name = user.name;
          m.avatar = user.avatar;
          m.email = user.email;
        }
        return m;
      });
    }
    if (t.queues) {
      t.queues = await enhanceQueuesUsers({ isEmailVisible, users, queues: t.queues });
    }
  });

  log.debug(`enhanceTeamsUsers tm:${new Date() - tm}`);

  return teams;
};

const existsTeam = (module.exports.existsTeam = async teamId => Profile.findOne({ _id: teamId }, '_id').exec());

const fetchTeam = (module.exports.fetchTeam = async teamId =>
  Profile.findOne({ _id: teamId }, '_id created name members accounts use').exec());

const fetchTeamQuery = (module.exports.fetchTeamQuery = async ({ query }) => {
  const teamId = query && query.team && ObjectId.isValid(query.team) && query.team;
  return teamId && fetchTeam(teamId);
});

const existsTeamQuery = (module.exports.existsTeamQuery = async ({ query }) => {
  const teamId = query && query.team && ObjectId.isValid(query.team) && query.team;
  return teamId && existsTeam(teamId);
});

const listTeams = (module.exports.listTeams = async ({ user, isEmailVisible, excludeMembers, excludeQueues }) =>
  enhanceTeamsUsers({ isEmailVisible, teams: await fetchUserTeams({ user, excludeMembers, excludeQueues }) }));

const infoTeam = (module.exports.infoTeam = async ({ user, dbTeam, isEmailVisible, excludeMembers, excludeQueues }) => {
  const teams = await enhanceTeamsUsers({
    isEmailVisible,
    teams: await extractTeams({ user, dbTeams: [dbTeam], excludeMembers, excludeQueues })
  });
  return teams.length && teams[0];
});

const isUserRoleContributor = (module.exports.isUserRoleContributor = ({ user, dbTeam, teamId }) => {
  const pid = (dbTeam && dbTeam._id && dbTeam._id.toString()) || (teamId && teamId.toString());
  const contributors = user.profiles && user.profiles.contributor;
  return (contributors && contributors.some(p => p.toString() === pid)) || false;
});

const isUserTeamMember = (module.exports.isUserTeamMember = ({ user, dbTeam, teamId }) => {
  const pid = (dbTeam && dbTeam._id && dbTeam._id.toString()) || (teamId && teamId.toString());
  return user.memberOfProfiles.indexOf(pid) > -1;
});

const isNotUserTeamMember = (module.exports.isNotUserTeamMember = ({ user, dbTeam, teamId }) =>
  !isUserTeamMember({ user, dbTeam, teamId }));
