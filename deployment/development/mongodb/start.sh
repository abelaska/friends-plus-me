#!/bin/bash
#
DIR=$(dirname $0)
DATADIR="$DIR/data"

if [ ! -d $DATADIR ]; then
  mkdir -p $DATADIR
fi
mongod --bind_ip 127.0.0.1 --dbpath $DATADIR --wiredTigerCacheSizeGB 1
