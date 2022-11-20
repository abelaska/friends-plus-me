const { signOut } = require('../http');

module.exports = async (req, res) => {
  signOut(req);
  const url = req.query.redirect_url || 'https://friendsplus.me';
  res.redirect(302, url);
};
