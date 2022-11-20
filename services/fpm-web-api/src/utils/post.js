/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const Promise = require('bluebird');
const sanitizeHtml = require('sanitize-html');
const log = require('@fpm/logging').default;
const { PostText } = require('@fpm/post');
const { States, Types } = require('@fpm/constants');
const { dbUpdatedCount, ObjectId, User, Post, Queue } = require('@fpm/db');
const { unix } = require('./time');
const { createError } = require('./error');
const { isEmailVisibleByScope } = require('./oauth');
const { isUserRoleContributor, isUserTeamMember } = require('./team');
const { crawlPicturesToAttachments, crawlLinkToAttachments } = require('./crawler');

const mapPostState = (module.exports.mapPostState = dbPost => {
  if (dbPost.blockedAt && !dbPost.ng) {
    return 'paused';
  }
  switch (dbPost.state) {
    case States.post.failed.code:
      return 'failed';
    case States.post.published.code:
      return 'published';
    case States.post.publishing.code:
      return 'publishing';
    case States.post.retry.code:
    case States.post.scheduledByScheduler.code:
    case States.post.scheduledByUser.code:
    case States.post.scheduled.code:
      return 'scheduled';
    case States.post.draft.code:
      return 'draft';
    default:
      return 'unknown';
  }
});

const transformDbPostAttachments = dbPost => {
  const atts = [];
  const link = dbPost.attachments && dbPost.attachments.link;
  const photo = (dbPost.attachments && dbPost.attachments.photo) || (link && link.photo);
  if (link) {
    atts.push({
      type: 'link',
      url: link.url,
      title: link.title,
      description: link.description,
      picture:
        (photo && {
          url: photo.url,
          width: photo.width,
          height: photo.height,
          content_type: photo.contentType
        }) ||
        undefined
    });
  } else if (photo) {
    atts.push({
      type: 'picture',
      url: photo.url,
      width: photo.width,
      height: photo.height,
      content_type: photo.contentType
    });
  }
  return (atts.length && atts) || undefined;
};

const fpmUser = (module.exports.fpmUser = {
  name: 'Friends+Me',
  avatar: 'https://friendsplus.me/static/android-chrome-48x48.png'
});

const transformDbPostService = (module.exports.transformDbPostService = dbPost =>
  ((dbPost.uid || dbPost.accountCode) && {
    id: dbPost.uid,
    type:
      (!isNaN(dbPost.accountCode) && Types.codeToNetworkAndAccount(dbPost.accountCode).network.typeName) || undefined,
    category:
      (!isNaN(dbPost.accountCode) && Types.codeToNetworkAndAccount(dbPost.accountCode).account.typeName) || undefined
  }) ||
  undefined);

const transformDbPostPublish = (module.exports.transformDbPostPublish = dbPost =>
  (dbPost.publish &&
    dbPost.publish.count > 1 && {
      count: dbPost.publish.count,
      at: dbPost.publish.publishAt.map(t => unix(t)),
      published_at: dbPost.publish.publishedAt.map(t => unix(t)),
      failed_at: dbPost.publish.failedAt.map(t => unix(t)),
      interval: `${dbPost.publish.interval}${dbPost.publish.intervalUnit.substr(0, 1)}`
    }) ||
  undefined);

const transformDbPost = (module.exports.transformDbPost = async ({ dbPost }) => ({
  post_id: dbPost._id.toString(),
  queue_id: dbPost.aid && dbPost.aid.toString(),
  team_id: dbPost.pid.toString(),
  created: unix(dbPost.createdAt),
  created_by:
    (dbPost.createdBy && {
      user_id: dbPost.createdBy.toString()
    }) ||
    fpmUser,
  modified: dbPost.modifiedAt && unix(dbPost.modifiedAt),
  modified_by: dbPost.modifiedBy && {
    user_id: dbPost.modifiedBy.toString()
  },
  publish_at: unix(dbPost.publishAt),
  completed_at: dbPost.completedAt && unix(dbPost.completedAt),
  service: transformDbPostService(dbPost),
  state: mapPostState(dbPost),
  html: dbPost.html,
  url: dbPost.url,
  attachments: transformDbPostAttachments(dbPost),
  publish: transformDbPostPublish(dbPost)
}));

