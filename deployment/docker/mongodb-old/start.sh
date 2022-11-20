#!/bin/bash
#
set -x
if [ ! -d data ]; then
  mkdir -p data
  ./mongod-3.2.7 --noprealloc --dbpath ./data --bind_ip 127.0.0.1 --port 27018 &
  sleep 3
  mongo --port 27018 --eval "db.createUser({user:'admin',pwd:'XXX',roles:[{role:'userAdminAnyDatabase', db:'admin'},{role:'dbAdminAnyDatabase', db:'admin'},{role:'clusterAdmin', db:'admin'}]});" admin
  mongo --port 27018 --eval "db.createUser({user:'api',pwd:'XXX',roles:['readWrite','dbAdmin']});db.createUser({user:'backend',pwd:'XXX',roles:['readWrite','dbAdmin']});db.createUser({user:'backup',pwd:'XXX',roles:['read','dbAdmin','userAdmin']});" fpm
  mongo --port 27018 --eval "db.test.insert({a:'b'});" fpm
  mongo --port 27018 --eval 'db.shutdownServer()' admin
  sleep 1

  echo

  ./mongod-3.4.13 --noprealloc --dbpath ./data --bind_ip 127.0.0.1 --port 27018 &
  mongo --port 27018 --eval 'db.adminCommand( { setFeatureCompatibilityVersion: "3.4" } )' admin
  mongo --port 27018 --eval 'db.shutdownServer()' admin
  sleep 1

  echo
fi

mongod  --bind_ip 127.0.0.1 --port 27018 --noprealloc --dbpath ./data --replSet rs0 --keyFile rs0.key --auth
