export const details = {
  offline: {
    description: 'Have offline access',
    info: 'The app will be able to access your account even when you are not present at the computer.'
  },
  admin: {
    description: 'Administer your user account',
    info: 'The app will be able to manage your entire Friends+Me account like you are.'
  },
  identity: {
    description: 'Confirm your identity, email and avatar',
    info: 'The app will be able to know you by name, access your email address and avatar picture.'
  },
  'identity.basic': {
    description: 'Confirm your identity',
    info: 'The app will be able to know you by name.'
  },
  'identity.email': {
    description: 'View your email address',
    info: 'The app will be able to view your email adddress.'
  },
  'identity.avatar': {
    description: 'View your avatar',
    info: 'The app will be able to see your avatar picture.'
  },
  'users.read': {
    description: 'Access profile information of people on your teams',
    info: 'The app will be able to access profile information of people on teams you own.'
  },
  'users.read.email': {
    description: 'View email addresses of people on your teams',
    info: 'The app will be able to view email addresses of people on teams you own.'
  },
  'users.write': {
    description: 'Modify your profile information',
    info: 'The app will be able to modify your profile information.'
  },
  assets: {
    description: 'Access and modify your assets (pictures, videos)',
    info:
      'The app will be able to access, modify, create and delete assets of teams you own and assets created by you in other teams you are a member of.'
  },
  'assets.read': {
    description: 'Access information about your assets (pictures, videos)',
    info:
      'The app will have access to assets of teams you own and assets created by you in other teams you are a member of.'
  },
  'assets.write': {
    description: 'Modify your assets',
    info:
      'The app will be able to modify, create and delete assets of teams you own and assets created by you in other teams you are a member of.'
  },
  teams: {
    description: 'Access and modify your teams',
    info: 'The application will be able to access, modify, create and delete teams you own or are a member of.'
  },
  'teams.read': {
    description: 'Access information about your teams',
    info: 'The application will be able to access information about teams you own or are a member of.'
  },
  'teams.write': {
    description: 'Modify your teams',
    info: 'The application will be able to modify, create and delete teams you own or modify teams you are a member of.'
  },
  queues: {
    description: 'Access and modify your queues',
    info:
      'The application will be able to access information, historic content and modify, create or delete queues of teams you own or are a member of.'
  },
  'queues.history': {
    description: 'Access historic content in your queues',
    info:
      'The application will be able to access historic content (published posts, ...) in queues of teams you own or are a member of.'
  },
  'queues.read': {
    description: 'Access information about your queues',
    info: 'The application will be able to access information about queues of teams you own or are a member of.'
  },
  'queues.write': {
    description: 'Modify your queues',
    info: 'The application will be able to modify, create or delete queues of teams you own or are a member of.'
  },
  drafts: {
    description: 'Access and modify your drafts',
    info:
      "The application will be able access, modify, create and delete drafts in teams you own and drafts you've created or scheduled in teams you are a member of."
  },
  'drafts.read': {
    description: 'Access information about your drafts',
    info:
      "The application will be able access information about drafts in teams you own and drafts you've created in teams you are a member of."
  },
  'drafts.write': {
    description: 'Create and modify your drafts',
    info:
      "The application will be able modify, create and delete drafts in teams you own and drafts you've created in teams you are a member of."
  },
  posts: {
    description: 'Access, modify and schedule your posts',
    info:
      "The application will be able access, modify, create, delete and schedule posts in teams you own and posts you've created or scheduled in teams you are a member of."
  },
  'posts.read': {
    description: 'Access information about your posts',
    info:
      "The application will be able access information about posts in teams you own and posts you've created or scheduled in teams you are a member of."
  },
  'posts.write': {
    description: 'Modify your posts',
    info:
      "The application will be able modify, create and delete posts in teams you own and posts you've created in teams you are a member of."
  },
  'posts.schedule': {
    description: 'Schedule posts to a queue',
    info:
      'The application will be able to schedule drafts or new posts in teams you own, or you are a member of with an adequate role.'
  },
  apps: {
    allowedClients: ['fpm-developers-app'],
    description: 'Access and modify your applications',
    info: 'The application will be able to access, modify, create and delete your applications.'
  },
  'apps.read': {
    allowedClients: ['fpm-developers-app'],
    description: 'Access information about your applications',
    info: 'The application will be able to access information about your applications.'
  },
  'apps.write': {
    allowedClients: ['fpm-developers-app'],
    description: 'Modify your applications',
    info: 'The application will be able to modify, create and delete your applications.'
  }
};

export const scopes = Object.keys(details);

const extractRootScopes = filter => {
  const rs = {};
  const scs = filter ? scopes.filter(filter) : scopes;
  scs.map(s => s.split('.')[0]).forEach(s => {
    rs[s] = 1;
  });
  return Object.keys(rs);
};

export const rootScopes = extractRootScopes();

export const thirdPartyRootScopes = clientId =>
  extractRootScopes(
    s => (details[s].allowedClients ? (clientId ? details[s].allowedClients.indexOf(clientId) > -1 : false) : true)
  );

export const scopeToArray = scope =>
  (scope ? (Array.isArray(scope) ? scope : scope.split(' ')).map(s => s.toLowerCase().trim()).filter(s => s) : []);

export const additionalScopes = scope => scopeToArray(scope).filter(s => scopes.indexOf(s) === -1);

export const validScopeArray = (scope, clientId) =>
  scopeToArray(scope).filter(
    s =>
      scopes.indexOf(s) > -1 &&
      (details[s].allowedClients ? (clientId ? details[s].allowedClients.indexOf(clientId) > -1 : false) : true)
  );

export const validScope = (scope, clientId) => validScopeArray(scope, clientId).join(' ');
