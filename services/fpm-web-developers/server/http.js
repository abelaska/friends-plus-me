// eslint-disable-next-line camelcase
const sendError = (module.exports.sendError = (res, status, error, error_description) => {
  res.status(status).json({ ok: false, error, error_description });
});

const args = (module.exports.args = (...expectedArgs) => async (req, res, next) => {
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
});
