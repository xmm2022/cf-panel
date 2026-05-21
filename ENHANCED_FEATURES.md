# 🚀 增强版监控功能说明

## 新增功能对比

| 功能 | 基础版 | 增强版 | 说明 |
|------|--------|--------|------|
| CPU监控 | ✅ 使用率 | ✅ 使用率 + 详细信息 | 物理CPU数、核心数、线程数 |
| 内存监控 | ✅ 总量/已用 | ✅ 总量/已用 | 相同 |
| 磁盘监控 | ✅ 空间占用 | ✅ 空间占用 + 运行时间 | 新增硬盘使用时长 |
| 网络监控 | ✅ 连接数 | ✅ 连接数 + 实时速度 + 多点检测 | 新增实时速率和多地延迟 |
| 系统信息 | ✅ 基础信息 | ✅ 完整信息 + 虚拟化检测 | 新增虚拟化类型识别 |
| Web服务 | ❌ | ✅ 服务版本检测 | 检测Nginx/Apache/PHP/MySQL |
| TCP优化 | ❌ | ✅ 拥塞控制算法 | 显示BBR等算法 |
| IO统计 | ❌ | ✅ 读写统计 | 磁盘IO性能 |

---

## 详细功能介绍

### 1. 网络多点延迟检测

**功能描述**：并行检测多个运营商节点的网络延迟

**检测节点**：
- 北京：电信/联通/移动
- 上海：电信/联通/移动
- 广州：电信/联通/移动

**返回数据示例**：
```json
{
  "network": {
    "multi_point_check": [
      {"location": "bjdx", "latency": 25},
      {"location": "bjlt", "latency": 28},
      {"location": "bjyd", "latency": 30},
      {"location": "shdx", "latency": 15},
      {"location": "shlt", "latency": 18},
      {"location": "shyd", "latency": 20}
    ]
  }
}
```

**应用场景**：
- 判断服务器网络质量
- 识别跨地域访问延迟
- 优化CDN节点选择

---

### 2. 实时网络速度

**功能描述**：通过 `/proc/net/dev` 计算实时网络速率

**返回数据示例**：
```json
{
  "network": {
    "speed": {
      "interface": "eth0",
      "rx_total": 1234567890,
      "tx_total": 987654321,
      "rx_speed": 1048576,
      "tx_speed": 524288
    }
  }
}
```

**单位说明**：
- `rx_total/tx_total`: 总字节数（累计）
- `rx_speed/tx_speed`: 每秒字节数（实时）

**应用场景**：
- 流量异常监控
- 带宽利用率分析
- DDoS攻击检测

---

### 3. Web服务版本检测

**功能描述**：自动识别常见Web服务及版本

**支持的服务**：
- Nginx
- Apache (httpd)
- PHP
- MySQL/MariaDB

**返回数据示例**：
```json
{
  "web_services": [
    {"name": "nginx", "version": "1.24.0"},
    {"name": "php", "version": "8.2.10"},
    {"name": "mysql", "version": "8.0.35"}
  ]
}
```

**应用场景**：
- 版本漏洞检测
- 服务清单管理
- 升级计划制定

---

### 4. 虚拟化平台识别

**功能描述**：自动识别服务器运行环境

**支持识别**：
- 物理机 (physical)
- KVM
- VMware
- VirtualBox
- Hyper-V
- Xen
- OpenVZ
- LXC
- Docker

**返回数据示例**：
```json
{
  "virtualization": "KVM"
}
```

**应用场景**：
- 环境分类管理
- 性能优化策略
- 成本核算

---

### 5. CPU详细信息

**功能描述**：提供完整的CPU架构信息

**返回数据示例**：
```json
{
  "cpu": {
    "details": {
      "model": "Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz",
      "physical_cpus": 2,
      "cores_per_cpu": 14,
      "threads_per_cpu": 28,
      "total_cores": 28,
      "total_threads": 56
    }
  }
}
```

**应用场景**：
- 性能基准测试
- 许可证合规
- 负载分配优化

---

### 6. 磁盘运行时间

**功能描述**：通过 smartctl 获取硬盘使用时长（需要安装 smartmontools）

**返回数据示例**：
```json
{
  "disk": {
    "uptime_hours": 12345
  }
}
```

**说明**：
- 缓存1小时，避免频繁查询
- 需要 root 权限
- 未安装 smartctl 时返回 0

**应用场景**：
- 硬盘健康评估
- 更换计划制定
- 质保期管理

