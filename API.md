UseItUp Minimal API — Endpoints & Examples
Generated: 2025-09-12T07:31:22.210240Z

Base URL
  https://api.tp23.me/

Health
GET /health
Example:
  curl https://api.tp23.me/health
Response:
  {"status":"ok"}

Categories & Groceries
GET /categories
Example:
  curl https://api.tp23.me/categories
Response:
  [{"category_id":1,"category_name":"Fruits"},{"category_id":2,"category_name":"Vegetables"}]
Groceries:
curl  https://api.tp23.me/groceries
GET /groceries?q=apple&category_id=1&limit=2&offset=0
Example:
  curl "https://api.tp23.me/groceries?q=apple&category_id=1&limit=2&offset=0"
Response (sample):
  [
    {
      "grocery_id": 101,
      "product_id": 5001,
      "name": "Apple",
      "category_id": 1,
      "dop_pantry_max": 7,
      "dop_pantry_metric": "days",
      "dop_refrigerate_max": 30,
      "dop_refrigerate_metric": "days",
      "dop_freeze_max": null,
      "dop_freeze_metric": null,
      "created_at": "2025-09-01T03:12:45.123456+00:00"
    }
  ]

GET /groceries/{grocery_id}
Example:
  curl https://api.tp23.me/groceries/101
Response (sample):
  {
    "grocery_id": 101,
    "product_id": 5001,
    "name": "Apple",
    "category_id": 1,
    "dop_pantry_max": 7,
    "dop_pantry_metric": "days",
    "dop_refrigerate_max": 30,
    "dop_refrigerate_metric": "days",
    "dop_freeze_max": null,
    "dop_freeze_metric": null,
    "created_at": "2025-09-01T03:12:45.123456+00:00"
  }

Users & Inventories
GET /users/by-login-code?login_code=ABCD12
Example:
  curl "https://api.tp23.me/users/by-login-code?login_code=ABCD12"
Response:
  {
    "user_id": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
    "display_name": "Alice",
    "login_code": "ABCD12"
  }

GET /inventories/by-login-code?login_code=ABCD12      (includes share_code)
Example:
  curl "https://api.tp23.me/inventories/by-login-code?login_code=ABCD12"
Response:
  {
    "inventory_id": "15a1ce33-350c-4df9-bec5-9bc005d261bd",
    "inventory_name": "Mykitchen",
    "owner_user_id": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
    "share_code": "K7M2Q9XZ",
    "role": "owner",
    "joined_at": "2025-09-10T05:30:00.000000+00:00"
  }

GET /inventories/by-login-code/min?login_code=ABCD12  (without share_code)
Example:
  curl "https://api.tp23.me/inventories/by-login-code/min?login_code=ABCD12"
Response:
  {
    "inventory_id": "15a1ce33-350c-4df9-bec5-9bc005d261bd",
    "inventory_name": "Mykitchen",
    "owner_user_id": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
    "role": "owner",
    "joined_at": "2025-09-10T05:30:00.000000+00:00"
  }

GET /inventories/by-user?user_id={USER_UUID}
Example:
  curl "https://api.tp23.me/inventories/by-user?user_id=f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11"
Response:
  {
    "inventory_id": "15a1ce33-350c-4df9-bec5-9bc005d261bd",
    "inventory_name": "Mykitchen",
    "owner_user_id": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
    "share_code": "K7M2Q9XZ",
    "role": "owner",
    "joined_at": "2025-09-10T05:30:00.000000+00:00"
  }
If user not in any inventory: null

GET /inventories/members/by-login-code?login_code=ABCD12
Example:
  curl "https://api.tp23.me/inventories/members/by-login-code?login_code=ABCD12"
Response:
  [
    {
      "user_id": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
      "display_name": "Alice",
      "role": "owner",
      "joined_at": "2025-09-10T05:30:00.000000+00:00"
    },
    {
      "user_id": "1c0d1c8a-3e1f-4b3d-9c62-9d1f0f6b8f22",
      "display_name": "Bob",
      "role": "member",
      "joined_at": "2025-09-11T02:15:00.000000+00:00"
    }
  ]

Items (list)
GET /items?inventory_id={INVENTORY_UUID}&limit=200
Example:
  curl "https://api.tp23.me/items?inventory_id=15a1ce33-350c-4df9-bec5-9bc005d261bd&limit=200"
Response:
  [
    {
      "item_id": "9a6a9f0f-1c6d-4e2e-9d6c-9f2b1f3a1234",
      "inventory_id": "15a1ce33-350c-4df9-bec5-9bc005d261bd",
      "grocery_id": 101,
      "grocery_name": "Apple",
      "category_id": 1,
      "category_name": "Fruits",
      "quantity": 1.0,
      "purchased_at": "2025-09-11",
      "actual_expiry": "2025-09-15",
      "created_by": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
      "created_at": "2025-09-11T06:01:22.000000+00:00",
      "updated_at": "2025-09-11T06:01:22.000000+00:00"
    }
  ]

GET /items/by-login-code?login_code=ABCD12&limit=200
Example:
  curl "https://api.tp23.me/items/by-login-code?login_code=ABCD12&limit=200"
Response:
  [
    {
      "item_id": "9a6a9f0f-1c6d-4e2e-9d6c-9f2b1f3a1234",
      "inventory_id": "15a1ce33-350c-4df9-bec5-9bc005d261bd",
      "grocery_id": 101,
      "grocery_name": "Apple",
      "category_id": 1,
      "category_name": "Fruits",
      "quantity": 1.0,
      "purchased_at": "2025-09-11",
      "actual_expiry": "2025-09-15",
      "created_by": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
      "created_at": "2025-09-11T06:01:22.000000+00:00",
      "updated_at": "2025-09-11T06:01:22.000000+00:00"
    }
  ]

