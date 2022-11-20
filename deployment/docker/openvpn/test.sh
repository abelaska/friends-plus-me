mkdir -p secret
docker run -t -v `pwd`/secret:/secret:rw ptlange/openvpn:latest openvpn  --genkey --secret /secret/static.key

docker build --rm -t openvpn:latest .
docker rm -f openvpn-test
docker run --name openvpn-test -p 1194:1194 --privileged \
-v `pwd`/secret:/etc/openvpn/secret:ro \
-e PODIPADDR="192.168.0.102" \
-e OVPN_NETWORK="10.140.0.0/16" \
-e OVPN_SERVER_URL="tcp://192.168.0.102:1194" \
-e OVPN_K8S_SERVICE_NETWORK="10.240.0.0/24" \
-e OVPN_K8S_POD_NETWORK="10.241.0.0/24" \
-e OVPN_VERB="6" \
-d openvpn:latest
docker logs -f openvpn-test

# gcloud docker -- rmi gcr.io/fpm-application/openvpn:latest
# gcloud docker -- run --name openvpn-test-2 gcr.io/fpm-application/openvpn:latest
