module.exports = () => (req, res, next) => {
  if (['/health', '/_ah/health', '/_ah/start', '/_ah/stop'].indexOf(req.path) > -1) {
    return res.send('ok');
  }
  return next();
};
