'use strict';

angular.module('fpmApp').controller('BulkScheduleCtrl', ['$rootScope', '$scope', '$window', '$apply', '$state', 'Google', '_', 'states', 'types', 'moment', 'twttr', 'async', 'Crawler', 'Log', 'dialogs', 'Analytics', 'config', 'papa', function($rootScope, $scope, $window, $apply, $state, Google, _, states, types, moment, twttr, async, Crawler, Log, dialogs, Analytics, config, papa) {

    // https://github.com/mholt/PapaParse

    // https://regex101.com/#javascript
    // var lineRe = /^\s*(\d{1,2})\s*;\s*(\d{1,2})\s*;\s*(\d{4})\s*;\s*(\d{1,2})\s*;\s*(\d{1,2})\s*;\s*"([^\"]*)"(?:\s*;\s*"(photo|link)"\s*;\s*"(https?\:\/\/[^\"]*)")?\s*$/i;

    $scope.Google = Google;

    $scope.file = null;
    $scope.loading = false;
    $scope.loaded = false;

    $scope.uploadText = '';
    $scope.uploaded = false;
    $scope.uploading = false;
    $scope.uploadingPercent = 0;

    $scope.validating = false;
    $scope.validatingPercent = 0;

    $scope.maxMsgLength = -1;
    $scope.invalidLines = [];
    $scope.posts = [];

    $scope.selectedAccounts = [];
    $scope.accounts = _.filter(Google.profile.accounts, function(a) {
      return a.state !== states.account.blocked.code;
    });

    function planTextPostLength(fullPost) {
      return fullPost.msg.length;
    }

    function twitterPostLength(fullPost, post) {
      var msg = fullPost.msg,
        attachPhoto = (post.attachments && post.attachments.photo && post.attachments.photo.url) ||
          (post.attachments &&
            post.attachments.link &&
            post.attachments.link.photo &&
            post.attachments.link.photo.url) ||
          '',
        attachedLinkUrl = (post.attachments && post.attachments.link && post.attachments.link.url) || '',
        attachedLinkShortenedUrl = (post.attachments &&
          post.attachments.link &&
          post.attachments.link.short &&
          post.attachments.link.short.url) ||
          '',
        attachedLinkFound = (attachedLinkUrl && msg.indexOf(attachedLinkUrl) > -1) ||
          (attachedLinkShortenedUrl && msg.indexOf(attachedLinkShortenedUrl) > -1),
        attachLink = (!attachedLinkFound && (attachedLinkUrl || attachedLinkShortenedUrl)) || '',
        completeMsg = msg +
          (msg && (attachLink || attachPhoto) && ' ') +
          attachLink +
          (attachLink && attachPhoto && ' ') +
          attachPhoto,
        length = twttr.txt.getTweetLength(completeMsg);
      return length;
    }

    var networkLengths = {};
    networkLengths[types.network.twitter.code] = {
      maxLength: 280,
      length: twitterPostLength
    };
    networkLengths[types.network.facebook.code] = {
      maxLength: 10000
    };
    networkLengths[types.network.linkedin.code] = {
      maxLength: 620
    };

    function maxMessageLength() {
      var ml, maxLength = -1;
      $scope.selectedAccounts.forEach(function(account) {
        ml = (networkLengths[account.network] && networkLengths[account.network].maxLength) || -1;
        if (_.isFunction(ml)) {
          ml = ml(account);
        }
        if (ml > -1) {
          if (maxLength === -1) {
            maxLength = ml;
          } else {
            maxLength = Math.min(ml, maxLength);
          }
        }
      });
      return maxLength;
    }

    function messageLength(fullPost, prePost, account) {
      return ((networkLengths[account.network] && networkLengths[account.network].length) || planTextPostLength)(
        fullPost,
        prePost
      );
    }

    function textMessageToHtml(msg) {
      return ('<p>' + msg + '</p>').replace(/\n\n/g, '</p><p></p><p>').replace(/([^\n]*)\n/g, '$1</p><p>');
    }

    function createPrePost(fullPost) {
      var post = {
        html: textMessageToHtml(fullPost.msg),
        attachments: {}
      };

      if (fullPost.url) {
        post.attachments[fullPost.urlType] = {
          url: fullPost.url
        };
      }

      return post;
    }

    function reset() {
      $scope.maxMsgLength = maxMessageLength();
      $scope.invalidLines = [];
      $scope.posts = [];
      $scope.file = null;
      $scope.loading = false;
      $scope.loaded = false;
      $scope.uploading = false;
    }

    $scope.addAccount = function(account) {
      $scope.selectedAccounts.push(account);
      $scope.accounts = _.filter($scope.accounts, function(a) {
        return account._id !== a._id;
      });
      reset();
    };

    $scope.removeAccount = function(account) {
      $scope.accounts.push(account);
      $scope.selectedAccounts = _.filter($scope.selectedAccounts, function(a) {
        return account._id !== a._id;
      });
      reset();
    };

    $scope.accountTitle = function(account) {
      return account && ($scope.accountTypeNameFull(account) + ' - ' + account.name + ' ('+account.uid+')');
    };

    $scope.resetFileDialog = function() {
      $window.document.getElementById('fileSelect').value = '';
    };

    $scope.openFileDialog = function() {
      $scope.resetFileDialog();
      $window.document.getElementById('fileSelect').click();
    };

    function toInt(str) {
      try {
        if (str) {
          return parseInt(str);
        }
      } catch (e) {}
      return null;
    }

    function processLine(i, line, callback) {
      if (!line) {
        return callback();
      }

      if (line.length < 6) {
        return callback([i, 'Invalid number of columns, at least 6 columns is required', line]);
      }

      var day = line[0];
      if (typeof day !== 'number') {
        return callback([i, 'Day value must be of type number (column: 1)', line]);
      }
      if (day === null || day < 1 || day > 31) {
        return callback([i, 'Invalid DAY field value "' + day + '"', line]);
      }

      var month = line[1];
      if (typeof month !== 'number') {
        return callback([i, 'Month value must be of type number (column: 2)', line]);
      }
      if (month === null || month < 1 || month > 12) {
        return callback([i, 'Invalid MONTH field value "' + month + '"', line]);
      }

      var year = line[2];
      if (typeof year !== 'number') {
        return callback([i, 'Year value must be of type number (column: 3)', line]);
      }
      if (year === null || year < 2016 || year > 2050) {
        return callback([i, 'Invalid YEAR field value "' + year + '"', line]);
      }

      var hour = line[3];
      if (typeof hour !== 'number') {
        return callback([i, 'Hour value must be of type number (column: 4)', line]);
      }
      if (hour === null || hour < 0 || hour > 23) {
        return callback([i, 'Invalid HOUR field value "' + hour + '"', line]);
      }

      var minute = line[4];
      if (typeof minute !== 'number') {
        return callback([i, 'Minute value must be of type number (column: 5)', line]);
      }
      if (minute === null || minute < 0 || minute > 59) {
        return callback([i, 'Invalid MINUTE field value "' + minute + '"', line]);
      }

      var tm = moment({
        years: year,
        months: month - 1,
        date: day,
        hours: hour,
        minutes: minute,
        seconds: 0,
        milliseconds: 0
      });
      if (!tm.isValid()) {
        return callback([
          i,
          'Invalid time ' + hour + ':' + minute + ' or date ' + day + '/' + month + '/' + year,
          line
        ]);
      }
      if (tm.isBefore(moment().local())) {
        return callback([
          i,
          'Scheduled time must be in the future, invalid time ' + tm.format('DD/MM/YYYY HH:mm'),
          line
        ]);
      }

      var msg = (line[5] && line[5].trim().replace(/\\n/g, '\n')) || '';
      if (!msg) {
        return callback([i, 'Empty messages are not allowed', line]);
      }

      var urlType = (line[6] && line[6].toLowerCase().trim()) || '';
      var url = (line[7] && line[7].trim()) || '';

      var fullPost = {
        idx: i,
        line: line,
        tm: tm,
        timeSlot: Math.ceil(tm.unix() / (5 * 60)),
        timeUnix: tm.unix(),
        msg: msg,
        url: url,
        urlType: urlType,
        post: null,
        accounts: []
      };
      async.eachLimit(
        $scope.selectedAccounts,
        4,
        function(account, cb) {
          var prePost = createPrePost(fullPost);
          if ($scope.maxMsgLength > -1) {
            var len = messageLength(fullPost, prePost, account);
            if (len > $scope.maxMsgLength) {
              return cb([i, 'Final message is too long, ' + len + ' characters.', line]);
            }
          }

          fullPost.accounts.push({ _id: account._id });

          if (fullPost.post) {
            return cb();
          }

          fullPost.post = prePost;

          if (urlType === 'photo') {
            Google.photoIdentify(url, function(err, result) {
              if (err || !result) {
                var errMsg = (err.error && err.error.message) || '';
                return cb([i, 'Failed to download image ' + url + (errMsg ? ' Error: ' + errMsg : ''), line]);
              }

              prePost.attachments.photo = result;

              cb();
            });
          } else if (urlType === 'link') {
            Crawler.link(url, function(err, linkPreview) {
              if (err || !linkPreview) {
                var errMsg = (err.error && err.error.message) || '';
                return cb([i, 'Failed to crawl link ' + url + (errMsg ? ' Error: ' + errMsg : ''), line]);
              }

              var photo = linkPreview.images && linkPreview.images.length && linkPreview.images[0];

              var photoUrl = photo && photo.url;

              if (linkPreview.images) {
                delete linkPreview.images;
              }

              prePost.attachments.link = linkPreview;

              if (photoUrl) {
                prePost.attachments.link.photo = {
                  url: photo.url,
                  width: photo.width,
                  height: photo.height,
                  contentType: photo.contentType,
                  aniGif: !!photo.animated
                };
              }

              cb();
            });
          } else {
            cb();
          }
        },
        function(err) {
          if (err) {
            return callback(err);
          }
          callback(null, fullPost);
        }
      );
    }

    $scope.shortLine = function(line) {
      return (line && line.length > 60 && line.substring(0, 57) + '...') || line;
    };

    $scope.onFileSelect = function($files) {
      if (!$scope.selectedAccounts.length) {
        return;
      }

      $scope.loading = false;
      $scope.loaded = false;

      $scope.file = $files && $files[0];
      if (!$scope.file) {
        return;
      }

      $scope.resetFileDialog();

      $scope.loading = true;

      function onComplete(results) {
        console.log(results);

        var lines = results.data;

        if (results.errors && results.errors.legth) {
          Log.error('Bulk schedule CSV load failed', results.errors);
          lines = null;
        }

        $scope.posts = [];
        $scope.invalidLines = [];

        if (!lines || !lines.length) {
          $scope.loading = false;
          $scope.loaded = true;
          return $apply($rootScope);
        }

        lines = _.map(lines, function(line, idx) {
          return {
            idx: idx,
            value: line
          };
        });

        var posts = [];
        var validated = 0;

        $scope.validating = true;

        async.eachLimit(
          lines,
          4,
          function(line, cb) {
            processLine(line.idx, line.value, function(err, fullPost) {
              if (err) {
                $scope.invalidLines.push(err);

                Log.error('Bulk schedule: invalid line', { error: err });
              }
              if (fullPost) {
                posts.push(fullPost);
              }

              validated++;
              $scope.validatingPercent = Math.floor(100 * validated / lines.length);

              cb();
            });
          },
          function() /* err */ {
            if (posts.length) {
              posts.sort(function(a, b) {
                return a.timeUnix - b.timeUnix;
              });

              var p, i, nextTry;
              var timeSlots = {};

              do {
                nextTry = false;

                for (i = 0; i < posts.length; i++) {
                  p = posts[i];

                  if (p.publishAt) {
                    continue;
                  }

                  if (!timeSlots[p.timeSlot]) {
                    timeSlots[p.timeSlot] = 1;
                    p.publishAt = moment(p.timeSlot * 5 * 60 * 1000);
                    continue;
                  }

                  p.timeSlot++;

                  nextTry = true;
                }
              } while (nextTry);
            }

            $scope.validating = false;
            $scope.validatingPercent = 100;
            $scope.loading = false;
            $scope.loaded = lines ? true : false;
            $scope.posts = posts;

            $apply($rootScope);
          }
        );
      }

      papa.parse($scope.file, {
        skipEmptyLines: true,
        dynamicTyping: true,
        comments: '#',
        complete: onComplete
      });
    };

    function createUploader(source) {
      return function(callback) {
        var ok = false;
        var countdown = 3;
        async.doWhilst(function(cb) {
          Google.uploadPhoto(source.photo.url, function(err, result) {
            if (!err && result) {
              ok = true;
              source.photo = result;
            }
            if (err) {
              Log.error('Bulk schedule: photo upload failed', { error: err });
            }
            if (ok) {
              cb();
            } else {
              setTimeout(cb, 500);
            }
          });
        }, function() { return !ok && --countdown > 0; }, callback);
      };
    }

    function uploadPostPhoto(fullPost, callback) {
      var tasks = [];
      var post = fullPost.post;
      if (post.attachments) {
        var link = post.attachments.link, photo = post.attachments.photo;
        if (link && link.photo && link.photo.url) {
          tasks.push(createUploader(post.attachments.link));
        }
        if (photo && photo.url) {
          tasks.push(createUploader(post.attachments));
        }
      }
      async.parallelLimit(tasks, 2, callback);
    }

    function uploadPost(fullPost, recaptchaToken, callback) {
      var req = {
        type: 'schedule',
        publishAt: fullPost.publishAt.clone().utc().format(),
        accounts: fullPost.accounts,
        source: 'app:bulk',
        recaptcha: recaptchaToken,
        html: fullPost.post.html,
        attachments: fullPost.post.attachments
      };
      Google.share(req, callback);
    }

    function doUpload(recaptchaToken) {
      $scope.uploaded = false;
      $scope.uploading = true;
      $scope.uploadingPercent = 1;

      $scope.uploadText = 'Uploading Photos';

      var uploaded = 0;
      var totalCount = 2 * $scope.posts.length;

      $apply($scope);

      async.eachLimit(
        $scope.posts,
        4,
        function(fullPost, cb) {
          uploadPostPhoto(fullPost, function(err /*, data*/) {
            if (err) {
              Log.error('Bulk schedule: post photo upload failed', { error: err });
            }
            $scope.uploadingPercent = Math.floor(100 * uploaded++ / totalCount);
            cb();
          });
        },
        function(err) {
          if (err) {
            $scope.uploaded = false;
            $scope.uploading = false;
            $scope.uploadingPercent = 50;
            $scope.uploadError = 'Photo upload failed. Please try again.';
            return $apply($rootScope);
          }

          $scope.uploadText = 'Scheduling Posts';

          async.eachLimit(
            $scope.posts,
            4,
            function(fullPost, cb) {
              uploadPost(fullPost, recaptchaToken, function(err /*, data*/) {
                if (err) {
                  Log.error('Bulk schedule: post upload failed', { error: err });
                }
                $scope.uploadingPercent = Math.floor(100 * uploaded++ / totalCount);
                cb();
              });
            },
            function() /*err*/ {
              $scope.uploaded = true;
              $scope.uploading = false;
              $scope.uploadingPercent = 100;

              Google.updateAccountsQueueSize(function() {
                $apply($rootScope);
              });
            }
          );
        }
      );
    }

    // function humanCheck(increment, successCallback) {
    //   Google.isRecaptchaRequired(increment, function(err, data) {
    //     var required = err || !data || data.required === undefined || data.required;
    //     if (!required) {
    //       return successCallback();
    //     }

    //     Log.info('Recaptcha required for user '+Google.user._id);
    //     Analytics.push('ui','share','recatcha.required', Google.user._id);

    //     $scope.captchaNotVisible = false;
    //     $apply($scope);

    //     $window.grecaptcha.execute($window.grecaptcha.render('recaptcha', {
    //       theme: 'light',
    //       badge: 'bottomright ',
    //       // size: 'normal',
    //       size: 'invisible',
    //       sitekey: config.recaptcha.sitekey,
    //       callback: successCallback
    //     }));
    //   });
    // }

    $scope.upload = function() {
      var useBulkScheduling = Google.profile.use && Google.profile.use.bulkScheduling;
      if (!useBulkScheduling) {
        return dialogs.premiumRequired({
          lines: function() {
            return [
              'It\'s great to see that you want to bulk schedule posts!',
              '<b>You can upgrade to enable bulk scheduling feature.</b>'];
          },
          featureName: function() {return 'bulk-scheduling';}
        });
      }

      // humanCheck($scope.posts.length, function(recaptchaToken) {
      //   doUpload(recaptchaToken);
      // });
      doUpload();
    };
  }]
);
