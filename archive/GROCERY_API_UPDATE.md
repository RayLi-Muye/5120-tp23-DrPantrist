# Grocery API Integration Update

## 📋 概述

本次更新将前端的grocery数据从静态数据改为从后端API动态获取，使用真实的食材数据和保质期信息。

## 🔧 主要更改

### 1. 新增API服务 (`src/api/groceries.ts`)
- 创建了完整的Groceries API服务类
- 支持获取所有食材、搜索、按ID查询等功能
- 包含数据转换逻辑，将API数据转换为前端需要的格式
- 智能的图标、价格和CO2因子估算

### 2. 更新Groceries Store (`src/stores/groceries.ts`)
- 添加了API数据获取功能
- 保持向后兼容性，现有代码无需修改
- 添加了加载状态、错误处理和缓存机制
- 提供fallback数据，确保离线时仍可使用

### 3. 更新AddItemView (`src/views/AddItemView.vue`)
- 在组件挂载时自动获取最新的grocery数据
- 确保用户看到最新的食材列表

### 4. API配置更新
- 更新了API入口文件以包含groceries API
- 添加了相关类型导出

## 🌟 新功能特性

### 数据来源
- **API端点**: `http://13.210.101.133:8000/groceries`
- **数据量**: 285+ 种食材
- **分类**: 16个食材分类
- **保质期**: 基于`dop_refrigerate_max`（冷藏保质期）

### 智能数据转换
- **图标映射**: 根据食材名称和分类自动分配合适的emoji图标
- **价格估算**: 基于食材类型和分类的智能价格估算
- **CO2因子**: 环境影响因子估算
- **单位推断**: 根据食材类型自动推断合适的计量单位

### 缓存和性能
- **5分钟缓存**: 避免频繁API调用
- **错误恢复**: API失败时使用fallback数据
- **加载状态**: 提供用户友好的加载反馈

## 🔄 数据映射

### API数据结构
```typescript
interface APIGroceryItem {
  grocery_id: number
  name: string
  category_id: number
  dop_refrigerate_max: number | null  // 冷藏保质期（天）
  dop_pantry_max: number | null       // 常温保质期（天）
  // ... 其他字段
}
```

### 前端数据结构
```typescript
interface GroceryItem {
  id: string                    // "grocery-{grocery_id}"
  name: string                  // 食材名称
  category: string              // 映射后的分类名
  icon: string                  // 自动分配的emoji图标
  defaultShelfLife: number      // 默认保质期（优先使用冷藏）
  avgPrice: number              // 估算价格
  co2Factor: number             // CO2因子
  unit: string                  // 计量单位
}
```

## 🧪 测试

### 开发环境测试
- 添加了`testGroceriesAPI.ts`工具
- 在开发环境中自动运行API测试
- 测试所有API端点的连通性和数据完整性

### 测试内容
1. 获取所有食材数据
2. 获取分类信息
3. 搜索功能测试
4. 按ID查询测试

## 📱 用户体验改进

### 更丰富的食材选择
- 从15种增加到285+种食材
- 更准确的保质期信息
- 更详细的分类

### 更好的性能
- 智能缓存减少网络请求
- 渐进式加载，fallback数据确保可用性
- 错误处理确保应用稳定性

## 🔧 技术实现

### API调用策略
1. **首次加载**: 从API获取最新数据
2. **缓存命中**: 5分钟内使用缓存数据
3. **错误处理**: API失败时使用fallback数据
4. **强制刷新**: 支持手动刷新数据

### 向后兼容性
- 保持现有的store接口不变
- 现有组件无需修改
- 渐进式升级，不影响现有功能

## 🚀 部署说明

### 环境要求
- 确保API服务器 `http://13.210.101.133:8000` 可访问
- 前端应用需要能够访问外部API

### 配置检查
1. 检查网络连接到API服务器
2. 验证CORS设置（如果需要）
3. 监控API响应时间和可用性

## 📊 监控和维护

### 日志记录
- API调用成功/失败日志
- 数据转换过程日志
- 缓存命中率统计

### 错误处理
- 网络错误自动重试
- API错误降级到fallback数据
- 用户友好的错误提示

## 🔮 未来扩展

### 可能的改进
1. **离线支持**: 使用IndexedDB缓存数据
2. **个性化**: 基于用户偏好排序食材
3. **搜索优化**: 添加模糊搜索和建议
4. **数据同步**: 实时更新食材信息

### API扩展
1. **用户自定义食材**: 支持添加自定义食材
2. **营养信息**: 集成营养数据
3. **季节性推荐**: 基于季节推荐食材