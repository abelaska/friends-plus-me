'use strict';

angular.module('fpmApp')
  .directive('convertToNumber', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        ngModel.$parsers.push(function(val) {
          return val !== null && val !== undefined ? parseInt(val, 10) : null;
        });
        ngModel.$formatters.push(function(val) {
          return val !== null && val !== undefined ? '' + val : null;
        });
      }
    };
  })
  .controller('AccountSchedulingCtrl', ['$rootScope', '$scope', '$apply', 'dialogs', 'flash', 'Google', '_', 'moment', 'types', 'jstz', function($rootScope, $scope, $apply, dialogs, flash, Google, _, moment, types, jstz) {

    var profile = Google.profile;
    var dayProps = ['mon','tue','wed','thu','fri','sat','sun'];

    var isInstagram = $scope.account && $scope.account.network === types.network.instagram.code;

    $scope.Google = Google;
    $scope.profile = profile;
    $scope.ng = $scope.account && ($scope.account.ng || isInstagram); // next-generation scheduling
    $scope.isFree = !Google.isPremium();
    $scope.isNotFree = !$scope.isFree;
    $scope.timezones = moment.tz.names();
    $scope.schedule = null;
    $scope.scheduling = $scope.ng ? { delay: 60, schedules: [] } : ($scope.account.scheduling || {
      stype: 'd',
      delay: 60,
      tz: jstz.determine().name(),
      schedules: []
    });
    $scope.loading = $scope.ng;
    $scope.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    $scope.ngType = $scope.ng ? null : ($scope.scheduling.stype === 'd' ? 'delay' : 'times'); // times || counts || delay
    $scope.ngSchEvery = ['', '', '', '', '', '', ''];
    $scope.ngSch = [0, 0, 0, 0, 0, 0, 0];
    $scope.ngSchMax = 500;
    $scope.ngSchWeek = 0;
    $scope.ngSchWeekMax = 7 * $scope.ngSchMax;
    $scope.isCountsAvailable = $scope.ng;
    $scope.isTimesAvailable = !isInstagram;
    $scope.isDelayAvailable = !isInstagram;

    var scheduleUpdateTimer;

    function scheduleQueueUpdate() {
      if (scheduleUpdateTimer) {
        clearTimeout(scheduleUpdateTimer);
      }
      scheduleUpdateTimer = setTimeout(function() {
        scheduleUpdateTimer = null;
        $scope.updateQueueDetails();
      }, 1000);
    }

    $scope.ngSchUpdated = function(type) {
      switch (type) {
      case 'week':
        $scope.ngSchWeek = $scope.ngSchWeek || $scope.ngSchWeekMax;
        var day = Math.floor($scope.ngSchWeek / 7);
        var other = $scope.ngSchWeek - 7 * day;
        for (var i = 0; i < 7; i++) {
          $scope.ngSch[i] = day + (other-- > 0 ? 1: 0);
        }
        break;
      default:
        $scope.ngSch = $scope.ngSch.map(function(d) { return d || 0; });
        $scope.ngSchWeek = $scope.ngSch.reduce(function(r,v) { return r + v; }, 0);
        break;
      }
      $scope.ngSchEvery = $scope.ngSch.map(function(d) {
        if (!d) {
          return '';
        }
        var i = Math.ceil((24 * 60) / (d + 1));
        var h = Math.floor(i / 60);
        var m = i - (h * 60);
        var hs = h > 0 ? h + ' hour' + (h > 1 ? 's' : '') : '';
        var ms = m > 0 ? m + ' minute' + (m > 1 ? 's': '') : '';
        return hs + ( hs && ms ? ' and ' : '') + ms;
      });
      scheduleQueueUpdate();
    };

    function convertFromDbSchedule(s) {
      var sch = {
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
        sun: false,
        times: []
      };

      s.forEach(function(t) {
        sch[dayProps[Math.floor(t / (24*60))]] = true;
        sch.times.push(t % (24*60));
      });

      sch.times = _.union(sch.times);

      return sch;
    }

    function loadQueueNg(queue) {
      var counts = queue.scheduling.counts;
      var schedules = queue.scheduling.schedules;

      $scope.ngType = queue.scheduling.type;
      $scope.ngSch =  (counts && [counts.mon, counts.tue, counts.wed, counts.thu, counts.fri, counts.sat, counts.sun]) || [0,0,0,0,0,0,0];
      $scope.ngSchMax = queue.limits.posts_per_day;
      $scope.ngSchWeekMax = 7 * $scope.ngSchMax;
      $scope.ngSch = $scope.ngSch.map(function(d) { return d || 0; });
      $scope.ngSchWeek = $scope.ngSch.reduce(function(r,v) { return r + v; }, 0);
      $scope.scheduling.tz = queue.scheduling.timezone || 'UTC';
      $scope.scheduling.delay = queue.scheduling.delay;
      $scope.scheduling.schedules = (schedules && schedules.map(function(s) {
        var sch = {
          mon: s.days.indexOf('mon') > -1,
          tue: s.days.indexOf('tue') > -1,
          wed: s.days.indexOf('wed') > -1,
          thu: s.days.indexOf('thu') > -1,
          fri: s.days.indexOf('fri') > -1,
          sat: s.days.indexOf('sat') > -1,
          sun: s.days.indexOf('sun') > -1,
          times: s.times.map(function(t) {
            var split = t.split(':');
            return parseInt(split[0], 10) * 60 + parseInt(split[1], 10);
          })
        };
        return sch;
      })) || [{
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
        sun: false,
        times: []
      }];
      $scope.scheduleIndex = 0;
      $scope.schedule = $scope.scheduling.schedules[$scope.scheduleIndex];
      $scope.loading = false;
      $apply($scope);      
    }

    $scope.updateQueueDetails = function() {
      var scheduler = {
        timezone: $scope.scheduling.tz,
        type: $scope.ngType
      };
      switch ($scope.ngType) {
      case 'counts':
        scheduler.counts = {
          mon: $scope.ngSch[0], 
          tue: $scope.ngSch[1], 
          wed: $scope.ngSch[2], 
          thu: $scope.ngSch[3], 
          fri: $scope.ngSch[4], 
          sat: $scope.ngSch[5], 
          sun: $scope.ngSch[6]
        };
        break;
      case 'times':
        // [{days:["mon","tue"],times:["10:35","12:45"]}]
        // var schedules = $scope.scheduling.schedules.map(convertFromDbSchedule).map(function(s) {
        var schedules = $scope.scheduling.schedules.map(function(s) {
          return {
            days: dayProps.map(function(d) { return s[d] ? d : null; }).filter(function(d){return d}),
            times: s.times.map(function(t) { 
              var m = t % 60;
              var h = Math.floor(t / 60);
              return h+':'+(m < 10 ? '0': '')+m;
            })
          };
        });
        scheduler.schedules = schedules;
        break;
      case 'delay':
        scheduler.delay = $scope.scheduling.delay;
        break;
      }
      Google.apiQueuesUpdateScheduling($scope.account._id, scheduler, function(error, data) {
        if (error || !data || !data.ok) {
          return flash.error('Post Scheduling', 'Failed to update queue scheduling. Please try again.');
        }
        loadQueueNg(data.queue);
        return flash.success('Post Scheduling', 'Queue sucessfully updated.');
      });
    };

    $scope.loadQueueDetails = function() {
      Google.apiQueuesInfo($scope.account._id, function(error, data) {
        if (error || !data || !data.ok) {
          return flash.error('Post Scheduling', 'Failed to load queue details. Please try again.');
        }
        loadQueueNg(data.queue);
      });
    }

    if (!$scope.scheduling.stype) {
      $scope.scheduling.stype = 't';
    }

    if (!$scope.scheduling.tz) {
      $scope.scheduling.tz = jstz.determine().name();
    }

    var updateTzLocalTime = function() {
      $scope.tzLocalTime = moment.tz($scope.scheduling.tz).format('h:mma');
    };

    $scope.scheduleTitle = function(s) {
      var title = '',
          everyDay = true,
          days = {
          'Mon': 'Monday',
          'Tue': 'Tuesday',
          'Wed': 'Wednesday',
          'Thu': 'Thursday',
          'Fri': 'Friday',
          'Sat': 'Saturday',
          'Sun': 'Sunday'
        };

      if (s) {
        if (_.isArray(s)) {
          s = convertFromDbSchedule(s);
        }

        _.keys(days).forEach(function(day) {
          if (s[day.toLowerCase()]) {
            if (title.length > 0) {
              title += ', ';
            }
            title += day;
          } else {
            everyDay = false;
          }
        });
        title = days[title] || title;
      }

      if (everyDay) {
        title = 'Every Day';
      } else
      if (!title) {
        title = 'Disabled';
      }

      return title;
    };

    $scope.timeTitle = function(timeSeconds) {
      var m = timeSeconds % 60,
          h = Math.floor((timeSeconds - m) / 60),
          a = h >= 12 ? 'pm' : 'am';
      h = h % 12;
      h = h ? h : 12; // the hour '0' should be '12'
      return h + ':' + (m < 10 ? '0' : '') + m + a;
    };

    function genTm(base, maxPlus) {
      return base + Math.floor(Math.random() * (maxPlus + 1));
    }

    $scope.selectSchedule = function(index) {
      $scope.scheduleIndex = index;

      var s = $scope.scheduling.schedules.length > index ? $scope.scheduling.schedules[index] : null;
      if (s) {
        $scope.schedule = $scope.ng ? s : convertFromDbSchedule(s);
      } else {
        $scope.schedule = null;
      }
    };

    var updateDb = function() {
      $scope.updating = true;

      // podle $scope.schedule upravit $scope.scheduling.schedules[$scope.scheduleIndex]
      if ($scope.schedule) {
        var day, s = [];

        for (var i = 0; i < dayProps.length; i++) {
          day = dayProps[i];
          if ($scope.schedule[dayProps[i]]) {
            for (var j = 0; j < $scope.schedule.times.length; j++) {
              s.push(i*24*60+$scope.schedule.times[j]);
            }
          }
        }

        s.sort(function (a, b) {
          return a - b;
        });

        $scope.scheduling.schedules[$scope.scheduleIndex] = s;
      }

      // $scope.scheduling.stype = $scope.stype === 'i' ? 'd' : $scope.stype;

      Google.updateAccountScheduling($scope.account, $scope.scheduling, function(err, success) {
        $scope.updating = false;
        if (success) {
          flash.success('Post Scheduling', 'Settings successfully updated.');
        } else {
          flash.error('Post Scheduling', 'Failed to update settings. Please try again.');
        }
      });
    };

    $scope.updateDb = updateDb;

    function createNewSchedule(doNotSave, empty) {

      var t,
          times = [],
          schedule = [];

      function addTime(startHour, startMinute, startDiff, nextOffs, nextDiff, nextCount) {
        t = genTm(startHour*60+startMinute, startDiff);
        times.push(t);
        while (nextCount-- > 0) {
          t = genTm(t+nextOffs, nextDiff);
          times.push(t);
        }
      }

      if (!empty) {
        switch ($scope.account.network) {
        case types.network.linkedin.code: // 4 reposty
          addTime( 7, 20, 20,  40, 10, 1);
          addTime(17, 20, 20,  40, 10, 1);
          break;
        case types.network.facebook.code: // 8 repostu
          addTime( 6, 30, 30,  60, 10, 1);
          addTime(13, 30, 30,  60, 10, 5);
          break;
        case types.network.tumblr.code: // 4 reposty
          addTime( 7, 30, 30,  60, 10, 3);
          break;
        case types.network.google.code: // 3 reposty
          addTime( 9,  0, 60,  20, 15, 2);
          break;
        default: // 12 repostu
          // case types.network.twitter.code: 
          // case types.network.instagram.code:
          addTime( 7, 20, 20,  45, 10, 3);
          addTime(13, 30, 30,  60, 10, 4);
          addTime(19, 30, 30,  60, 10, 2);
          break;
        }

        if ($scope.ng) {
          schedule = {
            mon: true,
            tue: true,
            wed: true,
            thu: true,
            fri: true,
            sat: true,
            sun: true,
            times: times
          };
        } else {
          for (var i = 0; i < 7; i++) {
            for (var j = 0; j < times.length; j++) {
              schedule.push(i*24*60+times[j]);
            }
          }  
        }
      }

      $scope.scheduling.schedules.push(schedule);

      $scope.selectSchedule($scope.scheduling.schedules.length - 1);

      if (!doNotSave) {
        if ($scope.ng) {
          scheduleQueueUpdate();
        } else {
          updateDb();
        }
      }
    }

    $scope.newSchedule = function(doNotSave) {
      if ($scope.isFree) {
        dialogs.premiumRequired({
          lines: function() {
            return [
              'It\'s great to see that you want to use create a new reposting schedule but this feature is not a part of your current plan.',
              'You can upgrade to create a new <strong>reposting schedule</strong>.'
            ];
          },
          featureName: function() {return 'add-repost-schedule';}
        });
      } else {
        createNewSchedule(doNotSave);
      }
    };

    $scope.tzChanged = function() {
      if ($scope.scheduling.tz) {
        updateTzLocalTime();
        updateDb();
      }
    };

    $scope.dayChanged = function(day) {
      $scope.schedule[day] = !$scope.schedule[day];
      if ($scope.ng) {
        scheduleQueueUpdate();
      } else {
        updateDb();
      }
    };

    $scope.deleteSchedule = function(index) {
      if ($scope.scheduling.schedules.length > 1) {

        dialogs.confirmDelete('Delete reposting schedule', 'Please, confirm the removal of reposting schedule.',
        function() {
          $scope.scheduling.schedules.splice(index === undefined ? $scope.scheduleIndex : index, 1);

          $scope.selectSchedule(0);

          if ($scope.ng) {
            scheduleQueueUpdate();
          } else {
            updateDb();
          }
        });
      }
    };

    $scope.removeTime = function(index) {
      $scope.schedule.times.splice(index, 1);
    };

    $scope.disableEvent = function($event) {
      $event.stopPropagation();
      $event.preventdefault();
      return false;
    }

    $scope.schedulingTzChange = function() {
      if ($scope.ng) {
        scheduleQueueUpdate();
      } else  {
        $scope.tzChanged();
      }
    };

    $scope.schedulingDelayChange = function() {
      updateDb();
    };

    $scope.ngTypeChange = function() {
      if ($scope.ng) {
        scheduleQueueUpdate();
      } else {
        switch ($scope.ngType) {
        case 'times':
          $scope.scheduling.stype = 't';
          break;
        case 'delay':
          $scope.scheduling.stype = 'd';
          break;
        }
        updateDb();
      }
    };

    var reTime24h = /(0[0-9]|1[0-9]|2[0-3]|[0-9])[:](0[0-9]|[1-4][0-9]|5[0-9]|[0-9])/i;
    var reTimeAmPm = /(0[0-9]|1[0-2]|[1-9])[:](0[0-9]|[1-4][0-9]|5[0-9]|[0-9])(am|pm)/i;

    $scope.transformChip = function ($chip) {
      var h, m, ampm, hour, minute;
      if ((m = reTimeAmPm.exec($chip)) !== null) {
        h = parseInt(m[0]);
        ampm = m[3].toLowerCase();
        hour = h + (h < 12 && ampm === 'pm' ? 12 : (h === 12 && ampm === 'am' ? -12: 0));
        minute = parseInt(m[2]);
      } else
      if ((m = reTime24h.exec($chip)) !== null) {
        hour = parseInt(m[0]);
        minute = parseInt(m[2]);
      } else {
        return null;
      }
      return hour * 60 + minute;
    };

    if (!$scope.account.scheduling || ($scope.account.scheduling.schedules && $scope.account.scheduling.schedules.length === 0)) {
      createNewSchedule(true, true);
    }

    updateTzLocalTime();

    if ($scope.ng) {
      if ($scope.account) {
        $scope.loadQueueDetails();
      }
    } else {
      $scope.selectSchedule(0);
    }
  }]);
