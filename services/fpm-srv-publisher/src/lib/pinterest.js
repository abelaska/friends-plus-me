/* jshint node: true, esversion: 6 */
"use strict";

const config = require("@fpm/config");
const log = require("@fpm/logging").default;
const url = require("url");
const request = require("request").defaults({ pool: { maxSockets: Infinity } });

var pin = (exports.pin = function board(
	boardId,
	imageUrl,
	link,
	note,
	accessToken,
	callback,
	timeout,
	fields,
) {
	request.post(
		{
			url: "https://api.pinterest.com/v1/pins/",
			qs: {
				access_token: accessToken,
				fields: fields,
			},
			form: {
				board: boardId,
				image_url: imageUrl,
				link: link,
				note: note,
			},
			timeout:
				timeout ||
				config.get("pinterest:timeout") ||
				config.get("defaults:network:timeout"),
			json: true,
		},
		function (err, rsp, extBody) {
			if (err) {
				callback(err);
			} else if (rsp && rsp.statusCode === 201 && extBody) {
				callback(null, (extBody && extBody.data) || extBody);
			} else {
				callback({
					message:
						"Failed to pin " + imageUrl + " to Pinterest Board " + boardId,
					error: extBody,
					responseCode: rsp ? rsp.statusCode : null,
				});
			}
		},
	);
});
