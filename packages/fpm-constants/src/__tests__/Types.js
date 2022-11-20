import Types from '../Types';

test('should isNetwork', () => {
  expect(Types.isNetwork(Types.createCodeByName('instagram', 'profile'), 'instagram')).toBeTruthy();
  expect(Types.isNetwork(Types.createCodeByName('instagram', 'profile'), Types.network.instagram.code)).toBeTruthy();
  expect(Types.isNetwork(Types.createCodeByName('instagram', 'blog'), 'instagram')).toBeTruthy();
  expect(Types.isNetwork(Types.createCodeByName('instagram', 'blog'), Types.network.instagram.code)).toBeTruthy();
});
