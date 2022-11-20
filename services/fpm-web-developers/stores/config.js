export default class Store {
  constructor(state = {}) {
    Object.assign(this, state);
  }
}

const getHost = req => `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;

export const initialState = async ({ req }) => ({
  auth: req.auth,
  app: {
    env: req.config.env,
    name: req.config.name,
    version: req.config.version
  },
  server: {
    url: getHost(req)
  },
  api: {
    url: req.config.api.url
  }
});
