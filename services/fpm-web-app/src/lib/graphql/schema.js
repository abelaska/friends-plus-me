/* jshint node: true */
/* jshint -W079 */
'use strict';

const Promise = require('bluebird');
const { Types, States } = require('@fpm/constants');
const { Profile } = require('@fpm/db');
const { merge, flatten } = require('lodash');
const { makeExecutableSchema, addErrorLoggingToSchema } = require('graphql-tools');
const Raven = require('raven');

const rootSchema = [`

enum NetworkType {
  GOOGLE
  TWITTER
  FACEBOOK
  LINKEDIN
  TUMBLR
  PINTEREST
  INSTAGRAM
  APPNET
}

enum NetworkSubType {
  PROFILE
  PAGE
  GROUP
  BLOG
  PRIVBLOG
  COMMUNITY
  COLLECTION
  BOARD
  CIRCLE
}

enum ScheduleType {
  NOW
  MANUAL
  NEXTBEST
  FIRSTBEST
}

enum AccountState {
  ENABLED
  DISABLED
  BLOCKED
  RECONNECTREQUIRED
}

enum SourceType {
  WEB
  MOBILE
  DESKTOP
  EXTENSION
}

type Profile {
  # profile identificator
  id: String!
}

type Account {
  # account identificator
  id: String!
  # profile to which this accounts belongs to
  profile: Profile!
  # account name
  name: String!
  # account state
  state: AccountState!
  # account network type
  type: NetworkType!
  # account network subtype
  subtype: NetworkSubType!
  # account avatar URL
  image: String!
}

type Team {
  # team identificator
  id: String!
  # team name
  name: String!
  # accounts attached to team
  accounts: [Account]
}

type User {
  # user identificator
  id: String!
  # user full name
  name: String!
  # user name to display
  displayName: String!
  # user avatar URL
  image: String
  # user e-mail address
  email: String!
}

type Link {
  url: String
}

type Image {
  url: String
}

type Post {
  id: String!
  message: String!
  image: Image
  link: Link
}

input Reshare {
  id: String!
}

input NewLink {
  url: String!
  title: String
  description: String
}

input NewPost {
  # new post message in plain text
  message: String!
  # attached link image url or attached image url
  image: String
  # attached link
  link: NewLink
  # Google Reshare
  reshare: Reshare
}

type Query {
  # list all accounts available to currently signed in user
  accounts(
    states: [AccountState]
  ): [Account]

  # list all teams available to currently signed in user
  teams: [Team]

  # Return the currently signed in user, or null if nobody is logged in
  currentUser: User
}

type Mutation {
  # schedule new post, returns [post._id]
  createPost (
    # post body
    post: NewPost!
    # post type
    type: ScheduleType!
    # source of the new post
    source: SourceType!,
    # [profile.accounts._id]
    accounts: [String]
    # scheduled time
    publishAt: String
  ): [String]

  # create draft of post, returns post._id
  createDraft (
    # post body
    post: NewPost!
    # source of the new draft
    source: SourceType!,
    # profile._id
    profile: String!
  ): String
}

schema {
  query: Query
  mutation: Mutation
}
`];

// mutation CreatePost {
//   createPost(post: {
//     message: "bbb",
//     image: "https://blog.bufferapp.com/wp-content/uploads/2016/11/2017-trends.png",
//     link: {
//       url: "https://blog.bufferapp.com/state-of-social-media"
//       title: "title"
//       description: "description"
//     }
//   }, type: FIRSTBEST, source: MOBILE, accounts: ["554c6197af7a90010084a8b1","5816628ab6e8f5afaeedbf65"])
// }

// mutation CreatePost {
//   createPost(post: {
//     message: "line 1\nline 2",
//   }, type: NOW, source: MOBILE, accounts: ["5816628ab6e8f5afaeedbf65"])
// }

// mutation CreateDraft {
//   createDraft(post: {
//     message: "line 1\nline 2",
//   }, source: MOBILE, profile: "51bf1261c8c464646d000001")
// }

const accState = account => States.account.codeToName(account.state).toUpperCase();

const rootResolvers = {
  Query: {
    accounts(root, { states }, context) {
      const { user } = context;
      if (!user) {
        return [];
      }
      return new Promise((resolve, reject) => {
        Profile.find({_id: {$in: context.user.memberOfProfiles}}, '_id accounts._id accounts.name accounts.image accounts.state accounts.network accounts.account accounts.members members', (err, profiles) => {
          if (err) {
            return reject(err);
          }
          const accounts = flatten(profiles.map(p => {
            const as = ((user.isProfileOwner(p) || user.isProfileOwnerOrManager(p)) && p.accounts) ||
                        p.accounts.filter(a => user.isAccountManager(a));
            return as.filter(a => !states || states.indexOf(accState(a)) > -1).map(a => ({
              id: a._id.toString(),
              name: a.name,
              image: a.image,
              profile: {
                id: p._id.toString()
              },
              state: accState(a),
              type: Types.networkTypeName(a.network).toUpperCase(),
              subtype: Types.accountTypeName(a.account).toUpperCase(),
            }));
          }));
          resolve(accounts);
        });
      });
    },
    teams(root, args, context) {
      const { user } = context;
      if (!user) {
        return [];
      }
      return new Promise((resolve, reject) => {
        Profile.find({_id: {$in: context.user.memberOfProfiles}}, '_id name accounts._id accounts.name accounts.image accounts.state accounts.network accounts.account accounts.members members', (err, profiles) => {
          if (err) {
            return reject(err);
          }
          const teams = profiles.map(p => {
            const as = ((user.isProfileOwner(p) || user.isProfileOwnerOrManager(p)) && p.accounts) ||
                        p.accounts.filter(a => user.isAccountManager(a));
            const accounts = as.filter(a => accState(a) !== 'BLOCKED').map(a => ({
              id: a._id.toString(),
              name: a.name,
              image: a.image,
              profile: {
                id: p._id.toString()
              },
              state: accState(a),
              type: Types.networkTypeName(a.network).toUpperCase(),
              subtype: Types.accountTypeName(a.account).toUpperCase(),
            }));

            return {
              id: p._id.toString(),
              name: p.name,
              accounts
            };
          });
          resolve(teams);
        });
      });
    },
    currentUser(root, args, context) {
      return (context.user && {
        id: context.user._id.toString(),
        name: context.user.name,
        displayName: context.user.fname,
        image: context.user.image,
        email: context.user.email
      }) || null;
    },
  },
  Mutation: {
    createPost(root, data, context) {
      const { user, postManager } = context;
      if (!user) {
        throw new Error('Permission denied');
      }
      data.user = user;
      return postManager.create(data).then(posts => posts.map(post => post._id.toString()));
    },
    createDraft(root, data, context) {
      const { user, postManager } = context;
      if (!user) {
        throw new Error('Permission denied');
      }
      data.user = user;
      return postManager.draft(data).then(post => post._id.toString());
    },
  },
};

// Put schema together into one array of schema strings
// and one map of resolvers, like makeExecutableSchema expects
const schema = [...rootSchema];
const resolvers = merge(rootResolvers);

const executableSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers,
});

addErrorLoggingToSchema(executableSchema, { log: e => Raven.captureException(e) });

module.exports = executableSchema;
