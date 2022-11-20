/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const { createError } = require('./error');
const { fetchDraftQuery, fetchPostQuery, doNotHaveWriteAccessToDraft, doNotHaveReadAccessToDraft } = require('./post');
const { existsTeamQuery, fetchTeamQuery, isNotUserTeamMember } = require('./team');
const { fetchQueueTeamQuery, canManageQueue, queueSizeLimitCheck } = require('./queue');

const fetchDraftForWrite = (module.exports.fetchDraftForWrite = async ({ user, query }) => {
  const dbPost = await fetchDraftQuery({ query });
  if (!dbPost) {
    return { error: createError('draft_not_found') };
  }

  if (doNotHaveWriteAccessToDraft({ user, dbPost })) {
    return { error: createError('access_denied') };
  }

  return { dbPost };
});

const fetchDraftForRead = (module.exports.fetchDraftForRead = async ({ user, query }) => {
  const dbPost = await fetchDraftQuery({ query });
  if (!dbPost) {
    return { error: createError('draft_not_found') };
  }

  if (doNotHaveReadAccessToDraft({ user, dbPost })) {
    return { error: createError('access_denied') };
  }

  return { dbPost };
});

const fetchPostForWrite = (module.exports.fetchPostForWrite = async ({ user, query }) => {
  const dbPost = await fetchPostQuery({ query });
  if (!dbPost) {
    return { error: createError('post_not_found') };
  }
  return { dbPost };
});

const fetchPostForRead = (module.exports.fetchPostForRead = async ({ user, query }) =>
  fetchPostForWrite({ user, query }));

const fetchTeamForWrite = (module.exports.fetchTeamForWrite = async ({ user, query, full }) => {
  const dbTeam = full ? await fetchTeamQuery({ query }) : await existsTeamQuery({ query });
  if (!dbTeam) {
    return { error: createError('team_not_found') };
  }

  if (isNotUserTeamMember({ user, teamId: dbTeam._id.toString() })) {
    return { error: createError('access_denied') };
  }

  return { dbTeam };
});

const fetchTeamForRead = (module.exports.fetchTeamForRead = async ({ user, query, full }) =>
  fetchTeamForWrite({ user, query, full }));

const fetchQueueTeamForWrite = (module.exports.fetchQueueTeamForWrite = async ({ user, query }) => {
  const dbTeam = await fetchQueueTeamQuery({ query });
  const dbQueue = dbTeam && dbTeam.accounts.length && dbTeam.accounts[0];
  if (!dbTeam || !dbQueue) {
    return { error: createError('queue_not_found') };
  }

  if (!canManageQueue({ user, dbTeam, dbQueue })) {
    return { error: createError('access_denied') };
  }

  return { dbTeam, dbQueue };
});

const fetchQueueTeamForSchedule = (module.exports.fetchQueueTeamForSchedule = async ({
  user,
  query,
  skipQueueSize
}) => {
  const { dbTeam, dbQueue, error } = await fetchQueueTeamForWrite({ user, query });
  if (error) {
    return { error };
  }

  if (dbTeam.isAccountBlocked(dbQueue)) {
    return { error: createError('queue_blocked') };
  }

  if (!skipQueueSize) {
    const { maxQueueSize, isQueueLimitReached } = await queueSizeLimitCheck({ dbTeam, dbQueue });
    if (isQueueLimitReached) {
      return {
        error: createError('queue_size_limit', `Queue size limit of ${maxQueueSize} post(s) reached.`)
      };
    }
  }

  return { dbTeam, dbQueue };
});

const fetchQueueTeamForRead = (module.exports.fetchQueueTeamForRead = async ({ user, query }) =>
  fetchQueueTeamForWrite({ user, query }));
