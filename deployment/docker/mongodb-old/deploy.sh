#!/bin/bash
#
VERSION=$(date +%Y%m%dt%H%M%S)
OUT="gs://fpm-container-builder/mongodb-old-"$VERSION".tar.gz"
#
tar czfm - Dockerfile init.sh rs0.key | gsutil cp - $OUT
gcloud builds submit --config cloudbuild.yaml --substitutions _VER=$VERSION $OUT
gsutil rm $OUT
gcloud container images list-tags gcr.io/fpm-application/mongodb-old