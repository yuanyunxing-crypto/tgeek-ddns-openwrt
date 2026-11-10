# luci-app-tgeekddns v0.3.1

OpenWrt LuCI 扩展，安装后进入 **服务 → TGEEK DDNS**。支持阿里云和腾讯云 DNSPod。页面可保存域名、主机记录、API 凭据，分别配置 A 和 AAAA 的记录 ID 与逻辑接口，并启停接口事件更新。

## 全新 OpenWrt 安装

以下以 OpenWrt 24.10（opkg）为例。先确认 LuCI 可以登录。若镜像没有 LuCI，通过 SSH 安装：

```sh
opkg update
opkg install luci-ssl
/etc/init.d/uhttpd enable
/etc/init.d/uhttpd start
```

安装运行依赖：

```sh
opkg update
opkg install python3 ca-bundle
```

若系统使用 apk，请用该系统的软件源安装对应的 LuCI、Python 3 和 CA 软件包。此包为源码安装包。

在电脑解压 ZIP，把整个 `luci-app-tgeekddns-0.3.1` 目录上传到路由器 `/tmp`。也可上传 ZIP 后用路由器上的 unzip 解压。然后执行：

```sh
cd /tmp/luci-app-tgeekddns-0.3.1
sh install.sh
```

安装会重启 rpcd。重新登录 LuCI，进入 **服务 → TGEEK DDNS**。输入凭据时请使用 HTTPS 或受信任的管理网络。

## 从 GitHub 直接下载

安装上述依赖后，可通过 SSH 下载并安装：

```sh
(
    set -e
    workdir="$(mktemp -d /tmp/tgeekddns.XXXXXX)"
    trap 'rm -rf "$workdir"' EXIT
    cd "$workdir"
    host=github.com
    repo=yuanyunxing-crypto/tgeek-ddns-openwrt
    wget -T 30 -O source.tar.gz "https://gh-proxy.com/https://github.com/yuanyunxing-crypto/tgeek-ddns-openwrt/archive/refs/tags/v0.3.1.tar.gz"
    tar -xzf source.tar.gz
    cd tgeek-ddns-openwrt-0.3.1
    sh install.sh
)
```

## 第一次配置

1. 在阿里云 DNS 或腾讯云 DNSPod 控制台创建并启用所需的记录。云端先选好默认、联通、电信等解析线路。
2. 在 LuCI 中填写对应服务商的一套 API 凭据，然后点击 **添加解析任务**。每条任务分别填写托管域名、主机记录、A 或 AAAA、云端解析线路和 OpenWrt 逻辑接口。
3. 记录 ID 留空自动查找。相同域名和类型的多条任务要选择不同解析线路。如果同一线路还有多条同名同类型记录，按检查日志提示填写 ID。
4. 点击对应服务商的保存按钮，在 SSH 执行 `tgeek-ddns check` 核对每条任务的接口地址与云端记录。确认后启用事件更新。需要立即同步时执行 `tgeek-ddns sync`。

例如同一个 `oa.example.com` 可以创建三条 A 任务，托管域名都填 `example.com`，主机记录都填 `oa`。

| 云端解析线路 | OpenWrt 接口示例 |
|---|---|
| 联通 | `wan` |
| 电信 | `wan2` |
| 默认 | `wan` |

按实际接线选择接口。绑定明确接口后，接口事件只检查绑定该接口的任务。自动选择任务仍可能随候选 WAN 变化。默认解析线路用于未匹配运营商的查询。AAAA 读取所选接口自身的公网 IPv6。

启用后，开机接口上线并获得公网地址会触发检查，后续根据接口事件检查地址是否变化。保存配置不会立即向云端写入。

## 最近日志

LuCI 页面底部显示最近 10 条检查和同步结果，最新在前。重新加载页面可刷新。此列表保存在运行时目录，重启后清空。系统日志仍可用 logread -e tgeek-ddns 查看。

## 自动查找权限

阿里云自动查找需要 DescribeDomainRecords，腾讯云需要 DescribeRecordList。原有单条查询和更新权限仍需要保留。只更新云端已有记录。同名同类型有多条时，检查命令会提示候选 ID，避免更新错解析线路。

## 升级与卸载

从旧版升级可直接运行新包安装脚本。旧配置在 `/etc/tgeek-ddns`，建议升级前备份。页面会读入旧域名、记录和接口。旧 A／AAAA 各自迁移为一条“任意”线路任务，已有 ID 和接口会保留。要给同域名同类型添加多条任务，先把原任务的“任意”改成它实际对应的云端线路，API 凭据不会返回到浏览器。若还有其他 DDNS 客户端在更新相同记录，切换前先停掉重复的任务。

如需仅移除 LuCI 页面，删除以下四个文件，再重新登录 LuCI：

```sh
rm -f /usr/libexec/rpcd/tgeekddns \
  /usr/share/rpcd/acl.d/luci-app-tgeekddns.json \
  /usr/share/luci/menu.d/luci-app-tgeekddns.json \
  /www/luci-static/resources/view/tgeekddns.js \
  /tmp/luci-indexcache
/etc/init.d/rpcd restart
```

如需停止后台自动更新，执行 `tgeek-ddns disable`。多任务请通过 LuCI 管理。历史命令与故障排查见 [CLI.md](CLI.md)。
