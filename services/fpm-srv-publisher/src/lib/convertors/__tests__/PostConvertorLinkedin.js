// eslint-disable-next-line import/no-extraneous-dependencies
const test = require('ava');
const { ObjectId, Post, Profile } = require('@fpm/db');
const { Types } = require('@fpm/constants');
const PostConvertorLinkedin = require('../PostConvertorLinkedin');

test('should convert post with @mention', t => {
  const post = new Post({
    _id: ObjectId('5b72f8f487f605001b42ec39'),
    publishAt: new Date('2018-08-14T17:07:00.000Z'),
    aid: ObjectId('526ae8d50dd060693c001b07'),
    pid: ObjectId('526ae8960dd060693c001ae9'),
    uid: '18546186',
    accountCode: 10000,
    source: 'extension',
    html:
      '<p>Best way to learn something new is to do it. Here&nbsp;<span id="autocomplete"><span id="autocomplete-delimiter">@</span><span id="autocomplete-searchtext"><span class="dummy">upwork shares small hands-on ways to learn to incorporate freelancers into your work #ThinkingIn4T&nbsp; &nbsp;</span></span></span></p>',
    createdBy: ObjectId('526ae8960dd060693c001ae9'),
    processor: 'post:linkedin:profile',
    repost: {
      is: false
    },
    reshare: {
      is: false
    },
    extension: {
      publishers: []
    },
    destinations: [
      {
        icon: '/images/icons/earth.svg',
        id: 'public-circle',
        type: 'circle',
        name: 'Public'
      }
    ],
    editable: true,
    state: 100,
    failures: [],
    tries: 1,
    publish: {
      failedAt: [],
      publishedAt: [],
      published: 0,
      publishAt: [],
      count: 1
    },
    lockedUntil: new Date('2018-08-14T17:07:07.929Z'),
    blockedAt: null,
    modifiedAt: new Date('2018-08-14T15:44:52.859Z'),
    createdAt: new Date('2018-08-14T15:44:52.859Z'),
    __v: 0,
    id: '1029414125418541059',
    url: 'https://twitter.com/18546186/status/1029414125418541059',
    completedAt: new Date('2018-08-14T17:07:07.929Z')
  });
  const profile = new Profile({
    accounts: [{ uid: 'uid-0', account: Types.account.profile.code }]
  });
  const account = profile.accounts[0];
  const conv = new PostConvertorLinkedin(post, profile, account, (url, lsCallback) => lsCallback(null, url, 'none'));
  conv.convert((err, req) => {
    t.falsy(err);
    t.truthy(req);
    t.deepEqual(req, {
      author: 'urn:li:person:uid-0',
      lifecycleState: 'PUBLISHED',
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS'
      },
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareMediaCategory: 'NONE',
          shareCommentary: {
            text:
              'Best way to learn something new is to do it. Here @upwork shares small hands-on ways to learn to incorporate freelancers into your work #ThinkingIn4T'
          }
        }
      }
    });
  });
});

test('should convert post with unicode art', t => {
  const post = new Post({
    _id: ObjectId('5ba1d27e9858e10016fab11c'),
    publishAt: new Date('2018-09-20T12:30:00.000Z'),
    aid: ObjectId('5b902ed487f605001b44c041'),
    pid: ObjectId('5b902e7b87f605001b44c03a'),
    uid: '20027233',
    accountCode: 10000,
    source: 'app:bulk',
    html: '<p>@knowntocollapse</p><p>🌞 ⓗⓐⓟⓟⓨ ⓑⓘⓡⓣⓗⓓⓐⓨ 🌝</p><p>(¯`·.¸¸.·´¯`·.¸¸.-> ⓚⓔⓥⓘⓝ <-.¸¸.·´¯`·.¸¸.·´¯)</p>',
    createdBy: ObjectId('5b902e77da049b0016b857cd'),
    processor: 'post:linkedin:profile',
    repost: {
      is: false
    },
    reshare: {
      is: false
    },
    extension: {
      publishers: []
    },
    destinations: [],
    editable: true,
    state: 100,
    failures: [],
    tries: 1,
    publish: {
      failedAt: [],
      publishedAt: [],
      published: 0,
      publishAt: [],
      count: 1
    },
    lockedUntil: new Date('2018-09-20T12:30:06.502Z'),
    blockedAt: null,
    modifiedAt: new Date('2018-09-19T04:37:18.758Z'),
    createdAt: new Date('2018-09-19T04:37:18.758Z'),
    __v: 0,
    id: '1042752761119563776',
    url: 'https://twitter.com/20027233/status/1042752761119563776',
    completedAt: new Date('2018-09-20T12:30:06.502Z')
  });
  const profile = new Profile({
    accounts: [{ uid: 'uid-1', account: Types.account.profile.code }]
  });
  const account = profile.accounts[0];
  const conv = new PostConvertorLinkedin(post, profile, account, (url, lsCallback) => lsCallback(null, url, 'none'));
  conv.convert((err, req) => {
    t.falsy(err);
    t.truthy(req);
    t.deepEqual(req, {
      author: 'urn:li:person:uid-1',
      lifecycleState: 'PUBLISHED',
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS'
      },
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareMediaCategory: 'NONE',
          shareCommentary: {
            text: '@knowntocollapse\n🌞 ⓗⓐⓟⓟⓨ ⓑⓘⓡⓣⓗⓓⓐⓨ 🌝\n(¯`·.¸¸.·´¯`·.¸¸.-> ⓚⓔⓥⓘⓝ <-.¸¸.·´¯`·.¸¸.·´¯)'
          }
        }
      }
    });
  });
});
