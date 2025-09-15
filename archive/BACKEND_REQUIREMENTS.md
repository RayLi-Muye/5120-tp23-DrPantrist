# UseItUp PWA - 后端需求规范

## 1. 核心业务功能

### 1.1 用户认证与管理
```typescript
// 用户注册
POST /api/auth/register
{
  "inventoryName": "我的厨房"
}
→ {
  "user": {
    "id": "uuid",
    "inventoryName": "我的厨房", 
    "loginCode": "123456",
    "createdAt": "2024-08-30T12:00:00Z"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}

// 用户登录
POST /api/auth/login
{
  "loginCode": "123456"
}
→ {
  "user": {...},
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}

// Token刷新
POST /api/auth/refresh
{
  "refreshToken": "refresh_token"
}
→ {
  "accessToken": "new_jwt_token"
}

// 用户信息更新
PUT /api/users/me
{
  "inventoryName": "新的库存名称"
}
```

**后端职责：**
- 生成唯一的6位数登录码（确保不重复）
- JWT token生成和验证
- 用户会话管理
- 登录码有效性验证
- 用户数据持久化

### 1.2 库存管理系统
```typescript
// 获取用户库存
GET /api/inventory
→ {
  "items": [
    {
      "id": "uuid",
      "userId": "user_uuid",
      "itemId": "grocery_item_id",
      "name": "苹果",
      "category": "水果",
      "quantity": 5,
      "unit": "个",
      "expiryDate": "2024-09-15",
      "addedDate": "2024-08-30",
      "status": "active",
      "notes": "有机苹果",
      "createdAt": "2024-08-30T12:00:00Z",
      "updatedAt": "2024-08-30T12:00:00Z"
    }
  ],
  "totalCount": 25,
  "categories": ["水果", "蔬菜", "肉类"]
}

// 添加库存物品
POST /api/inventory
{
  "itemId": "grocery_item_id",
  "quantity": 3,
  "customExpiryDate": "2024-09-20",
  "notes": "超市特价"
}

// 标记物品已使用
PUT /api/inventory/{itemId}/use
→ {
  "impact": {
    "itemName": "苹果",
    "moneySaved": 12.50,
    "co2Avoided": 0.8,
    "actionType": "used",
    "timestamp": "2024-08-30T12:00:00Z"
  }
}

// 删除库存物品
DELETE /api/inventory/{itemId}
```

**后端职责：**
- 库存数据CRUD操作
- 过期日期计算和提醒
- 库存状态管理（active/used/expired）
- 数据验证和完整性检查
- 批量操作支持

### 1.3 环保影响计算
```typescript
// 获取总体影响统计
GET /api/impact/total
→ {
  "totalMoneySaved": 156.80,
  "totalCo2Avoided": 12.5,
  "itemsUsed": 45,
  "period": "all_time",
  "lastUpdated": "2024-08-30T12:00:00Z"
}

// 获取影响历史记录
GET /api/impact/history?period=month&year=2024&month=8
→ {
  "records": [
    {
      "date": "2024-08-30",
      "moneySaved": 8.50,
      "co2Avoided": 0.6,
      "itemsUsed": 3
    }
  ],
  "summary": {
    "totalMoneySaved": 156.80,
    "totalCo2Avoided": 12.5,
    "averagePerDay": 5.2
  }
}

// 获取影响详细分析
GET /api/impact/analysis
→ {
  "byCategory": {
    "水果": { "moneySaved": 45.20, "co2Avoided": 3.2 },
    "蔬菜": { "moneySaved": 38.60, "co2Avoided": 4.1 }
  },
  "trends": {
    "monthlyGrowth": 15.5,
    "co2Trend": "improving"
  },
  "achievements": [
    {
      "type": "milestone",
      "title": "节省100元",
      "unlockedAt": "2024-08-25T10:00:00Z"
    }
  ]
}
```

**后端职责：**
- 环保影响数据计算（金钱、CO₂）
- 影响数据聚合和统计
- 趋势分析算法
- 成就系统逻辑
- 数据可视化支持

## 2. 数据管理功能

### 2.1 食品数据库管理
```typescript
// 获取食品主数据
GET /api/groceries
→ {
  "categories": [
    {
      "id": "fruits",
      "name": "水果",
      "items": [
        {
          "id": "apple",
          "name": "苹果",
          "defaultShelfLife": 14,
          "avgPrice": 2.5,
          "co2PerKg": 0.4,
          "unit": "个",
          "imageUrl": "/images/apple.jpg"
        }
      ]
    }
  ]
}

// 搜索食品
GET /api/groceries/search?q=苹果
→ {
  "results": [...],
  "suggestions": ["红苹果", "青苹果"]
}
```

**后端职责：**
- 食品主数据维护
- 营养信息管理
- 价格数据更新
- 搜索和推荐算法
- 图片资源管理

### 2.2 数据同步与备份
```typescript
// 数据同步
POST /api/sync
{
  "lastSyncTime": "2024-08-30T10:00:00Z",
  "changes": [
    {
      "type": "create",
      "entity": "inventory_item",
      "data": {...},
      "timestamp": "2024-08-30T11:00:00Z"
    }
  ]
}
→ {
  "conflicts": [],
  "serverChanges": [...],
  "newSyncTime": "2024-08-30T12:00:00Z"
}

// 数据导出
GET /api/export?format=json&period=month
→ {
  "data": {...},
  "exportedAt": "2024-08-30T12:00:00Z",
  "downloadUrl": "/downloads/export_123.json"
}
```

