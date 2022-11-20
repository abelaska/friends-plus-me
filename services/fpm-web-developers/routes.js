const routes = (module.exports = require('next-routes')());

module.exports.clickedRoute = (route, params) => e => {
  e.preventDefault();
  routes.Router.pushRoute(route, params);
};

routes.add('index', '/');
routes.add('apps', '/apps');
routes.add('apps-new', '/apps/new', 'new');
routes.add('apps-edit', '/apps/:app_id', 'edit');
