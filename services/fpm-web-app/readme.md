https://materialdesignicons.com/

brew reinstall --build-from-source vips

brew install imagemagick
brew install homebrew/science/vips --with-imagemagick --with-webp

---- socket.io -----------
    "socket.io": "~1.3",
    "socket.io-redis": "~0.1",
    "socket.io-emitter": "~0.2",
--------------------------

apt-get install libopenslide-dev

Architecture
============

DEV
---
* Domena friendsplus.me bude smerovana na AWS CloudFront (Amazon S3), kde bude hostovana AngularJS aplikace.
* Na VPS bude hostovana http(s)://api.friendsplus.me poskytujici API.
  * Nutno doplnit CORS modul.

PRODUCTION
----------

* Domena friendsplus.me/www.friendsplus.me bude smerovana na Amazon S3, kde bude hostovana AngularJS aplikace.
* Bude potreba migrovat domenu friendsplus.me z DNS serveru Gandi.net do Route 53
* Zapnout pro hostovany Amazon S3 bucket Amazon Cloufront (ale to az hodne pozdeji)
* Na nodejitsu bude hostovano api.friendsplus.me/apifpme.jit.su poskytujici API.
  * Nutno doplnit CORS modul.


MODULY
------

* http://www.malot.fr/bootstrap-datetimepicker/index.php
* http://pellepim.bitbucket.org/jstz/

Pro build je potreba:
optipng verze vetsi >=0.7
sudo apt-get install gifsicle
sudo apt-get install pngquant

https://github.com/angular-ui/ui-sortable
https://github.com/dalelotts/angular-bootstrap-datetimepicker
https://github.com/mbenford/ngTagsInput
https://github.com/CogniStreamer/tinyMCE-mention
https://github.com/angular-ui/ui-router
https://github.com/angular-ui/ui-tinymce
http://yeoman.io
================
sudo npm install -g yo grunt-cli bower
npm install generator-angular generator-karma  # install generators
yo angular                     # scaffold out a AngularJS project
npm install && bower install   # install default dependencies
bower install angular-ui       # install a dependency for your project from Bower
grunt test                     # test your app
grunt server                   # preview your app
grunt                          # build the application for deployment

Priprava pred spustenim projektu
================================
npm install && bower install
grunt server

design
======

http://flatuicolors.com/

components
==========
https://github.com/gbrits/yeoman-less
http://fortawesome.github.com/Font-Awesome/
https://github.com/yeoman/generator-angular
http://tenxer.github.io/xcharts/
https://github.com/CodeSeven/toastr
https://github.com/jameshalsall/jQuery-Spotlight
https://github.com/HubSpot/shepherd
https://github.com/ultrapasty/jquery-disablescroll

// https://github.com/mlegenhausen/angular-foodwatcher/blob/master/app/scripts/controllers/app.js
// http://stackoverflow.com/questions/12706228/how-do-i-get-a-page-access-token-that-does-not-expire

/*
    $window.linkedinAsyncInit = function() {
      $scope.$broadcast('event:linkedin:loaded');
    };

    // Load the SDK Asynchronously
    (function() {
      var po = document.createElement('script');
      po.type = 'text/javascript'; po.async = true;
      po.src = 'http://platform.linkedin.com/in.js?async=true';
      po.onload = function() {
        IN.init({
          api_key: 'XXX',
          onLoad: 'linkedinAsyncInit',
          credentials_cookie: true
        });
      };
      var s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(po, s);
    })();

    $scope.$on('event:linkedin:loaded', function(event) {

      console.log('linkedin loaded');

      $scope.linkedin.appAuthorized = IN.User.isAuthorized();

      console.log('IN.User.isAuthorized()',IN.User.isAuthorized());

      IN.Event.on(IN, 'auth', function(a,b,c,d) {
        console.log('linkedin auth',a,b,c,d);

        $scope.linkedin.appAuthorized = IN.User.isAuthorized();
        $scope.$apply();
      });

      IN.Event.on(IN, 'logout', function() {
        console.log('linkedin logout');
      });
    });

    $scope.linkedinLogin = function() {
      //$http.jsonp('https://www.linkedin.com/secure/login?session_full_logout=&trk=hb_signout');
      IN.User.authorize(function(a,b,c,d) {
        console.log('linkedin logged in',a,b,c,d);
        $scope.linkedin.loggedIn = true;
        $scope.$apply();
      });
    };

    $scope.linkedinLogout = function() {
      IN.User.logout(function(a,b,c,d) {
        console.log('linkedin logged out',a,b,c,d);
        $scope.linkedin.loggedIn = false;
        $scope.$apply();
      });
    };*/