const assignUserForFetch = ({ userId, users, fetchUsers }) => {
  if (!users[userId] || typeof users[userId] !== 'object') {
    users[userId] = 1;
    fetchUsers.push(userId);
  }
};

const enhancePostsUsers = (module.exports.enhancePostsUsers = async ({ posts, users, isEmailVisible }) => {
  const tm = new Date();
  const fetchUsers = [];

  users = users || {};

  const props = ['created_by', 'modified_by'];

  let userId;
  posts.forEach(p => {
    props.forEach(prop => {
      if (p[prop] && p[prop].user_id) {
        assignUserForFetch({ users, fetchUsers, userId: p[prop].user_id });
      }
    });
  });

  if (fetchUsers.length) {
    (await User.find({ _id: { $in: fetchUsers } }, `_id name image${isEmailVisible ? ' email' : ''}`).exec()).forEach(
      u => {
        users[u._id.toString()] = {
          name: u.name,
          avatar: u.image,
          email: u.email
        };
      }
    );
  }

  let user;
  posts = posts.map(p => {
    props.forEach(prop => {
      user = p[prop] && p[prop].user_id && users[p[prop].user_id];
      if (user) {
        p[prop].email = user.email;
        p[prop].name = user.name;
        p[prop].avatar = user.avatar;
      }
    });
    return p;
  });

  log.debug(`enhancePostsUsers tm:${new Date() - tm}`);

  return posts;
});

const secureHtml = (module.exports.secureHtml = async html => {
  html = (html || '').trim().replace(/\n/g, '</p><p>');
  if (!html.match(/^<\s*p[^>]*\s*>/)) {
    html = `<p>${html}</p>`;
  }
  // validate html content https://github.com/punkave/sanitize-html
  return sanitizeHtml(html, {
    allowedTags: ['p', 'b', 'i', 's'],
    parser: {
      lowerCaseTags: true,
      decodeEntities: true,
      lowerCaseAttributeNames: true
    }
  });
});

const fetchPost = (module.exports.fetchPost = async ({ postId, query = {} }) =>
  Post.findOne({ _id: postId, ...query }).exec());

const fetchPostQuery = (module.exports.fetchPostQuery = async ({ query }) => {
  const postId = query && query.post && ObjectId.isValid(query.post) && query.post;
  return postId && fetchPost({ postId, query: { state: { $ne: States.post.draft.code } } });
});

const fetchDraftQuery = (module.exports.fetchDraftQuery = async ({ query }) => {
  const postId = query && query.draft && ObjectId.isValid(query.draft) && query.draft;
  return postId && fetchPost({ postId, query: { state: States.post.draft.code } });
});

const deletePost = (module.exports.deletePost = async postId => {
  return dbUpdatedCount(await Post.remove({ _id: postId })) > 0;
});

const previewPost = (module.exports.previewPost = async ({ html, link, picture, pictures }) => {
  let preview;
  try {
    preview = {
      html: html === undefined ? undefined : await secureHtml(html),
      attachments: link
        ? await crawlLinkToAttachments(link, picture)
        : pictures ? await crawlPicturesToAttachments(pictures) : undefined
    };
  } catch (e) {
    if (e.error_code) {
      return { error: createError(e.error_code, e.toString()) };
    }
    throw e;
  }
  return { preview };
});

