module.exports = req => `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
