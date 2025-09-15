# UseItUp PWA - API规范文档

## API基础信息

- **Base URL**: `https://api.useItup.com/v1`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON
- **字符编码**: UTF-8

## 1. 认证相关API

### 1.1 用户注册
```http
POST /auth/register
Content-Type: application/json

{
  "inventoryName": "我的厨房"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "inventoryName": "我的厨房",
      "loginCode": "123456",
      "createdAt": "2024-08-30T12:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "550e8400-e29b-41d4-a716-446655440001",
      "expiresIn": 3600
    }
  }
}
```

### 1.2 用户登录
```http
POST /auth/login
Content-Type: application/json

{
  "loginCode": "123456"
}
```

### 1.3 Token刷新
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440001"
}
```

## 2. 库存管理API

### 2.1 获取库存列表
```http
GET /inventory?filter=all&sort=expiryDate&order=asc&page=1&limit=50
Authorization: Bearer {accessToken}
```

**查询参数:**
- `filter`: all | fresh | warning | expired
- `sort`: expiryDate | addedDate | name
- `order`: asc | desc
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 50, 最大: 100)

**响应示例:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "itemId": "apple_red",
        "name": "红苹果",
        "category": "水果",
        "quantity": 5,
        "unit": "个",
        "expiryDate": "2024-09-15",
        "addedDate": "2024-08-30",
        "status": "active",
        "notes": "有机苹果",
        "daysUntilExpiry": 16,
        "freshnessStatus": "fresh",
        "estimatedValue": 12.50,
        "co2Impact": 0.8,
        "createdAt": "2024-08-30T12:00:00Z",
        "updatedAt": "2024-08-30T12:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 125,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalItems": 125,
      "freshItems": 80,
      "warningItems": 30,
      "expiredItems": 15,
      "totalValue": 456.80
    }
  }
}
```

### 2.2 添加库存物品
```http
POST /inventory
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "itemId": "apple_red",
  "quantity": 3,
  "customExpiryDate": "2024-09-20",
  "notes": "超市特价购买"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "itemId": "apple_red",
      "name": "红苹果",
      "category": "水果",
      "quantity": 3,
      "unit": "个",
      "expiryDate": "2024-09-20",
      "addedDate": "2024-08-30",
      "status": "active",
      "notes": "超市特价购买",
      "estimatedValue": 7.50,
      "createdAt": "2024-08-30T12:00:00Z"
    }
  }
}
```

### 2.3 标记物品已使用
```http
PUT /inventory/{itemId}/use
Authorization: Bearer {accessToken}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "impact": {
      "itemId": "550e8400-e29b-41d4-a716-446655440003",
      "itemName": "红苹果",
      "moneySaved": 7.50,
      "co2Avoided": 0.6,
      "actionType": "used",
      "timestamp": "2024-08-30T12:00:00Z",
      "motivationalMessage": "太棒了！你避免了食物浪费！"
    },
    "updatedItem": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "status": "used",
      "usedAt": "2024-08-30T12:00:00Z"
    }
  }
}
```

## 3. 影响统计API

### 3.1 获取总体影响
```http
GET /impact/total?period=all_time
Authorization: Bearer {accessToken}
```

**查询参数:**
- `period`: all_time | year | month | week

**响应示例:**
```json
{
  "success": true,
  "data": {
    "totalMoneySaved": 456.80,
    "totalCo2Avoided": 32.5,
    "itemsUsed": 145,
    "itemsWasted": 12,
    "wasteReductionRate": 92.3,
    "period": "all_time",
    "comparison": {
      "co2Equivalent": "相当于种植了16棵树",
      "drivingEquivalent": "相当于减少了65公里的驾驶",
      "energyEquivalent": "相当于节省了120度电"
    },
    "achievements": [
      {
        "id": "first_save",
        "title": "首次节约",
        "description": "完成第一次食物节约",
        "unlockedAt": "2024-08-15T10:00:00Z"
      }
    ],
    "lastUpdated": "2024-08-30T12:00:00Z"
  }
}
```

### 3.2 获取影响历史
```http
GET /impact/history?period=month&year=2024&month=8
Authorization: Bearer {accessToken}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "date": "2024-08-30",
        "moneySaved": 15.50,
        "co2Avoided": 1.2,
        "itemsUsed": 6,
        "itemsWasted": 1
      }
    ],
    "summary": {
      "totalMoneySaved": 156.80,
      "totalCo2Avoided": 12.5,
      "averagePerDay": 5.2,
      "bestDay": {
        "date": "2024-08-25",
        "moneySaved": 25.30
      }
    },
    "trends": {
      "moneySavedTrend": 15.5,
      "co2AvoidedTrend": 8.2,
      "wasteReductionTrend": 12.1
    }
  }
}
```

## 4. 食品数据API

