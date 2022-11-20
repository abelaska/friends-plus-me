#!/bin/bash
#
adb install -r -g ./kju-mobile-beacon-v*.apk
adb shell am startservice io.kju.android.beacon/.KjuBeaconService
adb shell am broadcast -a kju.beacon.start