Create / Join
POST /users/create
Body:
  {"display_name":"Alice"}
Example:
  curl -X POST https://api.tp23.me/users/create -H "Content-Type: application/json" -d '{"display_name":"Alice"}'
Response:
  {
    "user_id": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
    "display_name": "Alice",
    "login_code": "ABCD12"
  }

POST /inventories/create
Body:
  {"inventory_name":"Mykitchen","owner_user_id":"<USER_UUID>"}
Example:
  curl -X POST https://api.tp23.me/inventories/create -H "Content-Type: application/json" -d '{"inventory_name":"Mykitchen","owner_user_id":"f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11"}'
Response:
  {
    "inventory_id": "15a1ce33-350c-4df9-bec5-9bc005d261bd",
    "inventory_name": "Mykitchen",
    "owner_user_id": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
    "share_code": "K7M2Q9XZ"
  }

POST /inventories/{inventory_id}/join
Body:
  {"user_id":"<USER_UUID>","share_code":"<SHARE_CODE>"}
Example:
  curl -X POST https://api.tp23.me/inventories/15a1ce33-350c-4df9-bec5-9bc005d261bd/join -H "Content-Type: application/json" -d '{"user_id":"1c0d1c8a-3e1f-4b3d-9c62-9d1f0f6b8f22","share_code":"K7M2Q9XZ"}'
Response:
  {"ok": true}

POST /inventories/join/by-login-code
Body:
  {"login_code":"ABCD12","inventory_id":"<INVENTORY_UUID>"}
Example:
  curl -X POST https://api.tp23.me/inventories/join/by-login-code -H "Content-Type: application/json" -d '{"login_code":"ABCD12","inventory_id":"15a1ce33-350c-4df9-bec5-9bc005d261bd"}'
Response:
  {"ok": true}

Items (create & delete)
POST /items/by-login-code     (create one row, no accumulation)
Body:
  {"login_code":"ABCD12","grocery_id":101,"quantity":1.0,"purchased_at":"2025-09-11","actual_expiry":"2025-09-15"}
Example:
  curl -X POST https://api.tp23.me/items/by-login-code -H "Content-Type: application/json" -d '{"login_code":"ABCD12","grocery_id":101,"quantity":1.0,"purchased_at":"2025-09-11","actual_expiry":"2025-09-15"}'
Response (sample):
  {
    "inserted": {
      "item_id": "9a6a9f0f-1c6d-4e2e-9d6c-9f2b1f3a1234",
      "inventory_id": "15a1ce33-350c-4df9-bec5-9bc005d261bd",
      "grocery_id": 101,
      "grocery_name": "Apple",
      "category_id": 1,
      "category_name": "Fruits",
      "quantity": 1.0,
      "purchased_at": "2025-09-11",
      "actual_expiry": "2025-09-15",
      "created_by": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
      "created_at": "2025-09-11T06:01:22.000000+00:00",
      "updated_at": "2025-09-11T06:01:22.000000+00:00"
    },
    "items": [
      {
        "item_id": "9a6a9f0f-1c6d-4e2e-9d6c-9f2b1f3a1234",
        "inventory_id": "15a1ce33-350c-4df9-bec5-9bc005d261bd",
        "grocery_id": 101,
        "grocery_name": "Apple",
        "category_id": 1,
        "category_name": "Fruits",
        "quantity": 1.0,
        "purchased_at": "2025-09-11",
        "actual_expiry": "2025-09-15",
        "created_by": "f2d0d73c-9e48-4f6a-8d0e-0e9e6d1a7a11",
        "created_at": "2025-09-11T06:01:22.000000+00:00",
        "updated_at": "2025-09-11T06:01:22.000000+00:00"
      }
    ]
  }

DELETE /items/{item_id}/by-login-code?login_code=ABCD12
Example:
  curl -X DELETE "https://api.tp23.me/items/9a6a9f0f-1c6d-4e2e-9d6c-9f2b1f3a1234/by-login-code?login_code=ABCD12"
Response:
  {"ok": true}
Errors (samples):
  {"detail":"item not found in your inventory"}   // 404
  {"detail":"invalid login code"}                 // 404

Notes
- Create is pure INSERT (no accumulation). purchased_at defaults to today if omitted.
- Triggers enforce: only inventory members can write; updated_at auto-refreshes on UPDATE.
- Times are in TIMESTAMPTZ; display timezone can be adjusted in SQL (e.g., AT TIME ZONE).

### 流程

创建用户（POST .../users/create），记录返回的 user\_id 与 login\_code。

创建库存（POST .../inventories/create，用上一步的 owner\_user\_id），记录 inventory\_id 与 share\_code。

让第二个用户加入：

方式A：POST .../inventories/{inventory\_id}/join（带 user\_id+share\_code）

方式B：POST .../inventories/join/by-login-code（带 login\_code+inventory\_id）

成功后，用 GET .../inventories/members/by-login-code?login\_code=... 查看成员=2。

任何成员添加物品：POST .../items/by-login-code（带 login\_code、grocery\_id、quantity…）。

用 GET .../items/by-login-code?login\_code=... 验证新增已出现（按 updated\_at 倒序）。

修改或删除：

PATCH .../items/{item\_id}/by-login-code（变更数量/保质期）

DELETE .../items/{item\_id}/by-login-code?login\_code=...

再次 GET 列表确认结果。