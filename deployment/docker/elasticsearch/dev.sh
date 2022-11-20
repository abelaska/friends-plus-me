#!/bin/bash
#
[ ! -d data ] && mkdir -p data
docker run -ti --rm --name elasticsearch-dev \
-p 9200:9200 -p 9300:9300 \
-v `pwd`/data:/usr/share/elasticsearch/data \
-e "http.host=0.0.0.0" \
-e "transport.host=0.0.0.0" \
-e "discovery.type=single-node" \
-e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
docker.elastic.co/elasticsearch/elasticsearch-oss:6.2.2

# -e "cluster.name"="fpm-cluster" \
# -e "bootstrap.memory_lock"="true" \
