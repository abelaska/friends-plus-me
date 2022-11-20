#!/bin/bash
#
VERSION=$(node -p -e "require('./package.json').version")
OUT="gs://fpm-container-builder/fpm-api-"$(date +%Y%m%dt%H%M%S)".tar.gz"
#
(
  cd ../.. && \
  pnpm -r build:clean && \
  COPYFILE_DISABLE=1 tar czf - \
    --exclude='./node_modules' --exclude='./__tests__' \
    packages services/fpm-web-api \
    pnpm* package.json | gsutil cp - $OUT
)
gcloud builds submit --timeout 30m --config cloudbuild.yaml --substitutions _VER=$VERSION $OUT
gsutil rm $OUT
gcloud container images list-tags gcr.io/fpm-application/fpm-api

kubectl set image deployment fpm-api api=gcr.io/fpm-application/fpm-api:$VERSION
