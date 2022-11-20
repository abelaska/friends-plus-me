#!/bin/bash
#
VERSION=$(date +%Y%m%dt%H%M%S)
OUT="gs://fpm-container-builder/mobile-proxy-gateway-"$VERSION".tar.gz"
#
tar czfm - Dockerfile entrypoint.sh | gsutil cp - $OUT
gcloud builds submit --config cloudbuild.yaml --substitutions _VER=$VERSION $OUT
gsutil rm $OUT
gcloud container images list-tags gcr.io/fpm-application/mobile-proxy-gateway

# kubectl set image deployment mobile-proxy-gateway-help help=gcr.io/fpm-application/mobile-proxy-gateway:$VERSION
# kubectl rolling-update mobile-proxy-gateway-help --image=gcr.io/fpm-application/mobile-proxy-gateway:$VERSION