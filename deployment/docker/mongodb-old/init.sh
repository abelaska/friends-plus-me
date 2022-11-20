#!/bin/bash
#
set -x
HOST=${HOST:-$(hostname --fqdn)}

if [ ! -f /data/migrated ]; then
  rm -f /data/mongod.lock
  /usr/local/bin/mongod-3.4.13 --dbpath /data --bind_ip 127.0.0.1 &
  sleep 5
  mongo --eval "db.createUser({user:'monstache',pwd:'$MONSTACHE_PWD',roles:[{role:'read',db:'local'},{role:'read',db:'fpm'},{role:'readWrite',db:'monstache'}]});" -u admin -p $ADMIN_PWD admin
  mongo --eval 'db.adminCommand( { setFeatureCompatibilityVersion: "3.4" } )' -u admin -p $ADMIN_PWD admin
  mongo --eval 'db.shutdownServer()' -u admin -p "$ADMIN_PWD" admin
  sleep 5
  touch /data/migrated
  rm -f /data/mongod.lock
fi

if [ ! -f /data/migrated.rs ]; then
  rm -f /data/mongod.lock
  /usr/local/bin/mongod-3.4.13 --dbpath /data --bind_ip 127.0.0.1 --replSet rs0 --keyFile /etc/rs0.key &
  sleep 5
  mongo --eval "rs.initiate({ _id: 'rs0', version: NumberInt(1), members: [{ _id: NumberInt(10), host: '$HOST:27017', priority: NumberInt(1) }] });" -u admin -p $ADMIN_PWD admin
  sleep 5
  mongo --eval 'db.shutdownServer({ force: true })' -u admin -p "$ADMIN_PWD" admin
  sleep 5
  touch /data/migrated.rs
  rm -f /data/mongod.lock
fi

exec /usr/local/bin/mongod --bind_ip 0.0.0.0 --dbpath /data --replSet rs0 --keyFile /etc/rs0.key --auth
