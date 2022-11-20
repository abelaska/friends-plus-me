'use strict';

angular.module('image', [])
  .provider('Image', function() {

  var ImageClass = ['$http', 'Upload', 'config', 'Google', function($http, Upload, config, Google) {

    this.signedUploadUrl = function(contentType, callback) {
      $http({
        method: 'POST',
        url: config.api.url+'/upload/photo/sign',
        data: {
          contentType: contentType
        }
      })
      .success(function(data/*, status, headers, config*/) {
        callback(null, data);
      })
      .error(function(data/*, status, headers, config*/) {
        callback(data || true);
      });
    }.bind(this);

    this.uploadToGcs = function(file, callback) {
      this.signedUploadUrl(file.type, function(err, signed) {
        if (err || !signed) {
          return callback(err || {error: {message: 'Failed to sign upload url'}});
        }
        Upload.http({
          method: 'PUT',
          url: signed.uploadUrl,
          headers : {
            'Content-Type': file.type
          },
          data: file
        })
        .success(function(/*data, status, headers, config*/) {
          callback(null, {
            url: signed.url,
            filename: signed.filename
          });
        })
        .error(function(data/*, status, headers*/) {
          callback(data);
        });
      }.bind(this));
    }.bind(this);

    this.upload = function(file, callback) {
      this.uploadToGcs(file, function(err, data) {
        if (err || !data) {
          return callback(err || {error: {message: 'Failed to upload image to GCS'}});
        }
        Google.uploadPhoto(data.url, callback);
      }.bind(this));
    }.bind(this);
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(ImageClass, {
    });
  }];
});