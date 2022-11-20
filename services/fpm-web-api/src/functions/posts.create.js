/* eslint no-case-declarations: "off" */
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { args, method, json, sanitizeBody, rateLimit, extractScheduleArgs } = require('../utils/http');
const { scheduleAndSavePost } = require('../utils/scheduling');
const { validateBody } = require('../utils/validations');
const { fetchQueueTeamForSchedule } = require('../utils/access');
const {
  previewPost,
  transformDbPost,
  enhancePostsUsers,
  storePreviewAttachments,
  createPost
} = require('../utils/post');

module.exports = [
  method('POST'),
  args('queue'),
  json(),
  validateBody(),
  oauth(),
  scopes('admin', 'posts', 'posts.schedule'),
  rateLimit(),
  sanitizeBody('html'),
  async req => {
    const { query, user, deps: { postScheduler, assetsManager, queueManager } } = req;

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

    const { dbTeam, dbQueue, error: queueError } = await fetchQueueTeamForSchedule({ query, user });
    if (queueError) {
      return queueError;
    }

    if (repeat && !dbQueue.ng) {
      return createError('invalid_request', `Queue ${dbQueue._id.toString()} do not support repeat publishing`);
    }

    const { preview, error: previewError } = await previewPost(req.body);
    if (previewError) {
      return previewError;
    }

    const { dbPost, htmlShortened } = createPost({ user, dbTeam, dbQueue, noChanneling, html: preview.html });

    if (preview.attachments !== undefined) {
      await storePreviewAttachments({ user, dbTeam, dbPost, assetsManager, attachments: preview.attachments || [] });
    }

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
    const post = (await enhancePostsUsers({ posts }))[0];

    return {
      ok: true,
      html_shortened: htmlShortened,
      post
    };
  }
];
