#!/bin/bash
#
# yarn global add --ignore-engines api-spec-converter


api-spec-converter -f api_blueprint -t swagger_2 --syntax=yaml ./fpm.blueprint > swagger2.yaml
api-spec-converter -f swagger_2 -t swagger_3 --syntax=yaml ./fpm.blueprint > swagger3.yaml

