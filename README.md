# luci-app-tgeekddns v0.2.2

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

在电脑解压 ZIP，把整个 `luci-app-tgeekddns-0.2.2` 目录上传到路由器 `/tmp`。也可上传 ZIP 后用路由器上的 unzip 解压。然后执行：

```sh
cd /tmp/luci-app-tgeekddns-0.2.2
sh install.sh
```

安装会重启 rpcd。重新登录 LuCI，进入 **服务 → TGEEK DDNS**。输入凭据时请使用 HTTPS 或受信任的管理网络。

## 第一次配置

1. 在云端准备已启用的 A、AAAA 或两种记录。记录 ID 默认留空，程序会自动查找。
2. 填写托管域名和主机记录。例如 `oa.example.com` 填 `example.com` 和 `oa`，根域名填 `@`。
3. 阿里云填写 AccessKey ID 和 AccessKey Secret。腾讯云填写 CAM SecretId 和 SecretKey。以后编辑，两项一起留空会保留已有凭据。
4. 勾选需要更新的记录类型，分别选接口。只有同名、同类型存在多条记录时才需要填 ID。固定公网线路可选 `wan` 或 `wan2`。AAAA 取接口自身的公网 IPv6，指向群晖的记录应由群晖的更新任务维护。
5. 点击对应服务商的保存按钮。然后在 SSH 上先运行 `tgeek-ddns check` 检查当前地址与云端记录。
6. 回 LuCI 点 **启用事件更新**。如果希望马上同步，SSH 执行 `tgeek-ddns sync`，随后用 `tgeek-ddns check` 和 `logread -e tgeek-ddns` 验证。

启用后，开机接口上线并获得公网地址会触发检查，后续根据接口事件检查地址是否变化。保存配置不会立即向云端写入。

## 最近日志

LuCI 页面底部显示最近 10 条检查和同步结果，最新在前。重新加载页面可刷新。此列表保存在运行时目录，重启后清空。系统日志仍可用 logread -e tgeek-ddns 查看。

## 自动查找权限

阿里云自动查找需要 DescribeDomainRecords，腾讯云需要 DescribeRecordList。原有单条查询和更新权限仍需要保留。只更新云端已有记录。同名同类型有多条时，检查命令会提示候选 ID，避免更新错解析线路。

## 升级与卸载

从旧版升级可直接运行新包安装脚本。旧配置在 `/etc/tgeek-ddns`，建议升级前备份。页面会读入旧域名、记录和接口。已有手填 ID 可继续使用，清空再保存可切换为自动查找，API 凭据不会返回到浏览器。若还有其他 DDNS 客户端在更新相同记录，切换前先停掉重复的任务。

如需仅移除 LuCI 页面，删除以下四个文件，再重新登录 LuCI：

```sh
rm -f /usr/libexec/rpcd/tgeekddns \
  /usr/share/rpcd/acl.d/luci-app-tgeekddns.json \
  /usr/share/luci/menu.d/luci-app-tgeekddns.json \
  /www/luci-static/resources/view/tgeekddns.js \
  /tmp/luci-indexcache
/etc/init.d/rpcd restart
```

如需停止后台自动更新，执行 `tgeek-ddns disable`。更多命令、接口选择策略和故障排查见 [CLI.md](CLI.md)。
