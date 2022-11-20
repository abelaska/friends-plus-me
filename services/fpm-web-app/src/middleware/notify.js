/* jshint node: true */
'use strict';

module.exports = function(){

    function notify(level, title, message) {
      /*jshint validthis:true */
      if (this.session === undefined) {
        throw new Error('req.notify() requires sessions');
      }

      if (title && !message) {
        message = title;
        title = undefined;
      }

      var msgs = this.session.notify = this.session.notify || [];

      if (level && message) {
        msgs.push({
          level: level,
          msg: message,
          title: title
        });
      } else {
        delete this.session.notify;
        return msgs;
      }
    }

    return function(req, res, next) {
      req.notify = notify;
      res.notify = notify;
      next();
    };
};
