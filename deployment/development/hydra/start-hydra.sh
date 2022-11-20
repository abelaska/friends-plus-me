#!/bin/bash
#
HYDRA_VERSION="0.11.12"
#
DIR=$(dirname $0)
docker run --name draft-hydra-dev -p 4444:4444 --env-file "$DIR/env.conf" --entrypoint "hydra" --rm oryd/hydra:v$HYDRA_VERSION-alpine host --dangerous-force-http