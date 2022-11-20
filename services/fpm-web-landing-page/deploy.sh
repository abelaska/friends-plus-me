#!/bin/bash
#
APP="fpm-application"
VERSION=`date +%Y%m%dt%H%M%S`
APPCFG="appcfg.py -v --skip_sdk_update_check"
#
$APPCFG update -A $APP -V $VERSION -E "VERSION:$VERSION" .
$APPCFG set_default_version -A $APP -V $VERSION -E "VERSION:$VERSION" .
