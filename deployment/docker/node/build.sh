#!/bin/bash
#
VERSION="16-alpine3.15"
OUT="gs://fpm-container-builder/node-"$(date +%Y%m%dt%H%M%S)".tar.gz"
#

COPYFILE_DISABLE=1 tar czf - Dockerfile docker-entrypoint.sh | gsutil cp - $OUT

gcloud builds submit --timeout 20m --config cloudbuild.yaml --substitutions _VER=$VERSION $OUT
gsutil rm $OUT
gcloud container images list-tags gcr.io/fpm-application/node
