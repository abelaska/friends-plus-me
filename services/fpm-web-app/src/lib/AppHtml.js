/*jshint node: true */
'use strict';

const config = require('@fpm/config');
const log = require('@fpm/logging').default;
const fs = require('fs');
const request = require('request').defaults({ pool: { maxSockets: Infinity } });

var AppHtml = module.exports = function AppHtml(devFile, prodFile) {

  this.isProd = 'production' === config.get('env');
  this.isDev = !this.isProd;
  this.cacheHtml = !this.isDev;
  this.devAppHtml = __dirname+'/../../views/'+(devFile||'index.html');
  this.prodAppHtml = __dirname+'/../../views/'+(prodFile||'index.html');

  return this;
};

AppHtml.prototype._fetch = function(callback) {
  var filename = this.isDev ? this.devAppHtml : this.prodAppHtml;
  if (filename) {
    if (filename[0] === '/') {
      fs.readFile(filename, {encoding: 'utf-8'}, callback);
    } else {
      request(filename, function (error, response, body) {
        if (!error && response && response.statusCode === 200) {
          callback(null, body);
        } else {
          callback(error || body || {code:'ETIMEOUT'});
        }
      });
    }
  } else {
    callback({code:'NOT_FOUND'});
  }
};

/* jshint -W109 */
var entityMap = {
   '&': '&amp;',
   '<': '&lt;',
   '>': '&gt;',
   '"': '&quot;',
   "'": '&#39;',
   '/': '&#x2F;',
   '`': '&#x60;',
   '=': '&#x3D;'
 };

function escapeHtml (string) {
 return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap (s) {
   return entityMap[s];
 });
}

AppHtml.prototype._render = function(userProfile, callback) {
  // var html = this.html.replace(/<[\s]*\/[\s]*head[\s]*>/,
  //           '<script>window.user='+JSON.stringify(userProfile)+';</script></head>');
  var html = this.html.replace(/initial-state="{}"/,'initial-state="'+escapeHtml(JSON.stringify(userProfile))+'"');
  callback(null, html);
};

AppHtml.prototype.render = function(userProfile, callback) {
    if (this.html && this.cacheHtml) {
      this._render(userProfile, callback);
    } else {
      this._fetch(function(err, content) {
        if (err || !content) {
          log.error('Failed to fetch application index html file', {
            error: err});
          callback(err);
        } else {
          this.html = content;
          this._render(userProfile, callback);
        }
      }.bind(this));
    }
};
