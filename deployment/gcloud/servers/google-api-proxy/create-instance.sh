#!/bin/sh
#
NAME="google-api-proxy"
#
gcloud compute instances create $NAME \
  --project fpm-application \
  --description "Europe Google API Proxy" \
  --image-family ubuntu-1604-lts \
  --image-project ubuntu-os-cloud \
  --zone europe-west1-c \
  --machine-type f1-micro \
  --boot-disk-size 10GB \
  --boot-disk-type pd-standard \
  --metadata-from-file startup-script=startup-script.sh
