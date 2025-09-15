// 清理所有认证相关的 localStorage 数据
// 在浏览器控制台运行此脚本

console.log('🧹 Clearing all authentication data...');

// 记录清理前的状态
console.log('Before cleanup:', {
  authToken: localStorage.getItem('authToken'),
  userId: localStorage.getItem('userId'),
  useItUp_user: localStorage.getItem('useItUp_user'),
  login_code: localStorage.getItem('login_code')
});

// 清除多余的认证数据，只保留必要的
localStorage.removeItem('authToken');
localStorage.removeItem('userId');

// 保持这个简单的 test user，只要有 loginCode 即可
const testUser = {
  id: 'test-user-id',
  displayName: 'Test User',
  inventoryName: 'Test Inventory',
  loginCode: 'EEN7VT',
  createdAt: new Date().toISOString(),
  inventoryId: 'test-inventory-id',
  isOwner: true
};

localStorage.setItem('useItUp_user', JSON.stringify(testUser));

console.log('After cleanup:', {
  authToken: localStorage.getItem('authToken'),
  userId: localStorage.getItem('userId'),
  useItUp_user: localStorage.getItem('useItUp_user'),
  login_code: localStorage.getItem('login_code')
});

console.log('✅ Cleanup complete! Please refresh the page.');