/* jshint node: true */
'use strict';

const fileCache = {};
const fs = require('fs');

module.exports = function(path, options, callback) {
	if (fileCache[path]) {
		callback(null, fileCache[path]);
	} else {
		fs.readFile(path, {encoding: 'utf8'}, function(err, data) {
			if (err) {
				callback(err);
			} else {
				fileCache[path] = data;
				callback(null, data);
			}
		});
	}
};
