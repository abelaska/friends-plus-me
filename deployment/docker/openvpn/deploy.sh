#!/bin/bash
#
VERSION=$(date +%Y%m%dt%H%M%S)
OUT="gs://fpm-container-builder/openvpn-"$VERSION".tar.gz"
#
tar czfm - Dockerfile nginx.conf | gsutil cp - $OUT
gcloud builds submit --config cloudbuild.yaml --substitutions _VER=$VERSION $OUT
gsutil rm $OUT
gcloud container images list-tags gcr.io/fpm-application/openvpn