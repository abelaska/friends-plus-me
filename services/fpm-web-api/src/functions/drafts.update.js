/* eslint no-case-declarations: "off" */
const { oauth, scopes } = require('../utils/oauth');
const { args, method, json, sanitizeBody, rateLimit } = require('../utils/http');
const { unix } = require('../utils/time');
const { validateBody } = require('../utils/validations');
const { fetchDraftForWrite, fetchTeamForWrite } = require('../utils/access');
const {
  postsToDrafts,
  previewPost,
  transformDbPost,
  enhancePostsUsers,
  storePreviewAttachments
} = require('../utils/post');

module.exports = [
  method('POST'),
  args('draft'),
  json(),
  validateBody(),
  oauth(),
  scopes('admin', 'drafts', 'drafts.write'),
  rateLimit(),
  sanitizeBody('html'),
  async req => {
    const { query, user, deps: { assetsManager } } = req;

    const { dbPost, error } = await fetchDraftForWrite({ query, user });
    if (error) {
      return error;
    }

    const { dbTeam, error: teamError } = await fetchTeamForWrite({
      user,
      query: { team: dbPost.pid.toString() }
    });
    if (teamError) {
      return teamError;
    }

    const { preview, error: previewError } = await previewPost(req.body);
    if (previewError) {
      return previewError;
    }

    dbPost.modified = unix(new Date());
    dbPost.modifiedBy = user._id;

    if (preview.html !== undefined) {
      dbPost.html = preview.html;
    }

    if (preview.attachments !== undefined) {
      dbPost.attachments = {};
      dbPost.markModified('attachments');

      await storePreviewAttachments({ user, dbTeam, dbPost, assetsManager, attachments: preview.attachments || [] });
    }

    await dbPost.save();

    const posts = [await transformDbPost({ dbPost })];
    const draft = postsToDrafts(await enhancePostsUsers({ posts }))[0];

    return { ok: true, draft };
  }
];
