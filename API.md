GET（直接网址能打开）
根目录:
http://13.210.101.133:8000/

健康检查:
http://13.210.101.133:8000/health

获取分类:
http://13.210.101.133:8000/categories

获取所有食材:
http://13.210.101.133:8000/groceries

按条件搜索食材（示例）:
http://13.210.101.133:8000/groceries?q=apple&category_id=2

获取某个食材详情（示例，grocery_id=101）:
http://13.210.101.133:8000/groceries/101

获取某用户的房间（示例，user_id=u123）:
http://13.210.101.133:8000/inventories/by-user?user_id=u123

获取房间内的食品列表（示例，inventory_id=abcd-1234）:
http://13.210.101.133:8000/items?inventory_id=abcd-1234

POST（需要写代码发请求，不能直接点网址）
创建房间:
http://13.210.101.133:8000/inventories/create

加入房间:
http://13.210.101.133:8000/inventories/{inventory_id}/join

新增食品:
http://13.210.101.133:8000/items
