#!/bin/bash
#
VERSION=$(node -p -e "require('./package.json').version")
OUT="gs://fpm-container-builder/web-image-proxy-api-"$(date +%Y%m%dt%H%M%S)".tar.gz"
PROJECT_ID=${1:-"fpm-application"}
#
tar czfm - *.go Dockerfile | gsutil cp - $OUT
gcloud builds submit --project $PROJECT_ID --config cloudbuild.yaml --substitutions _VER=$VERSION $OUT
gsutil rm $OUT
gcloud container images list-tags gcr.io/$PROJECT_ID/draft-web-image-proxy-api

POD=""
[ $PROJECT_ID == "fpm-application" ] && POD="fpm-ipapi-fpm-ipapi"
[ $PROJECT_ID == "draft-so" ] && POD="draft-ipapi-draft-ipapi"
[ -z "$POD" ] || kubectl set image deployment $POD image-proxy-api=gcr.io/$PROJECT_ID/draft-web-image-proxy-api:$VERSION