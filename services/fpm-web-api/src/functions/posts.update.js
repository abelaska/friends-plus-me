const { States } = require('@fpm/constants');
const { oauth, scopes } = require('../utils/oauth');
const { createError } = require('../utils/error');
const { args, method, json, sanitizeBody, rateLimit } = require('../utils/http');
const { unix } = require('../utils/time');
const { validateBody } = require('../utils/validations');
const { fetchPostForWrite, fetchQueueTeamForWrite } = require('../utils/access');
const {
  previewPost,
  transformDbPost,
  enhancePostsUsers,
  storePreviewAttachments,
  shortenPostHtml
} = require('../utils/post');

module.exports = [
  method('POST'),
  args('post'),
  json(),
  validateBody(),
  oauth(),
  scopes('admin', 'posts', 'posts.write'),
  rateLimit(),
  sanitizeBody('html'),
  async req => {
    const { query, user, deps: { assetsManager } } = req;

    const { dbPost, error: postError } = await fetchPostForWrite({ user, query });
    if (postError) {
      return postError;
    }
    if (States.post.published.code === dbPost.state) {
      return createError('invalid_post_state');
    }

    const { dbTeam, dbQueue, error: queueError } = await fetchQueueTeamForWrite({
      user,
      query: { queue: dbPost.aid.toString() }
    });
    if (queueError) {
      return queueError;
    }

    const { preview, error: previewError } = await previewPost(req.body);
    if (previewError) {
      return previewError;
    }

    dbPost.modified = unix(new Date());
    dbPost.modifiedBy = user._id;

    let htmlShortened = false;

    if (preview.html !== undefined) {
      dbPost.html = preview.html;
      const { htmlShortened: hs } = shortenPostHtml({ dbQueue, dbPost });
      htmlShortened = hs;
    }

    if (preview.attachments !== undefined) {
      dbPost.attachments = {};
      dbPost.markModified('attachments');

      await storePreviewAttachments({ user, dbTeam, dbPost, assetsManager, attachments: preview.attachments || [] });
    }

    // TODO co s tim?
    // if (dbPost.attachments && dbPost.attachments.link && dbPost.attachments.link.short && dbPost.attachments.link.short.aid) {
    //   dbPost.attachments.link.short.aid = new ObjectId(dbPost.attachments.link.short.aid);
    // }

    await dbPost.save();

    const posts = [await transformDbPost({ dbPost })];
    const post = (await enhancePostsUsers({ posts }))[0];

    return {
      ok: true,
      html_shortened: htmlShortened,
      post
    };
  }
];
