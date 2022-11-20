// eslint-disable-next-line camelcase
const sendError = (res, status, error, error_description) => {
  res.status(status).json({ ok: false, error, error_description });
};
module.exports.sendError = sendError;

const args = (...expectedArgs) => async (req, res, next) => {
  const reqArgs = Object.keys(req.query);
  if (expectedArgs.length === 0) {
    return next();
  }
  if (reqArgs.length === 0) {
    return sendError(res, 400, 'missing_arg', `Missing arguments: ${expectedArgs.join(', ')}`);
  }

  const missingArgs = expectedArgs.filter(arg => reqArgs.indexOf(arg) === -1);
  if (missingArgs.length) {
    return sendError(res, 400, 'missing_arg', `Missing arguments: ${missingArgs.join(', ')}`);
  }

  return next();
};
module.exports.args = args;

const signOut = req => {
  if (req.cookieAuth) {
    req.cookieAuth.sub = null;
    req.cookieAuth.challenge = null;
  }
};
module.exports.signOut = signOut;
