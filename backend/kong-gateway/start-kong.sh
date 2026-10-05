#!/bin/sh
set -eu
umask 077
resty /usr/local/kong/render-config.lua
exec /docker-entrypoint.sh kong docker-start
