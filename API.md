GET（直接网址能打开）
根目录:
http://13.210.101.133:8000/

健康检查:
http://13.210.101.133:8000/health

获取分类:
http://13.210.101.133:8000/categories

获取所有食材:
http://13.210.101.133:8000/groceries

通过 login_code 获取用户:
http://13.210.101.133:8000/users/by-login-code

通过 login_code 获取房间（完整信息，含 share_code）:
http://13.210.101.133:8000/inventories/by-login-code

通过 login_code 获取房间（精简信息，不含 share_code）:
http://13.210.101.133:8000/inventories/by-login-code/min

通过 login_code 获取房间成员:
http://13.210.101.133:8000/inventories/members/by-login-code

通过 login_code 获取房间内的食品列表:
http://13.210.101.133:8000/items/by-login-code

获取用户（通过 login_code）（示例）：
http://13.210.101.133:8000/users/by-login-code?login_code=ABCD12

获取房间（完整版，含 share_code）（示例）：
http://13.210.101.133:8000/inventories/by-login-code?login_code=ABCD12

获取房间（精简版，不含 share_code）（示例）：
http://13.210.101.133:8000/inventories/by-login-code/min?login_code=ABCD12

获取房间成员（通过 login_code）（示例）：
http://13.210.101.133:8000/inventories/members/by-login-code?login_code=ABCD12


按条件搜索食材（示例）:
http://13.210.101.133:8000/groceries?q=apple&category_id=2

获取某个食材详情（示例，grocery_id=101）:
http://13.210.101.133:8000/groceries/101

获取某用户的房间（示例，user_id=u123）:
http://13.210.101.133:8000/inventories/by-user?user_id=u123

获取房间内的食品列表（示例，inventory_id=abcd-1234）:
http://13.210.101.133:8000/items?inventory_id=abcd-1234




POST（需要写代码发请求，不能直接点网址）

users表
http://13.210.101.133:8000/users/create

POST /users/create
Body:
{
  "display_name": "name"
}

创建房间:
http://13.210.101.133:8000/inventories/create

POST /inventories/create
Body:
{
  "inventory_name": "我的冰箱",
  "owner_user_id": "用户UUID"
}

加入房间:
带着sharecode
http://13.210.101.133:8000/inventories/{inventory_id}/join

POST /inventories/{inventory_id}/join
Body:
{
  "user_id": "用户UUID",
  "share_code": "ABCDEFGH"
}

不带sharecode
http://13.210.101.133:8000/inventories/join/by-login-code

POST /inventories/join/by-login-code
Body:
{
  "login_code": "ABCD12",
  "inventory_id": "房间UUID"
}

新增食品:（按 inventory_id 写入）:
http://13.210.101.133:8000/items

POST /items
Body:
{
  "inventory_id": "房间UUID",
  "grocery_id": 101,
  "created_by": "用户UUID",
  "quantity": 2.5,
  "purchased_at": "2025-03-01",
  "actual_expiry": "2025-03-10"
}

新增食品（通过 login_code 写入）:
http://13.210.101.133:8000/items/by-login-code

POST /items/by-login-code
Body:
{
  "login_code": "ABCD12",
  "grocery_id": 101,
  "quantity": 1.0,
  "purchased_at": "2025-03-01",
  "actual_expiry": "2025-03-10"
}


标记食品为已使用，通过 login_code，路径里带 item_id
http://13.210.101.133:8000/items/{item_id}/consume

PATCH /items/{item_id}/consume
Body:
{
  "login_code": "ABCD12",
  "consumed": true
}

删除食品通过 login_code，路径里带 item_id
http://13.210.101.133:8000/items/{item_id}/by-login-code

DELETE /items/{item_id}/by-login-code?login_code=ABCD12



test：
Your login code is:

ray
EEN7VT
Room ID: 15a1ce33-350c-4df9-bec5-9bc005d261bd

ray2
NYVA48
7d2a3d2e-5a67-415a-b2b9-e95e57b35473

