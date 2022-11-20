curl -v -X POST -d '{"filename":"/gs/fpm-user-assets/animated-gif-bannana.gif"}' \
-H "X-Client-Token: XXX" \
localhost:8181/register

curl -v -X POST -d '{"filename":"/gs/social-team-images/animated-gif-bannana.gif"}' \
-H "X-Client-Token: XXX" \
localhost:8181/unregister

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://www.google.cz/logos/doodles/2016/2016-doodle-fruit-games-day-10-5115052026757120-hp.gif","filename":"accountId/animated.gif"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://www.gstatic.com/webp/gallery/1.sm.webp","filename":"accountId/test.webp"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://friendsplus.me/images/home.jpg","filename":"accountId/home.jpg"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://friendsplus.me/images/post-scheduling.png","filename":"accountId/post-scheduling.png"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif","filename":"accountId/Transparent.gif"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://www.google.cz/logos/doodles/2016/2016-doodle-fruit-games-day-10-5115052026757120-hp.gif","filename":"test/animated.gif"}' \
https://image-proxy-dot-fpm-application.appspot.com/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://www.google.cz/logos/doodles/2016/2016-doodle-fruit-games-day-10-5115052026757120-hp.gif","filename":"test/animated.gif"}' \
https://image-proxy-dot-fpm-application.appspot.com/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"filename":"/gs/fpm-user-assets/test/animated.gif"}' \
https://image-proxy-dot-fpm-application.appspot.com/unregister

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://lh3.googleusercontent.com/-JcwjtHDuaAA/WW8ZMsPNHAI/AAAAAAAApwA/KV9MJEMddLkzcm2YEopUYzWoJ5kcH04NACJoC/w530-h439-p-rw/Dragos-Anca-Sanziene-in-Urban-2016-Photo-4-eng_1.jpg","filename":"test/57b9555ed4c4ce0f000ddf0e/57b9555ed4c4ce0f000ddf11/picture/"}' \
https://image-proxy-dot-fpm-application.appspot.com/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://lh3.googleusercontent.com/-JcwjtHDuaAA/WW8ZMsPNHAI/AAAAAAAApwA/KV9MJEMddLkzcm2YEopUYzWoJ5kcH04NACJoC/w530-h439-p-rw/Dragos-Anca-Sanziene-in-Urban-2016-Photo-4-eng_1.jpg","filename":"test/57b9555ed4c4ce0f000ddf0e/57b9555ed4c4ce0f000ddf11/picture/"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://storage.googleapis.com/fpm-user-assets-upload/5559ea470e81376a002234a8/ab0aac00d4604795a254844a39d3299e","filename":"test/57b9555ed4c4ce0f000ddf0e/57b9555ed4c4ce0f000ddf11/picture/"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://www.gstatic.com/webp/gallery/1.sm.webp","filename":"accountId/test.webp"}' \
https://image-proxy-dot-draft-so.appspot.com/fetch
