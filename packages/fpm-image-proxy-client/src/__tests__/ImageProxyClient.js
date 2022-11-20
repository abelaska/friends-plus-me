import ImageProxyClient from '../ImageProxyClient';

const imageProxyClient = new ImageProxyClient();

test('should detect retry error', () => {
  expect(imageProxyClient.isRetryError({ success: true })).toBe(false);
  expect(imageProxyClient.isRetryError({ error: { message: '' } })).toBe(false);
  expect(imageProxyClient.isRetryError({ error: { message: 'unknown error' } })).toBe(false);
  expect(imageProxyClient.isRetryError({ error: { message: 'unexpected EOF' } })).toBe(true);
  expect(imageProxyClient.isRetryError({ error: { message: 'API error 1 (images: UNSPECIFIED_ERROR)' } })).toBe(true);
  expect(
    imageProxyClient.isRetryError({
      error: {
        message:
          'Get https://media.wired.com/photos/596eadcd604b270877d0d341/191:100/pass/GoogleSearchHP.jpg: API error 8 (urlfetch: CLOSED)'
      }
    })
  ).toBe(true);
});

test('should try failover', async () => {
  let tries = 0;
  const success = { success: true };
  const error = { error: { message: 'unexpected EOF' } };
  const reply = await imageProxyClient.failover(async () => (++tries === 3 ? success : error));
  expect(reply).toBe(success);
});

test('should try failover with throw', async () => {
  let tries = 0;
  const success = { success: true };
  const error = { error: { error: { message: 'unexpected EOF' } } };
  const reply = await imageProxyClient.failover(async () => {
    if (++tries === 3) {
      return success;
    }
    throw error;
  });
  expect(reply).toBe(success);
});

test('should try failover with throw and fail', async () => {
  const error = { error: { error: { message: 'unexpected EOF' } } };
  await expect(
    imageProxyClient.failover(async () => {
      throw error;
    })
  ).rejects.toBe(error);
});

test('should try without failover', async () => {
  let called = 0;
  const success = { success: true };
  const reply = await imageProxyClient.failover(async () => {
    called++;
    return success;
  });
  expect(reply).toBe(success);
  expect(called).toBe(1);
});
