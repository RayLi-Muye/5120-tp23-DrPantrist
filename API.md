
### 1. Create User (Optional)

Generates a unique ID and login code for individual users. Typically, frontend applications use the **Create Inventory** step for a one-time setup (which simultaneously creates both the user and the room). This interface is only used when pre-creating users is required.

Interface: POST https://api.tp23.me/users/create

Body example：
```json
{
  "display_name": "andy"
}
```

return：user\_id, login\_code

GET retrieve user information via login_code

https://api.tp23.me/users/by-login-code?login\_code=ABCD12
---

### 2. create inventory

Users initiate creation by entering “Your Name + Room Name”. The backend will:
- Generate a user (with a unique login_code);
- Create a room (default inventory_type: shared);
- Set the user as owner and add them to the member list;
- Automatically create a default Profile: position=1, named after the user's display_name.

interface：POST https://api.tp23.me/inventories/create

Body examplel
```json
{
  "display_name": "andy",
  "inventory_name": "my kitchen"
}
```

return：
```json
{
  "user": {
    "user_id": "UUID",
    "display_name": "andy",
    "login_code": "AB12"
  },
  "inventory": {
    "inventory_id": "UUID",
    "inventory_name": "my kitchen",
    "owner_user_id": "UUID",
    "inventory_type": "shared"
  }
}
```

GET query room information (including profiles) by login_code
https://api.tp23.me/inventories/by-login-code?login_code=AB12


---

### 3. Invite other users to join the inventory (no limit on number of users)

Join via login_code (recommended)

interface：POST https://api.tp23.me/inventories/join/by-login-code

Body example:
```json
{
  "login_code": "CD34",
  "inventory_id": "roomUUID"
}
```

return：
```json
{ "ok": true }
```

GET retrieve room members using login_code 
https://api.tp23.me/inventories/members/by-login-code?login_code=AB12


---

### 4. Profiles

Each room can have up to 3 profiles (position=1..3). position=1 is the creator's default profile; the owner can add or rename profiles at positions 2 and 3.

GET lists the current room's profiles (sorted by position). GET Retrieve room members using login_code 
https://api.tp23.me/inventories/profiles/by-login-code?login_code=AB12

return：
```json
{
  "inventory_id": "UUID",
  "profiles": [
    { "profile_id": "UUID", "profile_name": "andy", "position": 1, "created_at": "..." },
    { "profile_id": "UUID", "profile_name": "Ray",  "position": 2, "created_at": "..." }
  ]
}
```

interface：POST https://api.tp23.me/inventories/profiles/add-or-rename?inventory_id=roomUUID

Body examplelewner-only）：
```json
{
  "login_code": "AB12",
  "profile_name": "Gary",
  "position": 3 
}
```


---

### 5. Adding Items to Inventory (Shared / Private)

Inventory members can add **shared** or **private** items. Shared items are accessible to all; private items belong to a specific profile.

interface：POST https://api.tp23.me/items/by-login-code

Body example（Shared）：
```json
{
  "login_code": "ABCD12",
  "grocery_id": 101,
  "quantity": 2,
  "purchased_at": "2025-03-01",
  "actual_expiry": "2025-03-10"
}
```

Body example（Private,profile position=2）：
```json
{
  "login_code": "AB12",
  "grocery_id": 101,
  "quantity": 2,
  "visibility": "private",
  "profile_position": 2
}
```

GET view items in the room via login_code (filterable)

https://api.tp23.me/items/by-login-code?login_code=AB12  

Optional filters:

visibility=shared | private

If private, you can additionally pass: profile_position=1|2|3 or profile_id=UUID

---


### 6. Modify or Consume Items

Modify item information (quantity / date, etc.) Modify item information (quantity / date, etc.) 
interface: `PATCH https://api.tp23.me/items/{item_id}/by-login-code`

Body example:  
```json
{
  "login_code": "AB12",
  "quantity": 3,
  "actual_expiry": "2025-03-12"
}
```
return:
```json

{
  "ok": true
}
```
Consumable Items (Click the checkmark = Used up)
interface: DELETE https://api.tp23.me/items/{item_id}/by-login-code?login_code=AB12

return:
```json
{
  "ok": true,
  "money_saved": 7.98,
  "co2_saved_kg": 1.24,
  "consumed_at": "2025-09-21T11:30:00Z"
}
```
Description: Writes to the consumption ledger and removes the item from inventory.


---

### 7. Browse ingredients and categories

GET Retrieve all categories 
https://api.tp23.me/categories

