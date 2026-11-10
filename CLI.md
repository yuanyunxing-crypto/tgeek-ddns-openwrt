# TGEEK DDNS for OpenWrt

通过 OpenWrt 接口事件更新阿里云 DNS 或腾讯云 DNSPod。两家可以独立配置。每家支持一组托管域名和主机记录，可选 A、AAAA 或两者，每种记录可以指定不同逻辑接口。

开机时，所选接口上线并取得公网地址后会检查云端记录。后续由接口事件触发，延迟 5 秒重新取址。已确认的地址相同就跳过。程序没有定时轮询。

## 1. 发布到 GitHub

新建仓库，将本项目的 `README.md`、`install.sh` 和 `tgeek-ddns` 放在仓库根目录。凭据在路由器上配置，发布仓库时只提交源码。可从仓库的 **Code → Download ZIP** 下载源码，也可创建 Release 并附上 tar.gz 压缩包。

以下命令里的 `OWNER`、`REPO`、`main` 按实际 GitHub 地址替换。生产使用时可在 GitHub 下载指定版本标签的源码包。

## 2. 安装

适用于使用 netifd、ubus 和 hotplug 的 OpenWrt。本示例按 OpenWrt 24.10 的 opkg 环境编写。需要 Python 3、CA 证书和可正常校时、访问云 API 的网络。

```sh
opkg update
opkg install python3 ca-bundle
```

**推荐方式**：在电脑浏览器下载 GitHub 的分支源码 ZIP 或 Release 压缩包，在电脑解压，然后将整个源码目录通过 SCP 或 SFTP 上传到 OpenWrt 的 `/tmp`。进入包含安装脚本的目录：

```sh
cd /tmp/REPO-main
sh install.sh
```

如果路由器能访问 GitHub，也可直接下载公开仓库的源码：

```sh
cd /tmp
wget -O tgeek-ddns-source.tar.gz 'https://github.com/OWNER/REPO/archive/refs/heads/main.tar.gz' &&
    tar -xzf tgeek-ddns-source.tar.gz &&
    cd REPO-main &&
    sh install.sh
```

安装完成后，`tgeek-ddns --help` 可检查命令是否可用。此时接口事件更新尚未开启。

## 3. 在云端准备记录和凭据

在实际托管域名的云平台中准备已启用的 A 或 AAAA 记录。程序按已有记录 ID 更新，保留 TTL 和解析线路。A 和 AAAA 各有自己的 ID。同一主机名若配置了多条线路，选择你要更新的那一条。

| 平台 | 凭据 | 查询记录 ID | 程序所需 API |
|---|---|---|---|
| 阿里云 DNS | AccessKey ID、AccessKey Secret | 控制台或 API Explorer 的 `DescribeDomainRecords` | `DescribeDomainRecordInfo`、`UpdateDomainRecord` |
| 腾讯云 DNSPod | 腾讯云 CAM SecretId、SecretKey | 控制台或 API Explorer 的 `DescribeRecordList` | `DescribeRecord`、`ModifyRecord` |

建议为 DDNS 单独创建凭据并按需授权。程序在 SSH 终端隐藏输入，配置文件位于 `/etc/tgeek-ddns/`，仅 root 可读。请勿将该目录提交到 GitHub。

## 4. 配置域名、类型和接口

按需配置一家或两家：

```sh
tgeek-ddns configure aliyun
tgeek-ddns configure tencent
```

例如要更新 `oa.example.com`：

| 提示 | 填写示例 |
|---|---|
| 云控制台托管域名 | `example.com` |
| 主机记录 | `oa`，根域名填 `@` |
| 记录类型 | `1` 只更新 A，`2` 只更新 AAAA，`3` 同时更新 |
| A 地址来源 | `wan`、`wan2` 或 `auto` |
| AAAA 地址来源 | `wan6` 或实际持有公网 IPv6 的逻辑接口 |
| 已有 DNS 记录 ID | 填入对应 A 或 AAAA 的 ID |
| API 凭据 | 按提示输入两项凭据 |

接口名以 LuCI「网络 → 接口」显示的逻辑名称为准。PPPoE 的 `pppoe-wan` 是设备名。指定 `wan2` 时，A 记录只取 `wan2` 的公网 IPv4。`auto` 对 A 优先尝试 `wan`，对 AAAA 优先尝试 `wan6`，再检查 `wan2`、`wan_6` 等符合命名规则的已上线接口。端口映射固定在某条线路时，请选择那条线路。

