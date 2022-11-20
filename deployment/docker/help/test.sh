docker rm -f fpm-help-test
docker run --name fpm-help-test -p 80:80 -v `pwd`/nginx.conf:/etc/nginx/nginx.conf:ro -d nginx:alpine
docker logs fpm-help-test
echo check http://localhost

# gcloud docker -- rmi gcr.io/fpm-application/fpm-help:latest
# gcloud docker -- run --name fpm-help-test-2 gcr.io/fpm-application/fpm-help:latest
