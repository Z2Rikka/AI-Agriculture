# 安全部署建议

## 1. API Key 存储与传输

**问题**：当前 `User.apiKey` 以明文存储在 PostgreSQL 中。

**上线必须做：**
- 对 `apiKey` 字段做 **SHA-256 哈希**存储（而不是存原始 Key），验证时比对哈希值
  - 原因：即使数据库被拖库，攻击者也拿不到可用的 Key
  - 用户创建时：`apiKeyHash = sha256(originalKey)`，返回原始 Key 给用户（仅此时可见）
  - 验证时：`sha256(inputKey) === storedHash`
- HTTPS 强制：生产环境后端必须跑在 HTTPS/TLS 后面，禁止明文 HTTP
- 请求日志脱敏：日志里禁止打印 `Authorization: Bearer <key>` 的完整内容，最多打印前8位

**改进示例：**
```typescript
// users.service.ts — 创建时
const apiKey = crypto.randomBytes(32).toString('hex');
const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

// 验证时（ApiKeyGuard）
const apiKeyHash = crypto.createHash('sha256').update(inputKey).digest('hex');
const user = await prisma.user.findFirst({ where: { apiKeyHash, isActive: true } });
```

---

## 2. MQTT 内部通信安全

**问题**：MQTT 默认不开启认证，且 `irrigation/{device_id}/command` 主题如果被恶意订阅/发布，设备可能被劫持。

**上线必须做：**
- **MQTT Broker 启用认证**：EMQX/Mosquitto 都支持用户名+密码认证
  ```yaml
  # EMQX etc/auth.conf 示例
  allow_anonymous false
  client_id_prefix "esp32_"
  password_file /opt/emqx/etc/pwfile
  ```
- **ACL（访问控制列表）**：限制每个设备的Topic权限
  - ESP32 设备只能发布到 `irrigation/{device_id}/state`
  - ESP32 设备只能订阅 `irrigation/{device_id}/command`
  - NestJS 后端可以发布/订阅所有主题
  - 禁止设备跨租户访问他人设备的主题（`irrigation/ESP32_002/command` 只有 owner 能发布）
- **TLS 传输**：生产环境 MQTT Broker 建议启用 TLS（mqtts:// 端口 8883），防止指令被中间人篡改

**EMQX ACL 配置示例：**
```
topic irrigation/${client_id}/command   # 设备只能订阅自己的 command
topic irrigation/+/state                # 后端可以订阅所有 state
publish irrigation/${client_id}/command # 只有后端可以发布 command
```

---

## 3. 额外建议

**Rate Limiting**：AI Agent 场景下要对 `/api/v1/irrigation/control` 做限速，防止失控 Agent 频繁触发阀门
- 推荐：NestJS `@nestjs/throttler`，每分钟最多 20 次/每 API Key

**设备固件 OTA 安全**：`deviceSecret` 字段可用于 ESP32 固件签名验证，确保只有合法固件能连接 Broker

**审计日志保留**：IrrigationLog 建议保留至少 90 天，用于追诉和故障排查