**后端职责：**
- 多设备数据同步
- 冲突解决策略
- 数据备份和恢复
- 导入导出功能
- 版本控制管理

## 3. 高级功能

### 3.1 智能提醒系统
```typescript
// 获取提醒设置
GET /api/notifications/settings
→ {
  "expiryReminders": {
    "enabled": true,
    "daysBeforeExpiry": [3, 1],
    "timeOfDay": "09:00"
  },
  "wasteAlerts": {
    "enabled": true,
    "threshold": 5
  }
}

// 发送推送通知
POST /api/notifications/send
{
  "userId": "user_uuid",
  "type": "expiry_warning",
  "data": {
    "itemName": "牛奶",
    "expiryDate": "2024-09-01"
  }
}
```

**后端职责：**
- 定时任务调度
- 推送通知服务
- 提醒规则引擎
- 通知历史记录
- 用户偏好管理

### 3.2 数据分析与洞察
```typescript
// 获取使用模式分析
GET /api/analytics/patterns
→ {
  "consumptionPatterns": {
    "mostWastedCategories": ["蔬菜", "水果"],
    "bestPerformingItems": ["苹果", "胡萝卜"],
    "wasteReductionTrend": 25.5
  },
  "recommendations": [
    {
      "type": "purchase_suggestion",
      "message": "建议减少蔬菜采购量",
      "confidence": 0.85
    }
  ]
}

// 获取社区统计
GET /api/analytics/community
→ {
  "globalStats": {
    "totalUsersSaved": 50000,
    "totalCo2Avoided": 1250.5,
    "topSavingUsers": 1000
  },
  "userRanking": {
    "position": 156,
    "percentile": 75
  }
}
```

**后端职责：**
- 用户行为分析
- 机器学习模型
- 个性化推荐
- 社区统计计算
- 预测算法开发

## 4. 技术基础设施

### 4.1 API网关与安全
```typescript
// API限流和安全
- JWT认证中间件
- API速率限制 (100 req/min per user)
- 请求验证和清理
- CORS配置
- 安全头设置
```

**后端职责：**
- API网关配置
- 认证授权中间件
- 请求限流和防护
- 安全漏洞防护
- 日志和监控

### 4.2 数据库设计
```sql
-- 核心表结构
users (id, inventory_name, login_code, created_at, settings)
inventory_items (id, user_id, item_id, quantity, expiry_date, status)
impact_records (id, user_id, item_id, money_saved, co2_avoided, timestamp)
grocery_items (id, name, category, shelf_life, avg_price, co2_factor)
user_sessions (id, user_id, token, expires_at, device_info)
notifications (id, user_id, type, content, sent_at, read_at)
```

**后端职责：**
- 数据库架构设计
- 索引优化策略
- 数据迁移脚本
- 备份恢复方案
- 性能监控调优

### 4.3 实时通信
```typescript
// WebSocket连接
WebSocket /ws/{userId}
- 库存更新推送
- 实时影响统计
- 多设备同步通知
- 系统消息推送
```

**后端职责：**
- WebSocket服务管理
- 实时数据推送
- 连接状态维护
- 消息队列处理
- 负载均衡配置

## 5. 运维与监控

### 5.1 系统监控
```typescript
// 健康检查
GET /api/health
→ {
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0",
  "uptime": 86400
}

// 性能指标
GET /api/metrics
→ {
  "activeUsers": 1250,
  "requestsPerSecond": 45.2,
  "averageResponseTime": 120,
  "errorRate": 0.02
}
```

**后端职责：**
- 应用性能监控
- 错误日志收集
- 系统资源监控
- 告警机制设置
- 性能优化建议

### 5.2 部署与扩展
```yaml
# Docker配置
services:
  api:
    image: useItup-api:latest
    replicas: 3
    resources:
      limits:
        memory: 512M
        cpu: 0.5
  
  database:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
```

**后端职责：**
- 容器化部署
- 自动扩缩容
- 负载均衡配置
- CI/CD流水线
- 环境管理

## 6. 开发优先级

### 第一阶段 (MVP - 4周)
1. ✅ 用户认证系统
2. ✅ 基础库存CRUD
3. ✅ 简单影响计算
4. ✅ 食品主数据API

### 第二阶段 (增强功能 - 6周)
1. 🔄 数据同步机制
2. 🔄 智能提醒系统
3. 🔄 高级统计分析
4. 🔄 性能优化

### 第三阶段 (高级功能 - 8周)
1. ⏳ 机器学习推荐
2. ⏳ 社区功能
3. ⏳ 第三方集成
4. ⏳ 高级分析报告

## 7. 技术栈建议

### 推荐技术选择
- **API框架**: Node.js + Express/Fastify 或 Python + FastAPI
- **数据库**: PostgreSQL (主) + Redis (缓存/会话)
- **认证**: JWT + Refresh Token
- **实时通信**: Socket.io 或 WebSocket
- **队列**: Bull/Agenda (Node.js) 或 Celery (Python)
- **监控**: Prometheus + Grafana
- **部署**: Docker + Kubernetes 或 Railway/Render

### 预估资源需求
- **计算**: 2-4 CPU cores, 4-8GB RAM
- **存储**: 100GB SSD (可扩展)
- **带宽**: 100Mbps (支持1000并发用户)
- **数据库**: PostgreSQL 实例 + Redis 缓存

这个后端架构设计确保了与你现有前端的完美集成，同时为未来扩展提供了坚实的基础。