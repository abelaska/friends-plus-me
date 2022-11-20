#!/bin/bash
#
VPN_SERVER="35.184.14.11"
VPN_DNS="8.8.8.8"
VPN_SECRET="XXX"
VPN_USERNAME="device-proxy"
VPN_PASSWORD="XXX"

function tap() {
  adb shell input tap $1 $2
}

function swipe() {
  adb shell input swipe $1 $2 $3 $4
}

function text() {
  adb shell input text $(echo $1 | sed -e "s/[ \t]/\%s/g")
}

# VPN setting
adb shell su 0 am start -W -a android.settings.VPN_SETTINGS
tap 672 56
text "Mobile Proxy VPN"
# pick type: IPSec Xauth PSK
tap 77 365
swipe 77 365 77 255
tap 77 508
# input server address
tap 77 449
text $VPN_SERVER
# scroll to IPSec preshared key
swipe 77 449 77 150
tap 77 269
sleep 0.2
text $VPN_SECRET
# show advanced options
tap 67 360
# input dns servers
swipe 77 449 77 349
tap 77 482
sleep 0.2
text $VPN_DNS
# input username
swipe 77 449 77 100
tap 77 194
sleep 0.2
text $VPN_USERNAME
# input password
tap 77 323
sleep 0.2
text $VPN_PASSWORD
# tap save
tap 574 582