const storePicture = (module.exports.storePicture = async ({ url, user, dbTeam, assetsManager }) => {
  const asset = await assetsManager.fetchAndStorePicture({ url, user, pid: dbTeam._id });
  const picture = {
    original: url,
    url: asset.picture.proxy,
    gcs: asset.picture.url,
    width: asset.picture.width,
    height: asset.picture.height,
    aniGif: asset.picture.aniGif,
    contentType: asset.picture.contentType,
    isFullBleed:
      asset.picture.width >= 506 && asset.picture.height >= 303 && asset.picture.width / asset.picture.height <= 5 / 2
  };
  return picture;
});

const storePreviewAttachments = (module.exports.storePreviewAttachments = async ({
  user,
  dbTeam,
  dbPost,
  attachments,
  assetsManager
}) =>
  // fetch and store pictures
  Promise.map(
    attachments,
    async ({ type, url, description, title, picture }) => {
      dbPost.attachments = dbPost.attachments || {};
      switch (type) {
        case 'link': {
          const picUrl = picture && picture.url;
          const photo = (picUrl && (await storePicture({ user, dbTeam, assetsManager, url: picUrl }))) || undefined;
          dbPost.attachments.link = {
            url,
            photo,
            title,
            description
          };
          break;
        }
        case 'picture': {
          const pic = await storePicture({ url, user, dbTeam, assetsManager });
          if (dbPost.attachments.gallery) {
            dbPost.attachments.gallery.push(pic);
          } else if (dbPost.attachments.photo) {
            dbPost.attachments.gallery = [dbPost.attachments.photo, pic];
            dbPost.attachments.photo = undefined;
          } else {
            dbPost.attachments.photo = pic;
          }
          break;
        }
        default:
          break;
      }
    },
    { concurrency: 4 }
  ));

const postsToDrafts = (module.exports.postsToDrafts = posts =>
  posts.map(p => ({
    draft_id: p.post_id,
    ...p,
    post_id: undefined,
    state: undefined
  })));

const haveWriteAccessToDraft = (module.exports.haveWriteAccessToDraft = ({ user, dbPost }) => {
  const dbTeam = { _id: dbPost.pid };
  const isDraftOwner = dbPost.createdBy && dbPost.createdBy.toString() === user._id.toString();
  const isContributor = isUserRoleContributor({ user, dbTeam });
  if (isContributor) {
    return isDraftOwner;
  }
  return isUserTeamMember({ user, dbTeam });
});

const doNotHaveWriteAccessToDraft = (module.exports.doNotHaveWriteAccessToDraft = ({ user, dbPost }) =>
  !haveWriteAccessToDraft({ user, dbPost }));

const haveReadAccessToDraft = (module.exports.haveReadAccessToDraft = ({ user, dbPost }) =>
  haveWriteAccessToDraft({ user, dbPost }));

const doNotHaveReadAccessToDraft = (module.exports.doNotHaveReadAccessToDraft = ({ user, dbPost }) =>
  !haveReadAccessToDraft({ user, dbPost }));

const shortenPostHtml = (module.exports.shortenPostHtml = ({ dbQueue, dbPost }) => {
  const isTwitter = dbQueue.network === Types.network.twitter.code;
  const isFacebook = dbQueue.network === Types.network.facebook.code;
  const isLinkedin = dbQueue.network === Types.network.linkedin.code;

  const shortenedHtml = isTwitter
    ? PostText.shortenTweetHtml(dbPost)
    : isFacebook
      ? PostText.shortenFacebookHtml(dbPost)
      : isLinkedin ? PostText.shortenLinkedinHtml(dbPost) : dbPost.html;
  const htmlShortened = dbPost.html !== shortenedHtml;

  dbPost.html = shortenedHtml;

  return { dbPost, htmlShortened };
});