### 4.1 获取食品分类
```http
GET /groceries/categories
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "fruits",
        "name": "水果",
        "icon": "🍎",
        "itemCount": 45,
        "avgShelfLife": 7
      },
      {
        "id": "vegetables",
        "name": "蔬菜", 
        "icon": "🥬",
        "itemCount": 68,
        "avgShelfLife": 5
      }
    ]
  }
}
```

### 4.2 获取食品列表
```http
GET /groceries?category=fruits&search=苹果&page=1&limit=20
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "apple_red",
        "name": "红苹果",
        "category": "水果",
        "defaultShelfLife": 14,
        "avgPrice": 2.50,
        "co2PerKg": 0.4,
        "unit": "个",
        "imageUrl": "/images/groceries/apple_red.jpg",
        "nutritionInfo": {
          "calories": 52,
          "carbs": 14,
          "fiber": 2.4,
          "vitamin_c": 4.6
        },
        "storageAdvice": "存放在冰箱冷藏室",
        "tags": ["有机", "本地", "时令"]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 45
    }
  }
}
```

## 5. 用户管理API

### 5.1 获取用户信息
```http
GET /users/me
Authorization: Bearer {accessToken}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "inventoryName": "我的厨房",
      "loginCode": "123456",
      "createdAt": "2024-08-30T12:00:00Z",
      "lastActiveAt": "2024-08-30T12:00:00Z",
      "settings": {
        "notifications": {
          "expiryReminders": true,
          "wasteAlerts": true,
          "achievementNotifications": true
        },
        "preferences": {
          "currency": "CNY",
          "language": "zh-CN",
          "timezone": "Asia/Shanghai"
        }
      },
      "statistics": {
        "totalItemsAdded": 256,
        "totalItemsUsed": 145,
        "accountAge": 45,
        "streak": 12
      }
    }
  }
}
```

### 5.2 更新用户信息
```http
PUT /users/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "inventoryName": "家庭厨房",
  "settings": {
    "notifications": {
      "expiryReminders": false
    }
  }
}
```

## 6. 通知API

### 6.1 获取通知列表
```http
GET /notifications?status=unread&page=1&limit=20
Authorization: Bearer {accessToken}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "type": "expiry_warning",
        "title": "食物即将过期",
        "message": "你的牛奶将在明天过期",
        "data": {
          "itemId": "550e8400-e29b-41d4-a716-446655440005",
          "itemName": "牛奶",
          "expiryDate": "2024-09-01"
        },
        "status": "unread",
        "createdAt": "2024-08-30T09:00:00Z"
      }
    ],
    "unreadCount": 3
  }
}
```

## 7. 错误处理

### 标准错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "INVALID_LOGIN_CODE",
    "message": "登录码无效或已过期",
    "details": {
      "field": "loginCode",
      "reason": "code_not_found"
    },
    "timestamp": "2024-08-30T12:00:00Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440006"
  }
}
```

### 常见错误码
- `400 BAD_REQUEST`: 请求参数错误
- `401 UNAUTHORIZED`: 未认证或token无效
- `403 FORBIDDEN`: 权限不足
- `404 NOT_FOUND`: 资源不存在
- `409 CONFLICT`: 资源冲突
- `422 VALIDATION_ERROR`: 数据验证失败
- `429 RATE_LIMIT_EXCEEDED`: 请求频率超限
- `500 INTERNAL_ERROR`: 服务器内部错误

## 8. 实时通信 (WebSocket)

### 连接地址
```
wss://api.useItup.com/ws/{userId}?token={accessToken}
```

### 消息格式
```json
{
  "type": "inventory_update",
  "data": {
    "action": "item_added",
    "item": {...}
  },
  "timestamp": "2024-08-30T12:00:00Z"
}
```

### 消息类型
- `inventory_update`: 库存变更
- `impact_update`: 影响统计更新
- `notification`: 新通知
- `achievement_unlocked`: 成就解锁
- `system_message`: 系统消息

## 9. 数据同步API

### 9.1 同步数据
```http
POST /sync
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "lastSyncTime": "2024-08-30T10:00:00Z",
  "deviceId": "device_123",
  "changes": [
    {
      "id": "temp_001",
      "type": "create",
      "entity": "inventory_item",
      "data": {...},
      "timestamp": "2024-08-30T11:00:00Z"
    }
  ]
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "conflicts": [],
    "serverChanges": [
      {
        "type": "update",
        "entity": "inventory_item",
        "id": "550e8400-e29b-41d4-a716-446655440007",
        "data": {...},
        "timestamp": "2024-08-30T11:30:00Z"
      }
    ],
    "newSyncTime": "2024-08-30T12:00:00Z",
    "syncStatus": "success"
  }
}
```

这个API规范为你的前端提供了完整的后端接口定义，确保前后端能够无缝集成。