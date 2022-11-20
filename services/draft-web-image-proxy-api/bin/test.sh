curl -v -X POST -d '{"filename":"/gs/social-team-images/animated-gif-bannana.gif"}' \
-H "X-Client-Token: XXX" \
localhost:8181/register

curl -v -X POST -d '{"filename":"/gs/social-team-images/animated-gif-bannana.gif"}' \
-H "X-Client-Token: XXX" \
localhost:8181/unregister

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://www.google.cz/logos/doodles/2016/2016-doodle-fruit-games-day-10-5115052026757120-hp.gif","filename":"accountId/animated.gif"}' \
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
  '{"url":"https://storage.googleapis.com/fpm-user-assets-upload/54fd954db853be010073c4d7/09340d3b3de245e99f5a9db2f60ce590.png","filename":"test/57b9555ed4c4ce0f000ddf0e/57b9555ed4c4ce0f000ddf11/picture/"}' \
https://image-proxy-api-dot-fpm-application.appspot.com/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://lh3.googleusercontent.com/-JcwjtHDuaAA/WW8ZMsPNHAI/AAAAAAAApwA/KV9MJEMddLkzcm2YEopUYzWoJ5kcH04NACJoC/w530-h439-p-rw/Dragos-Anca-Sanziene-in-Urban-2016-Photo-4-eng_1.jpg","filename":"test/57b9555ed4c4ce0f000ddf0e/57b9555ed4c4ce0f000ddf11/picture/"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://storage.googleapis.com/fpm-user-assets-upload/5559ea470e81376a002234a8/ab0aac00d4604795a254844a39d3299e","filename":"test/57b9555ed4c4ce0f000ddf0e/57b9555ed4c4ce0f000ddf11/picture/"}' \
localhost:8181/fetch

curl -v -X POST -d '{"filename":"/gs/fpm-user-assets/animated-gif-bannana.gif"}' \
-H "X-Client-Token: XXX" \
localhost:8181/register

curl -v -X POST -d '{"filename":"/gs/fpm-user-assets/test/57b9555ed4c4ce0f000ddf0e/57b9555ed4c4ce0f000ddf11/picture/64f1f172012112dab1cf0f664f237fe8"}' \
-H "X-Client-Token: XXX" \
localhost:8181/unregister

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://storage.googleapis.com/fpm-user-assets-upload/54fd954db853be010073c4d7/09340d3b3de245e99f5a9db2f60ce590.png","filename":"test/57b9555ed4c4ce0f000ddf0e/57b9555ed4c4ce0f000ddf11/picture/"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://www.google.cz/logos/doodles/2016/2016-doodle-fruit-games-day-10-5115052026757120-hp.gif","filename":"test/animated.gif"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://cdn.tinybuddha.com/wp-content/uploads/2017/07/Sitting-silhouette.png","filename":"test/test.png"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://lh3.googleusercontent.com/-WQQSmoeeLtw/WETgX-iarQI/AAAAAAAAJkM/ITMZm8MiUPEfKyz3ov_Z4AoL5dx-faX7QCJoC/s0/45229858-9c0e-41e4-9e77-cee07329277a","filename":"test/test"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://lh3.googleusercontent.com/-T4CCfHWy2qE/WlbTLZ2AqGI/AAAAAAAEO_I/qglysPzo2Xc-mjC0_rQgPNE9wSEP-2laQCJoC/s2048/18+-+1"}' \
localhost:8181/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://lh3.googleusercontent.com/-T4CCfHWy2qE/WlbTLZ2AqGI/AAAAAAAEO_I/qglysPzo2Xc-mjC0_rQgPNE9wSEP-2laQCJoC/s2048/18+-+1","filename":"test/test"}' \
http://fpm-ipapi-fpm-ipapi:8080/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://lh3.googleusercontent.com/-T4CCfHWy2qE/WlbTLZ2AqGI/AAAAAAAEO_I/qglysPzo2Xc-mjC0_rQgPNE9wSEP-2laQCJoC/s2048/18+-+1","filename":"test/test"}' \
http://fpm-ipapi-fpm-ipapi:8080/fetch

curl -v -X POST -H "X-Client-Token: XXX" -d \
  '{"url":"https://lh3.googleusercontent.com/-T4CCfHWy2qE/WlbTLZ2AqGI/AAAAAAAEO_I/qglysPzo2Xc-mjC0_rQgPNE9wSEP-2laQCJoC/s2048/18+-+1","filename":"test/57b9555ed4c4ce0f000ddf0e/57b9555ed4c4ce0f000ddf11/picture/"}' \
http://fpm-ipapi-fpm-ipapi:8080/fetch
