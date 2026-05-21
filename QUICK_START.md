# 🚀 服务器监控快速开始指南

## 1️⃣ 服务器端部署（3分钟）

### Ubuntu/Debian 系统

```bash
# 下载并安装监控脚本
sudo wget -O /usr/local/bin/server-health-monitor.sh https://raw.githubusercontent.com/your-repo/server-health-monitor.sh
sudo chmod +x /usr/local/bin/server-health-monitor.sh

# 临时运行测试
sudo /usr/local/bin/server-health-monitor.sh
```

### 设置为系统服务（开机自启）

```bash
# 创建 systemd 服务
sudo tee /etc/systemd/system/server-health-monitor.service > /dev/null <<EOF
[Unit]
Description=Server Health Monitor Service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/server-health-monitor.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启动并启用服务
sudo systemctl daemon-reload
sudo systemctl start server-health-monitor
sudo systemctl enable server-health-monitor

# 查看状态
sudo systemctl status server-health-monitor
```

### 测试监控端点

```bash
# 本地测试
curl http://localhost:8888/health | jq

# 远程测试（替换 YOUR_SERVER_IP）
curl http://YOUR_SERVER_IP:8888/health | jq
```

成功输出示例：
```json
{
  "status": "ok",
  "timestamp": 1730449856000,
  "hostname": "web-server-01",
  "uptime": "up 5 days",
  "cpu": {
    "usage": 23.45,
    "load": {
      "1min": 0.52,
      "5min": 0.48,
      "15min": 0.51
    }
  },
  "memory": {
    "total": 8192,
    "used": 3456,
    "free": 4736,
    "percent": 42.19
  },
  "disk": {
    "total": "50G",
    "used": "23G",
    "free": "25G",
    "percent": 46
  },
  "network": {
    "connections": {
      "tcp": 87,
      "total": 142
    }
  },
  "processes": 156
}
```

---

## 2️⃣ Cloudflare Worker 配置

### 复制 Worker 代码

1. 打开 Cloudflare Dashboard
2. 进入 **Workers & Pages**
3. 找到你的 Worker：`spider-backend`
4. 点击 **Quick Edit**
5. 删除旧代码，粘贴 `cloudflare-worker-complete.js` 的完整内容
6. 点击 **Save and Deploy**

### 配置定时任务

1. 在 Worker 页面，进入 **Settings** → **Triggers**
2. 找到 **Cron Triggers** 部分
3. 点击 **Add Cron Trigger**
4. 输入：`*/5 * * * *`（每5分钟执行一次）
5. 点击 **Save**

---

## 3️⃣ 前端使用

### 添加监控服务器

1. 登录系统
2. 点击侧边栏 **"服务器监控"**
3. 点击 **"添加服务器"**
4. 填写信息：
   - **名称**：生产服务器
   - **URL**：`http://YOUR_SERVER_IP:8888/health`
   - **间隔**：5 分钟
5. 点击 **"确认添加"**
6. 点击 **检查按钮** 测试连接

### 配置自动开盾

1. 点击 **"添加规则"**
2. 配置触发条件：

**示例1：响应时间监控**
- 触发条件：响应时间
- 阈值：3000（毫秒）
- 动作：5秒盾
- 持续时间：30分钟

**示例2：CPU监控**
- 触发条件：CPU使用率
- 阈值：80（百分比）
- 动作：高安全级别
- 持续时间：60分钟

**示例3：内存监控**
- 触发条件：内存使用率
- 阈值：85（百分比）
- 动作：5秒盾
- 持续时间：30分钟

3. 填写 Cloudflare 信息：
   - **Zone ID**：在 Cloudflare Dashboard → 域名 → 右侧栏查看
   - **域名**：要保护的域名（如 example.com）

4. 点击 **"确认添加"**

---

## 4️⃣ 防火墙配置（可选）

### 仅允许 Worker 访问监控端口

```bash
# 允许来自 Cloudflare Worker 的访问
sudo ufw allow from <WORKER_IP> to any port 8888

# 或者允许所有 Cloudflare IP（推荐）
# 下载 Cloudflare IP 列表
curl https://www.cloudflare.com/ips-v4 -o /tmp/cf-ips.txt

# 添加规则
while read ip; do
  sudo ufw allow from $ip to any port 8888
done < /tmp/cf-ips.txt
```

---

## 5️⃣ 验证部署

### 检查服务器端

```bash
# 查看服务状态
sudo systemctl status server-health-monitor

# 查看实时日志
sudo journalctl -u server-health-monitor -f

# 手动测试
curl http://localhost:8888/health
```

### 检查 Worker 端

1. 在前端点击 **检查按钮**
2. 查看响应时间和状态
3. 查看 Worker 日志：
   - Cloudflare Dashboard → Workers → Logs

### 检查自动开盾

1. 在前端查看 **操作历史**
2. 手动触发条件测试（如运行 CPU 压力测试）
3. 观察是否自动启用 Cloudflare 防护

---

## 📊 监控指标说明

| 指标 | 单位 | 建议阈值 | 说明 |
|------|------|---------|------|
| 响应时间 | 毫秒(ms) | 3000 | 超过3秒影响用户体验 |
| CPU使用率 | 百分比(%) | 80 | 持续高于80%影响性能 |
| 内存使用率 | 百分比(%) | 85 | 预留15%缓冲空间 |
| 磁盘使用率 | 百分比(%) | 90 | 避免磁盘满 |
| TCP连接数 | 数量 | 1000-5000 | 根据服务器配置 |

---

## 🔧 常见问题

### Q: 端口 8888 被占用？
```bash
sudo lsof -i :8888
sudo kill -9 <PID>
```

### Q: 服务无法启动？
```bash
sudo journalctl -u server-health-monitor -xe
```

### Q: 监控数据不准确？
```bash
# 手动测试脚本
sudo bash -x /usr/local/bin/server-health-monitor.sh
```

### Q: Worker 无法访问服务器？
- 检查防火墙设置
- 确认服务器 IP 正确
- 测试网络连通性：`curl -v http://SERVER_IP:8888/health`

---

## 📞 技术支持

- Worker 日志：Cloudflare Dashboard → Workers → Logs
- 服务器日志：`sudo journalctl -u server-health-monitor -f`
- 前端日志：浏览器 F12 → Console

---

## 🎉 完成！

现在你的服务器监控系统已经完全配置好了！

系统会：
- ✅ 每5分钟自动检查服务器状态
- ✅ 记录 CPU、内存、磁盘、网络等指标
- ✅ 当指标超过阈值时自动启用 Cloudflare 防护
- ✅ 记录所有操作历史
