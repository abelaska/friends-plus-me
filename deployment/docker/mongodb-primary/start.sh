#!/bin/bash
#
set -x
if [ ! -d data ]; then
  mkdir -p data
  mongod --noprealloc --dbpath ./data --bind_ip 127.0.0.1 &
  sleep 3
  mongo --eval "db.createUser({user:'admin',pwd:'XXX',roles:[{role:'userAdminAnyDatabase', db:'admin'},{role:'dbAdminAnyDatabase', db:'admin'},{role:'clusterAdmin', db:'admin'}]});" admin
  mongo --eval 'db.shutdownServer()' admin
  sleep 1
fi
mongod --bind_ip 127.0.0.1 --noprealloc --dbpath ./data --replSet rs0 --keyFile rs0.key --auth

# migration
#  1. restart current standalong instance with new mongodb 3.4 and parameter --replSet rs0
#  2. initialize replica set
#     > use admin;
#     > db.auth('admin','XXX');
#     > rs.initiate({ _id: 'rs0', version: 1, members: [{ _id: 10, host: '127.0.0.1:27018', priority: 1 }] });
#     > rs.status();
#  3. update database connection string of all services to connect to replica set and deploy new versions
#  4. start pod with database server in kubernetes with parameter --replSet rs0
#  5. add pod to replica set as a secondary node
#     rs0:PRIMARY> rs.add({ host: '127.0.0.1:27017', priority: 0, votes: 0 })
#  6. wait till secondary is synchronized (or is within 10s of the oplog time of the primary)
#     rs0:SECONDARY> db.printSlaveReplicationInfo()
#  7. update priority a votes parameter of secondary
#     rs0:SECONDARY> var cfg = rs.conf();cfg.members[1].priority=1;cfg.members[1].votes=1;rs.reconfig(cfg);
#  8. force the current primary to stepdown
#     rs0:PRIMARY> rs.stepDown(60)
#  9. wait until secondary is promoted to primary
#     > rs.status()
# 10. update priority a votes parameter of new secondary
#     rs0:PRIMARY> var cfg = rs.conf();cfg.members[0].priority=0;cfg.members[0].votes=0;rs.reconfig(cfg);
# 11. stop secondary node
# 12. remove secondary node from replica set
#     rs0:PRIMARY> rs.remove('127.0.0.1:27018')
