#!/bin/bash
#
VERSION=$(date +%Y%m%dt%H%M%S)
OUT="gs://fpm-container-builder/fpm-help-"$VERSION".tar.gz"
#
tar czfm - Dockerfile nginx.conf | gsutil cp - $OUT
gcloud builds submit --config cloudbuild.yaml --substitutions _VER=$VERSION $OUT
gsutil rm $OUT
gcloud container images list-tags gcr.io/fpm-application/fpm-help

kubectl set image deployment fpm-help-help help=gcr.io/fpm-application/fpm-help:$VERSION
# kubectl rolling-update fpm-help-help --image=gcr.io/fpm-application/fpm-help:$VERSION