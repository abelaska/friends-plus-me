/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const { isTrue } = require('../utils/text');
const { unix } = require('../utils/time');

const timelinePagingHistory = (module.exports.timelinePagingHistory = () => {
  return async (req, res, next) => {
    const { query } = req;

    const inclusive = isTrue(query.inclusive);
    const count = isNaN(query.count) ? 100 : Math.max(0, parseInt(query.count, 10));
    const latest = isNaN(query.latest) ? unix(new Date()) : Math.max(0, parseInt(query.latest, 10));
    const oldest = isNaN(query.oldest) ? 0 : Math.max(0, parseInt(query.oldest, 10));

    req.paging = {
      count,
      latest,
      oldest,
      inclusive,
      method: 'timeline'
    };

    next();
  };
});

const timelinePagingFuture = (module.exports.timelinePagingFuture = ({ daysIntoFuture = 30 } = {}) => {
  return async (req, res, next) => {
    const { query } = req;

    const inclusive = isTrue(query.inclusive);
    const count = isNaN(query.count) ? 100 : Math.max(0, parseInt(query.count, 10));
    const latest = isNaN(query.latest)
      ? // eslint-disable-next-line no-mixed-operators
        unix(new Date()) + (daysIntoFuture || 30) * 24 * 60 * 60
      : Math.max(0, parseInt(query.latest, 10));
    const oldest = isNaN(query.oldest) ? 0 : Math.max(0, parseInt(query.oldest, 10));

    req.paging = {
      count,
      latest,
      oldest,
      inclusive,
      method: 'timeline'
    };

    next();
  };
});