return：
```json
[
  {
    "category_id": 1,
    "category_name": "vagen",
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
------

### 8. Savings Statistics (Cumulative)

Retrieve the cumulative savings amount and CO₂ reduction for a room using the `login_code`, returned by database / shared / individual private databases.

interface: `GET https://api.tp23.me/stats/by-login-code?login_code=AB12`

return:
```json
{
  "inventory_id": "7b2a0d5e-6f6b-4b9b-9d3f-6c8a9f2a1234",
  "overall": {
    "money_saved": 32.5,
    "co2_saved_kg": 4.2
  },
  "shared": {
    "money_saved": 20.1,
    "co2_saved_kg": 2.8
  },
  "profiles": [
    {
      "position": 1,
      "profile_id": "8e1b4b7d-2c8c-4f54-9a8e-11c2a1b2c333",
      "profile_name": "andy",
      "money_saved": 5.2,
      "co2_saved_kg": 0.6
    },
    {
      "position": 2,
      "profile_id": "1fb6f0d1-2ab3-4fb6-8d2b-1a2b3c4d5e66",
      "profile_name": "Ray",
      "money_saved": 7.2,
      "co2_saved_kg": 0.8
    }
  ]
}
```

GET all groceries 
https://api.tp23.me/groceries

GET Search groceries by criteria  
https://api.tp23.me/groceries?q=apple&category_id=2

GET Get details for a specific grocerieses
https://api.tp23.me/groceries/101

------

### 9. Recent 7-Day Spending Ledger (Grouped by Shared / Private Profile)

To view household spending transactions for the past N days, grouped by Shared and each Private Profile, return:

records details

daily_totals daily subtotals (aggregated by day)

totals bucket totals

GET

https://api.tp23.me/ledger/7d/by-login-code?login_code=AB12


Optional Query:

days (default 7, supports 1–31)

limit (default 20, maximum 100)

example：

https://api.tp23.me/ledger/7d/by-login-code?login_code=AB12&days=7


return：
```json
{
  "inventory_id": "UUID",
  "range": { "start": "2025-10-02", "end": "2025-10-09" },
  "profiles": [
    {
      "bucket": "shared",
      "profile_id": null,
      "profile_name": "Shared",
      "records": [
        {
          "consumed_at": "2025-10-09T03:00:12.521Z",
          "grocery_name": "Milk 1L",
          "category_name": "Dairy",
          "quantity": 1.0,
          "money_saved": 2.5,
          "co2_saved_kg": 0.35,
          "visibility": "shared",
          "consumed_by": "Alice"
        }
      ],
      "daily_totals": [
        {"day": "2025-10-09", "quantity": 1.0, "money_saved": 2.5, "co2_saved_kg": 0.35}
      ],
      "totals": {"quantity": 1.0, "money_saved": 2.5, "co2_saved_kg": 0.35}
    },
    {
      "bucket": "profile",
      "profile_id": "UUID-of-profile-2",
      "profile_name": "Dad",
      "records": [
        {
          "consumed_at": "2025-10-08T06:40:01.131Z",
          "grocery_name": "Apple",
          "category_name": "Fruit",
          "quantity": 4.0,
          "money_saved": 3.2,
          "co2_saved_kg": 0.5,
          "visibility": "private",
          "consumed_by": "Bob"
        }
      ],
      "daily_totals": [
        {"day": "2025-10-08", "quantity": 4.0, "money_saved": 3.2, "co2_saved_kg": 0.5}
      ],
      "totals": {"quantity": 4.0, "money_saved": 3.2, "co2_saved_kg": 0.5}
    }
  ]
}
```
---

### flow

1. Create inventory (one-step): POST .../inventories/create (pass display_name + inventory_name)

  Record returned user.login_code and inventory.inventory_id.

2. Other users join: POST .../inventories/join/by-login-code (with login_code + inventory_id).

3. Owner can add/rename Profile: POST .../inventories/profiles/add-or-rename.

4. Add items:

  Shared: POST .../items/by-login-code (without visibility).

  Private: POST .../items/by-login-code (with visibility=private + profile_position).

5. View items: GET .../items/by-login-code (filterable by visibility and profile).

6. Modify / Delete: PATCH / DELETE corresponding endpoints, then GET to verify result.

7. View categories and groceries:

  GET .../categories

  GET .../groceries / GET .../groceries?q=apple / GET .../groceries/{id}

8. View cumulative stats (money & CO₂ savings):

  GET .../stats/by-login-code?login_code=AB12

9. View recent spending ledger (7-day default):

  GET .../ledger/7d/by-login-code?login_code=AB12&days=7

