#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || { echo '请以 root 安装'; exit 1; }
command -v ubus >/dev/null
command -v python3 >/dev/null || { echo '请先安装 python3-light 和 python3-openssl（或完整 python3）'; exit 1; }
cd "$(dirname "$0")"
python3 -c 'import fcntl, ssl, urllib.request, getpass, syslog, uuid, ipaddress, hmac; compile(open("tgeek-ddns","rb").read(),"tgeek-ddns","exec")'
tmp="$(mktemp /usr/sbin/.tgeek-ddns.XXXXXX)"
trap 'rm -f "$tmp"' EXIT
cp tgeek-ddns "$tmp"
chmod 755 "$tmp"
mv -f "$tmp" /usr/sbin/tgeek-ddns
echo '已安装。运行 tgeek-ddns configure aliyun 或 tgeek-ddns configure tencent。'
