#!/bin/bash
#
set -x
VPN_SERVER="35.184.14.11"
VPN_DNS="8.8.8.8"
VPN_SECRET="XXX"
VPN_USERNAME="device-proxy"
VPN_PASSWORD="XXX"

# !!!!!!! konverze tap souradnic bohuzel tak uplne nefunguje, nestaci to
exit

# lg nexus 4
# SCREEN_WIDTH=768
# SCREEN_HEIGHT=1280

# lg nexus 5
SCREEN_WIDTH=1080
SCREEN_HEIGHT=1920

function tap() {
  adb shell input tap $((($SCREEN_WIDTH*$1)/768)) $((($SCREEN_HEIGHT*$2)/1280))
}

function swipe() {
  adb shell input swipe $((($SCREEN_WIDTH*$1)/768)) $((($SCREEN_HEIGHT*$2)/1280)) $((($SCREEN_WIDTH*$3)/768)) $((($SCREEN_HEIGHT*$4)/1280))
}

function text() {
  adb shell input text $(echo $1 | sed -e "s/[ \t]/\%s/g")
}

# VPN setting
adb shell su 0 am start -W -a android.settings.VPN_SETTINGS
tap 672 56
text "Mobile Proxy VPN"
# pick type: L2TP/IPSec PSK
tap 77 365
exit
tap 77 429
exit
# input server address
tap 77 449
text $VPN_SERVER
# scroll to IPSec preshared key
swipe 77 449 77 100
tap 77 318
sleep 0.2
text $VPN_SECRET
# show advanced options
tap 77 409
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