const createPost = (module.exports.createPost = ({ user, dbTeam, dbQueue, html, attachments, noChanneling }) => {
  const isGoogle = dbQueue.network === Types.network.google.code;
  const dbPost = new Post({
    html,
    attachments,
    source: 'api',
    aid: dbQueue._id,
    pid: dbTeam._id,
    uid: dbQueue.uid,
    ng: dbQueue.ng,
    parentUid: dbQueue.parentUid,
    createdBy: user._id,
    appendNoShare: !!(isGoogle && noChanneling),
    categoryId: dbQueue.category && dbQueue.category.id,
    accountCode: Types.createCode(dbQueue.network, dbQueue.account),
    // this will make sure fpm-srv-publisher ignore this posts kju-srv-publisher can publish the post
    blockedAt: dbQueue.state === States.account.enabled.code && !dbQueue.ng ? null : new Date(),
    processor: `post:${Types.networkTypeName(dbQueue.network)}:${Types.accountTypeName(dbQueue.account)}`,
    extension: {
      publishers: (isGoogle && !dbQueue.publishViaApi && dbTeam.usersWhoCanPublishToAccount(dbQueue)) || []
    }
  });
  return shortenPostHtml({ dbQueue, dbPost });
});

const pagePosts = (module.exports.pagePosts = async ({ req, query, dbSortField, dbSortDirection = 1 }) => {
  const { inclusive, latest, oldest, count } = req.paging;

  query[dbSortField] = {
    $lt: new Date((latest + (inclusive ? 1 : 0)) * 1000),
    $gt: new Date((oldest - (inclusive ? 0 : -1)) * 1000)
  };

  const dbPosts = await Post.find(query)
    .sort({ [dbSortField]: dbSortDirection })
    .limit(count)
    .exec();
  const posts = await enhancePostsUsers({
    isEmailVisible: isEmailVisibleByScope(req),
    posts: await Promise.map(dbPosts, async dbPost => transformDbPost({ dbPost }), { concurrency: 16 })
  });

  const retLatest = (dbPosts.length && unix(dbPosts[dbPosts.length - 1][dbSortField])) || undefined;
  const hasMore = posts.length === count;

  return { posts, has_more: hasMore, latest: retLatest };
});

const pagePostsNg = (module.exports.pagePostsNg = async ({ req, query, dbSortDirection = 1 }) => {
  const { inclusive, latest, oldest, count } = req.paging;

  const dbQueues = await Queue.find(query, { 'posts.list': 1 })
    .lean()
    .exec();
  const list = dbQueues
    .map(q => q.posts.list.map(({ _id, at, lck }) => ({ _id, lck, at: at.valueOf() })))
    .reduce((r, l) => r.concat(l), [])
    .sort((a, b) => a.at - b.at);
  const lt = (latest + (inclusive ? 1 : 0)) * 1000;
  const gt = (oldest - (inclusive ? 0 : -1)) * 1000;

  let p;
  let at;
  let idx = 0;
  const postsList = [];
  const postIdUniq = {};
  while (postsList.length < count && idx < list.length) {
    p = list[idx];
    at = list[idx].at;
    if (at > gt && at < lt) {
      postIdUniq[p._id.toString()] = 1;
      if (dbSortDirection === -1) {
        postsList.unshift(p);
      } else {
        postsList.push(p);
      }
    }
    idx++;
  }

  const postIds = Object.keys(postIdUniq);
  const dbPosts = await Post.find({ _id: { $in: postIds } })
    .lean()
    .exec();
  const enhancedPosts = await enhancePostsUsers({
    isEmailVisible: isEmailVisibleByScope(req),
    posts: await Promise.map(dbPosts, async dbPost => transformDbPost({ dbPost }), { concurrency: 16 })
  });

  enhancedPosts.forEach(enhancedPost => {
    postIdUniq[enhancedPost._id.toString()] = enhancedPost;
  });

  const posts = postsList.map(po => ({
    ...postIdUniq[po._id.toString()],
    publishAt: new Date(po.at),
    lockedUntil: po.lck
  }));

  const retLatest = (posts.length && unix(posts[posts.length - 1].publishAt)) || undefined;
  const hasMore = posts.length === count;

  return { posts, has_more: hasMore, latest: retLatest };
});
