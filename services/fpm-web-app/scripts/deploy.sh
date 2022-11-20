#!/bin/bash
#
VERSION=$(node -p -e "require('./package.json').version")
OUT="gs://fpm-container-builder/fpm-web-app-"$(date +%Y%m%dt%H%M%S)".tar.gz"
#
(
  cd ../.. && \
  pnpm -r build:clean && \
  COPYFILE_DISABLE=1 tar czf - \
    --exclude='./node_modules' --exclude='./__tests__' \
    packages services/fpm-web-app \
    pnpm* package.json | gsutil cp - $OUT
)
gcloud builds submit --timeout 30m --config cloudbuild.yaml --substitutions _VER=$VERSION $OUT
gsutil rm $OUT
gcloud container images list-tags gcr.io/fpm-application/fpm-web-app

kubectl set image deployment fpm-webapp webapp=gcr.io/fpm-application/fpm-web-app:$VERSION
