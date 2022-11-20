#!/bin/bash
#
docker run -ti --rm --net=host --name monstache-dev \
-v `pwd`/config.toml:/config.toml \
rwynn/monstache:4.2.1 -f /config.toml