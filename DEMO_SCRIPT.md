# UseItUp PWA Demo Script

## 演示新功能

### 1. 认证系统演示

#### 新用户注册流程
1. 打开应用 (http://localhost:5175)
2. 系统自动跳转到认证页面
3. 点击 "Create Your Inventory"
4. 输入库存名称，例如："我的厨房"
5. 点击 "Create Inventory"
6. 系统显示6位数登录码
7. 保存登录码并点击 "Continue to Dashboard"

#### 现有用户登录流程
1. 在认证页面点击 "Enter login code"
2. 输入之前保存的6位数登录码
3. 点击 "Access Inventory"
4. 成功登录到个人库存

### 2. 影响统计功能演示

#### 查看统计数据
1. 登录后进入 Dashboard
2. 点击 "Inventory" 查看库存页面
3. 页面顶部显示 "Your Impact" 统计栏
4. 显示内容：
   - 💰 节省的金钱
   - 🌱 减少的CO₂排放
   - 使用的物品数量和环保对比

#### 测试统计更新
1. 在库存中标记物品为已使用
2. 观察统计数据实时更新
3. 查看激励性消息显示

### 3. 用户体验功能

#### 个性化界面
1. Dashboard 显示用户的库存名称
2. 显示当前登录码（方便用户查看）
3. 提供登出功能

#### 移动端优化
1. 在移动设备上测试响应式设计
2. 触摸友好的界面元素
3. 适配不同屏幕尺寸

## 测试场景

### 场景1：新用户首次使用
```
用户操作：首次打开应用
预期结果：自动跳转到认证页面，显示创建库存选项
```

### 场景2：创建库存
```
用户操作：输入"家庭厨房"作为库存名称
预期结果：生成6位数登录码，显示成功页面
```

### 场景3：使用登录码登录
```
用户操作：输入正确的6位数登录码
预期结果：成功登录，跳转到个人Dashboard
```

### 场景4：查看影响统计
```
用户操作：进入Inventory页面
预期结果：显示个人环保影响统计，包括节省金钱和减少排放
```

### 场景5：标记物品已使用
```
用户操作：在库存中标记一个物品为已使用
预期结果：统计数据更新，显示新的节省金额和减排量
```

## 数据验证

### 检查localStorage
```javascript
// 在浏览器控制台中运行
console.log(localStorage.getItem('useItUp_user'))
```

### 验证用户状态
```javascript
// 检查认证状态
const authStore = useAuthStore()
console.log('Is authenticated:', authStore.isAuthenticated)
console.log('User data:', authStore.user)
```

### 验证影响数据
```javascript
// 检查影响统计
const impactStore = useImpactStore()
console.log('Total impact:', impactStore.formattedTotalImpact)
```

## 常见问题处理

### 问题1：登录码不工作
- 检查是否输入了正确的6位数字
- 确认localStorage中有用户数据
- 尝试重新创建库存

### 问题2：统计数据不显示
- 确认用户已登录
- 检查是否有库存物品
- 验证API连接状态

### 问题3：页面跳转问题
- 检查路由守卫是否正常工作
- 确认认证状态正确
- 清除浏览器缓存重试

## 性能指标

### 加载时间
- 认证页面：< 1秒
- Dashboard加载：< 2秒
- 库存页面：< 2秒

### 响应时间
- 登录操作：< 500ms
- 统计数据更新：< 300ms
- 页面切换：< 200ms

## 移动端测试

### 设备兼容性
- iOS Safari
- Android Chrome
- 各种屏幕尺寸 (320px - 768px+)

### 触摸交互
- 按钮大小符合触摸标准 (44px+)
- 滑动手势支持
- 键盘输入优化

## 下一步改进

### 短期改进
- 添加登录码强度验证
- 实现数据导出功能
- 优化错误提示信息

### 长期规划
- 服务器端认证
- 多设备同步
- 社交分享功能