
### 1. 创建用户（可选）

用于单独生成用户的唯一 ID 和登录码（login_code）。通常前端直接使用 **创建库存** 一步到位（会同时创建用户与房间），只有在需要预创建用户时才使用本接口。

接口：POST https://api.tp23.me/users/create

Body 示例：
```json
{
  "display_name": "张三"
}
```

返回：user\_id, login\_code （后续操作都要用到 login\_code 来确认身份）

GET 通过 login\_code 获取用户信息

https://api.tp23.me/users/by-login-code?login\_code=ABCD12
---

### 2. 创建库存（房间，一步到位）

由用户输入“你的名字 + 房间名”发起创建。后端会：
- 生成用户（带唯一 login_code）；
- 创建房间（inventory_type 默认 shared）；
- 把该用户设为 owner 并加入成员表；
- 自动创建默认 Profile：position=1，名称为用户的 display_name。

接口：POST https://api.tp23.me/inventories/create

Body 示例：
```json
{
  "display_name": "张三",
  "inventory_name": "我的冰箱"
}
```

返回：
```json
{
  "user": {
    "user_id": "UUID",
    "display_name": "张三",
    "login_code": "AB12"
  },
  "inventory": {
    "inventory_id": "UUID",
    "inventory_name": "我的冰箱",
    "owner_user_id": "UUID",
    "inventory_type": "shared"
  }
}
```

GET 通过 login_code 查询房间信息（含 profiles）  
https://api.tp23.me/inventories/by-login-code?login_code=AB12


---

### 3. 邀请其他用户加入库存（不限人数）

通过 login_code 加入（推荐）

接口：POST https://api.tp23.me/inventories/join/by-login-code

Body 示例：
```json
{
  "login_code": "CD34",
  "inventory_id": "房间UUID"
}
```

返回：
```json
{ "ok": true }
```

GET 通过 login_code 获取房间成员  
https://api.tp23.me/inventories/members/by-login-code?login_code=AB12


---

### 4. Profiles（三个档案/库名）

每个房间最多 3 个 Profile（position=1..3）。position=1 为创建者默认档案；owner 可给 position=2、3 添加或改名。

GET 列出当前房间的 profiles（按 position 排序）  
https://api.tp23.me/inventories/profiles/by-login-code?login_code=AB12

返回示例：
```json
{
  "inventory_id": "UUID",
  "profiles": [
    { "profile_id": "UUID", "profile_name": "张三", "position": 1, "created_at": "..." },
    { "profile_id": "UUID", "profile_name": "Ray",  "position": 2, "created_at": "..." }
  ]
}
```

接口：POST https://api.tp23.me/inventories/profiles/add-or-rename?inventory_id=房间UUID

Body 示例（owner-only）：
```json
{
  "login_code": "AB12",
  "profile_name": "Gary",
  "position": 3   // 不传则自动占用最小空位（2或3）
}
```


---

### 5. 添加物品到库存（Shared / Private）

库存成员可以添加 **共享** 或 **私有** 物品。Shared 为公共；Private 归属某个 profile。

接口：POST https://api.tp23.me/items/by-login-code

Body 示例（Shared）：
```json
{
  "login_code": "ABCD12",
  "grocery_id": 101,
  "quantity": 2,
  "purchased_at": "2025-03-01",
  "actual_expiry": "2025-03-10"
}
```

Body 示例（Private，归 profile position=2）：
```json
{
  "login_code": "AB12",
  "grocery_id": 101,
  "quantity": 2,
  "visibility": "private",
  "profile_position": 2
}
```

GET 通过 login_code 查看房间内物品（可筛选）  
https://api.tp23.me/items/by-login-code?login_code=AB12  
可选筛选：
- visibility=shared | private  
- 若为 private，可再带：profile_position=1|2|3 或 profile_id=UUID


---

### 6. 修改或删除物品

修改物品信息（数量/日期等）  
接口：PATCH https://api.tp23.me/items/{item_id}/by-login-code

Body 示例：
```json
{
  "login_code": "AB12",
  "quantity": 3,
  "actual_expiry": "2025-03-12"
}
```

删除物品  
接口：DELETE https://api.tp23.me/items/{item_id}/by-login-code?login_code=AB12


---

### 7. 浏览食材和分类

GET 获取所有分类（详细字段版）  
https://api.tp23.me/categories

返回示例：
```json
[
  {
    "category_id": 1,
    "category_name": "蔬菜",
    "avg_pantry_days": 3,
    "pantry_product_count": 120,
    "avg_refrigerate_days": 7,
    "refrigerate_product_count": 340,
    "avg_freeze_days": 60,
    "freeze_product_count": 90,
    "co2_factor_kg": 0.45,
    "co2_method": "LCA",
    "co2_confidence": "medium",
    "price": 3.99,
    "product_size": 500,
    "unit": "g"
  }
]
```

GET 获取所有食材  
https://api.tp23.me/groceries

GET 条件搜索食材  
https://api.tp23.me/groceries?q=apple&category_id=2

GET 获取某个食材详情  
https://api.tp23.me/groceries/101


---

### 流程（推荐）

1) 创建库存（一步到位）：POST .../inventories/create（传 display_name + inventory_name）  
   - 记录返回的 `user.login_code` 与 `inventory.inventory_id`。  
2) 其他用户加入：POST .../inventories/join/by-login-code（带 login_code + inventory_id）。  
3) owner 可添加/改名 Profile：POST .../inventories/profiles/add-or-rename。  
4) 添加物品：
   - Shared：POST .../items/by-login-code（不带 visibility）。
   - Private：POST .../items/by-login-code（带 visibility=private + profile_position）。  
5) 查看物品：GET .../items/by-login-code（可按 visibility 和 profile 过滤）。  
6) 修改/删除：PATCH / DELETE 对应接口后，再 GET 验证结果。