const { oauth, scopes } = require('../utils/oauth');
const { method, json, sanitizeBody, rateLimit } = require('../utils/http');
const { validateBody } = require('../utils/validations');
const { previewPost } = require('../utils/post');

module.exports = [
  method('POST'),
  json(),
  validateBody(),
  oauth(),
  scopes('admin', 'drafts', 'drafts.write', 'posts', 'posts.write'),
  rateLimit(),
  sanitizeBody('html'),
  async req => {
    const { preview: post, error: previewError } = await previewPost(req.body);
    if (previewError) {
      return previewError;
    }
    return { ok: true, post };
  }
];
