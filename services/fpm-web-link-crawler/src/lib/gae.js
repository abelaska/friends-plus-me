module.exports = router => {
  router.get('/health', (req, res) => res.send('ok'));
  router.get('/_ah/health', (req, res) => res.send('ok'));
  router.get('/_ah/start', (req, res) => res.send('ok'));
  router.get('/_ah/stop', (req, res) => {
    res.send('ok');
    process.exit();
  });
};