---

### 7. TCP拥塞控制算法

**功能描述**：显示当前使用的TCP拥塞控制算法

**常见值**：
- `bbr`: Google BBR（推荐）
- `cubic`: 默认算法
- `reno`: 经典算法

**返回数据示例**：
```json
{
  "network": {
    "tcp_congestion": "bbr"
  }
}
```

**应用场景**：
- 网络性能优化
- 视频直播场景
- 高延迟网络优化

---

### 8. IO读写统计

**功能描述**：通过 vmstat 统计磁盘IO

**返回数据示例**：
```json
{
  "io": {
    "read": 245,
    "write": 138
  }
}
```

**单位**：块/秒（blocks per second）

**应用场景**：
- 磁盘瓶颈识别
- 数据库性能优化
- 存储方案选型

---

## 使用建议

### 场景1：基础监控（推荐新手）
使用 **基础版** `server-health-monitor.sh`
- 部署简单
- 资源占用低
- 满足日常监控需求

### 场景2：专业监控（推荐运维）
使用 **增强版** `server-health-monitor-enhanced.sh`
- 信息更全面
- 支持高级诊断
- 适合生产环境

### 场景3：混合部署
- 重要服务器：增强版
- 普通服务器：基础版

---

## 性能对比

| 指标 | 基础版 | 增强版 |
|------|--------|--------|
| 响应时间 | ~50ms | ~200ms |
| CPU占用 | ~1% | ~3% |
| 内存占用 | ~10MB | ~20MB |
| 并发支持 | 100+/s | 50+/s |

**结论**：增强版提供更多信息，但响应略慢。根据实际需求选择。

---

## 安装方法

### 安装增强版

```bash
# 下载脚本
wget https://your-domain.com/server-health-monitor-enhanced.sh
chmod +x server-health-monitor-enhanced.sh

# 安装依赖（可选）
# smartmontools: 硬盘健康检测
sudo apt-get install -y smartmontools  # Debian/Ubuntu
sudo yum install -y smartmontools      # CentOS/RHEL

# 运行
sudo ./server-health-monitor-enhanced.sh
```

### 设置为系统服务

```bash
# 移动到系统目录
sudo mv server-health-monitor-enhanced.sh /usr/local/bin/

# 创建systemd服务
sudo tee /etc/systemd/system/server-health-monitor.service > /dev/null <<EOF
[Unit]
Description=Server Health Monitor Enhanced
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/server-health-monitor-enhanced.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl start server-health-monitor
sudo systemctl enable server-health-monitor
```

---

## 监控数据应用示例

### 示例1：检测网络质量下降

**触发条件**：
- 多点检测中超过3个节点延迟 > 100ms

**自动开盾动作**：
- 启用 Under Attack Mode
- 持续时间：30分钟

### 示例2：检测IO瓶颈

**触发条件**：
- IO写入 > 5000 blocks/s
- CPU使用率 > 80%

**告警动作**：
- 发送通知
- 记录日志

### 示例3：服务版本监控

**应用**：
- 定期检查Web服务版本
- 对比CVE漏洞库
- 自动生成升级报告

---

## 常见问题

### Q1: 增强版无法获取网络多点检测数据？
**A**: 检查防火墙是否允许ICMP（ping）出站

### Q2: 磁盘运行时间显示为0？
**A**: 需要安装 `smartmontools` 并确保磁盘支持SMART

### Q3: Web服务检测不到？
**A**: 确保服务安装在标准路径（`/usr/bin/`）

### Q4: 响应时间过长？
**A**: 网络多点检测需要时间，可以减少检测节点数量

---

## 技术支持

如有问题，请参考：
- 基础版文档：`SERVER_MONITOR_SETUP.md`
- 快速开始：`QUICK_START.md`
- 日志查看：`sudo journalctl -u server-health-monitor -f`

---

## 更新日志

### v2.0 (2025-11-01) - 增强版
- ✅ 新增网络多点延迟检测
- ✅ 新增实时网络速度监控
- ✅ 新增Web服务版本检测
- ✅ 新增虚拟化平台识别
- ✅ 新增CPU详细信息
- ✅ 新增磁盘运行时间统计
- ✅ 新增TCP拥塞控制算法
- ✅ 新增IO读写统计
- ✅ 优化并行检测性能

### v1.0 (2025-11-01) - 基础版
- ✅ 初始版本发布
- ✅ CPU/内存/磁盘/网络基础监控