AAAA 取路由器所选接口自身的公网 IPv6。如果域名直接指向群晖，群晖的 AAAA 继续交给原 NAS 更新程序。

## 5. 只读检查与切换

```sh
tgeek-ddns check
```

检查结果应列出配置对应的接口、本机地址和云端地址。当前两者不同可以继续，首次同步会更新云端。如果提示权限、地址或记录 ID 有误，先修正后再切换。

在 TIJIWrt 上，先确认以下旧入口是否管理同一条记录：

- 阿里云的 `/etc/hotplug.d/iface/81-aliddns-event`。
- 腾讯云的旧服务，以及它可能生成的事件脚本。还要检查 `/etc/hotplug.d/iface/80-tencentddns.bak`。
- `/etc/hotplug.d/iface/95-nas-ddns` 通知的群晖任务。若它负责不同记录，例如群晖自己的 AAAA，可以继续运行。
- `/etc/crontabs/root` 中对应的周期任务。

将需要停用的旧 hotplug 文件备份到 hotplug 目录外，并确认旧启动服务不会重新生成它们。安装脚本不会自动迁移这些入口。切换时保留原文件，以便回滚。

```sh
tgeek-ddns enable
tgeek-ddns sync
tgeek-ddns check
logread -e tgeek-ddns
```

`enable` 安装持久化事件入口。`sync` 立即检查并按需写入，无需重拨。最后再跑 `check` 确认云端记录已是目标地址。之后可在正常开机或维护时段重拨后查日志，确认接口事件确实触发。后续收到同一地址的重复事件时，程序会静默跳过。

## 6. 排查

| 现象 | 检查方法 |
|---|---|
| 无可用公网地址 | 检查所选逻辑接口是否上线。CGNAT、私网和 IPv6 链路本地地址会被跳过。 |
| 一个接口有多个公网地址 | 程序会跳过同一地址族存在多个公网地址的接口。检查地址分配并选择能唯一确定地址的接口。 |
| API 拒绝或签名失败 | 检查路由器校时、平台凭据类型、权限和记录 ID，然后重试 `check`。 |
| HTTPS 超时或证书错误 | 检查系统时间、CA 包，以及路由器能否正常解析并访问 `alidns.aliyuncs.com` 和 `dnspod.tencentcloudapi.com`。在 Nikki/MosDNS 环境下，检查这两个域名的解析和路由是否符合预期。 |
| 云记录正确但查询仍是旧地址 | 对比云端记录和客户端查询结果，并检查查询使用的解析线路、TTL 和缓存。 |
| 手动同步正常，开机没更新 | 检查 `/etc/hotplug.d/iface/90-tgeek-ddns` 是否存在，核对接口名并查看 `logread -e tgeek-ddns`。 |
| 记录反复变动 | 检查旧 OpenWrt 插件、cron 和群晖任务是否也在写同一个记录 ID。 |

更新失败不会记为成功。修复后可运行 `tgeek-ddns sync` 立即重试。

## 7. 修改配置、升级与回滚

**修改配置**：执行 `tgeek-ddns disable`，重新执行对应平台的 `configure`，用 `check` 核对后再运行 `enable` 和 `sync`。

**升级**：先停用事件入口，并备份 `/usr/sbin/tgeek-ddns` 和 `/etc/tgeek-ddns/`。上传新版本源码，重新运行 `sh install.sh`，完成 `check` 后再启用。备份包含凭据，请存放在 root 专用位置。

**回滚到旧任务**：执行 `tgeek-ddns disable`，恢复原有触发文件和服务。停用只取消事件更新，云端保留当前值。如果需要恢复原云端值，可由旧任务重新同步，或在云控制台手动恢复。

**移除程序**：停用后可删除 `/usr/sbin/tgeek-ddns`。确认无需保留凭据后，再删除 `/etc/tgeek-ddns/` 中的配置文件。

## 验证范围

已离线检查接口选择、CGNAT 跳过及记录 ID 匹配逻辑。请在实际路由器上先用 `check` 验证两家的云 API，再验证开机事件。
