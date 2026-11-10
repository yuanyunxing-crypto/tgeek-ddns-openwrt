#!/bin/sh
set -eu
[ "$(id -u)" = 0 ] || { echo '请以 root 安装'; exit 1; }
command -v ubus >/dev/null
[ -x /etc/init.d/rpcd ] && [ -d /www/luci-static/resources ] ||
    { echo '请先安装并启动 LuCI'; exit 1; }
cd "$(dirname "$0")"
python3 -c 'import fcntl, ssl, urllib.request, getpass, syslog, uuid, ipaddress, hmac; compile(open("tgeek-ddns","rb").read(),"tgeek-ddns","exec")'
put() {
    mkdir -p "$(dirname "$2")"
    tmp="$(mktemp "$(dirname "$2")/.tgeek-install.XXXXXX")"
    cp "$1" "$tmp" && chmod "$3" "$tmp" && mv -f "$tmp" "$2" ||
        { rm -f "$tmp"; return 1; }
}
put tgeek-ddns /usr/sbin/tgeek-ddns 755
for path in usr/share/rpcd/acl.d/luci-app-tgeekddns.json usr/share/luci/menu.d/luci-app-tgeekddns.json www/luci-static/resources/view/tgeekddns.js; do
    put "root/$path" "/$path" 644
done
put root/usr/libexec/rpcd/tgeekddns /usr/libexec/rpcd/tgeekddns 755
rm -f /tmp/luci-indexcache
/etc/init.d/rpcd restart
echo '已安装。重新登录 LuCI，打开 服务 → TGEEK DDNS。'
