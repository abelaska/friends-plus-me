/* eslint no-case-declarations: "off" */
const { createError } = require('../utils/error');
const { oauth, scopes, isEmailVisibleByScope } = require('../utils/oauth');
const { args, method, rateLimit, extractScheduleArgs } = require('../utils/http');
const { scheduleAndSavePost } = require('../utils/scheduling');
const { transformDbPost, enhancePostsUsers, createPost } = require('../utils/post');
const { fetchDraftForWrite, fetchQueueTeamForSchedule } = require('../utils/access');

module.exports = [
  method('GET'),
  args('draft', 'queue'),
  oauth(),
  scopes('admin', 'posts', 'posts.schedule'),
  rateLimit(),
  async req => {
    const { query, user, deps: { postScheduler, queueManager } } = req;

    const {
      noChanneling,
      schedule,
      publishAt,
      repeat,
      repeatCount,
      repeatInterval,
      repeatIntervalUnit,
      error: scheduleArgsError
    } = extractScheduleArgs({ query });
    if (scheduleArgsError) {
      return scheduleArgsError;
    }

    const { dbPost: dbDraft, error: draftError } = await fetchDraftForWrite({ query, user });
    if (draftError) {
      return draftError;
    }

    const { dbTeam, dbQueue, error: queueError } = await fetchQueueTeamForSchedule({ query, user });
    if (queueError) {
      return queueError;
    }

    if (repeat && !dbQueue.ng) {
      return createError('invalid_request', `Queue ${dbQueue._id.toString()} do not support repeat publishing`);
    }

    const { dbPost, htmlShortened } = createPost({
      user,
      dbTeam,
      dbQueue,
      noChanneling,
      html: dbDraft.html,
      attachments: dbDraft.attachments
    });

    await scheduleAndSavePost({
      dbPost,
      dbQueue,
      schedule,
      publishAt,
      repeatCount,
      repeatInterval,
      repeatIntervalUnit,
      postScheduler,
      queueManager
    });

    const posts = [await transformDbPost({ dbPost })];
    const post = (await enhancePostsUsers({ posts, isEmailVisible: isEmailVisibleByScope(req) }))[0];

    return {
      ok: true,
      html_shortened: htmlShortened,
      post
    };
  }
];
