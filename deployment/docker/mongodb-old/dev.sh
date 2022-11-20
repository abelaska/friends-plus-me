#!/bin/bash
#
docker build --rm -t mongodb-old:latest .

# rm -rf ./data
[ ! -d data ] && mkdir -p data
docker run -ti --rm --name mongodb-old-dev -p 27017:27017 \
-v `pwd`/data:/data \
-e ADMIN_PWD='XXX' \
-e MONSTACHE_PWD='XXX' \
-e HOST="127.0.0.1" \
mongodb-old:latest
