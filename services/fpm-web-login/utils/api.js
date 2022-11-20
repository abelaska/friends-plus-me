import axios from 'axios';
import qs from 'querystring';

export const apiBase = async ({ path, clientId, challenge, auth0IdToken, store }) => {
  const reply = await axios.get(
    `${store.config.server.url}/api${path}?${qs.stringify({
      challenge,
      client_id: clientId,
      auth0_id_token: auth0IdToken
    })}`
  );
  return reply && reply.status === 200 && reply.data;
};

export const apiConsent = async ({ clientId, challenge, auth0IdToken, store }) =>
  apiBase({ clientId, challenge, auth0IdToken, store, path: '/consent' });

export const apiApprove = async ({ clientId, challenge, auth0IdToken, store }) =>
  apiBase({ clientId, challenge, auth0IdToken, store, path: '/approve' });

export const apiRegister = async ({ auth0IdToken, store }) => apiBase({ auth0IdToken, store, path: '/register' });
