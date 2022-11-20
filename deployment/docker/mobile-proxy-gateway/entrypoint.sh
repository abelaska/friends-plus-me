#!/bin/sh
#
echo "$(date "+%a %b %d %H:%M:%S %Y") Running openvpn"
exec /usr/sbin/openvpn --cd /etc/openvpn --config /etc/openvpn/server.conf 1>/dev/stderr 2>/dev/stderr
