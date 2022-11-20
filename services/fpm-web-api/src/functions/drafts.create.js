/* eslint no-case-declarations: "off" */
const { Post } = require('@fpm/db');
const { oauth, scopes } = require('../utils/oauth');
const { args, method, json, sanitizeBody, rateLimit } = require('../utils/http');
const { validateBody } = require('../utils/validations');
const { fetchTeamForWrite } = require('../utils/access');
const {
  postsToDrafts,
  previewPost,
  transformDbPost,
  enhancePostsUsers,
  storePreviewAttachments
} = require('../utils/post');

module.exports = [
  method('POST'),
  args('team'),
  json(),
  validateBody(),
  oauth(),
  scopes('admin', 'drafts', 'drafts.write'),
  rateLimit(),
  sanitizeBody('html'),
  async req => {
    const { query, user, deps: { assetsManager } } = req;

    const { dbTeam, error } = await fetchTeamForWrite({ user, query });
    if (error) {
      return error;
    }

    const { preview, error: previewError } = await previewPost(req.body);
    if (previewError) {
      return previewError;
    }

    const dbPost = new Post({
      source: 'api',
      pid: dbTeam._id,
      createdBy: user._id,
      html: preview.html
    });

    if (preview.attachments !== undefined) {
      await storePreviewAttachments({ user, dbTeam, dbPost, assetsManager, attachments: preview.attachments || [] });
    }

    await dbPost.save();

    const posts = [await transformDbPost({ dbPost })];
    const draft = postsToDrafts(await enhancePostsUsers({ posts }))[0];

    return { ok: true, draft };
  }
];
