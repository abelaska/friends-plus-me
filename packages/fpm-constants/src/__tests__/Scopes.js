import { scopeToArray, validScope, thirdPartyRootScopes } from '../Scopes';

test('should get thirdPartyRootScopes', () => {
  expect(thirdPartyRootScopes()).toEqual([
    'offline',
    'admin',
    'identity',
    'users',
    'assets',
    'teams',
    'queues',
    'drafts',
    'posts'
  ]);
  expect(thirdPartyRootScopes('fpm-developers-app')).toEqual([
    'offline',
    'admin',
    'identity',
    'users',
    'assets',
    'teams',
    'queues',
    'drafts',
    'posts',
    'apps'
  ]);
});

test('should convert scope to array', () => {
  expect(scopeToArray()).toEqual([]);
  expect(scopeToArray('')).toEqual([]);
  expect(scopeToArray('scope1')).toEqual(['scope1']);
  expect(scopeToArray('scope1 scope2')).toEqual(['scope1', 'scope2']);
});

test('should validate scopes', () => {
  expect(validScope('identity apps', 'fpm-developers-app')).toBe('identity apps');
  expect(validScope('identity apps', 'invalid-client')).toBe('identity');
  expect(validScope('identity apps', '')).toBe('identity');
  expect(validScope('identity apps', null)).toBe('identity');
  expect(validScope('identity apps')).toBe('identity');
  expect(validScope('identity')).toBe('identity');
  expect(validScope('identity', null)).toBe('identity');
  expect(validScope('identity', 'client-id')).toBe('identity');
});
