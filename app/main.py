# app/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from uuid import uuid4
from typing import Optional
import secrets
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import date
from pydantic import BaseModel

# postgresql+asyncpg
DATABASE_URL = "postgresql+asyncpg://admin:admin1@127.0.0.1:5432/UseItUpDB"

class CreateInventoryIn(BaseModel):
    inventory_name: str = Field(..., min_length=1, max_length=120)
    owner_user_id: str = Field(..., min_length=1, max_length=120)

class JoinInventoryIn(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=120)
    share_code: str = Field(..., min_length=4, max_length=16)

class JoinByLoginCodeIn(BaseModel):
    login_code: str = Field(..., min_length=4, max_length=16)
    inventory_id: str = Field(..., min_length=1)   

class CreateItemIn(BaseModel):
    inventory_id: str = Field(..., min_length=1)
    grocery_id: int
    created_by: str = Field(..., min_length=1, max_length=120)
    quantity: float = 1.0
    # "YYYY-MM-DD"
    purchased_at: Optional[date] = None
    actual_expiry: Optional[date] = None

class MarkConsumedIn(BaseModel):
    login_code: str
    consumed: bool

class CreateUserIn(BaseModel):
    display_name: str

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

app = FastAPI(title="UseItUp Minimal API", version="0.2.0")

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "https://tp23.me",
    "https://api.tp23.me",
    "https://www.tp23.me",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def gen_share_code(n: int = 8) -> str:
    # Random code for share_code (kept for future usage)
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(n))


def _http404(msg: str):
    raise HTTPException(404, msg)


async def _resolve_user_and_inventory_by_login_code(db: AsyncSession, login_code: str):
    """
    Resolve (user_id, inventory_id) from a user's login_code.
    Assumes a user can be in at most one inventory (uq_member_single_room).
    """
    u = (await db.execute(text("""
        SELECT user_id FROM users WHERE login_code = :code LIMIT 1
    """), {"code": login_code})).first()
    if not u:
        _http404("invalid login code")

    inv = (await db.execute(text("""
        SELECT m.inventory_id
        FROM inventory_members m
        WHERE m.user_id = :uid
        LIMIT 1
    """), {"uid": u.user_id})).first()
    if not inv:
        # User not in any inventory yet
        raise HTTPException(403, "user is not in any inventory")

    return u.user_id, inv.inventory_id


@app.get("/")
def root():
    return {"ok": True, "try": ["/health", "/docs"]}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/users/create")
async def create_user(body: CreateUserIn):
    login_code = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(6))
    async with SessionLocal() as db:
        try:
            q = text("""
                INSERT INTO users(display_name, login_code)
                VALUES (:name, :code)
                RETURNING user_id, display_name, login_code
            """)
            res = await db.execute(q, {"name": body.display_name, "code": login_code})
            await db.commit()
            row = res.first()
            return {
                "user_id": row.user_id,
                "display_name": row.display_name,
                "login_code": row.login_code
            }
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"create user failed: {e}")

# Create Room: Save room name + automatically generate share_code
# (share_code is kept for potential future "invite/share" flows)
@app.post("/inventories/create")
async def create_inventory(body: CreateInventoryIn):
    share_code = gen_share_code(8)
    async with SessionLocal() as db:
        try:
            ins_inv = text("""
                INSERT INTO inventories(inventory_name, owner_user_id, share_code)
                VALUES (:name, :owner, :scode)
                RETURNING inventory_id, inventory_name, owner_user_id, share_code
            """)
            res = await db.execute(ins_inv, {
                "name": body.inventory_name,
                "owner": body.owner_user_id,
                "scode": share_code
            })
            row = res.first()

            # Add the homeowner to the members table
            await db.execute(text("""
                INSERT INTO inventory_members(inventory_id, user_id, role)
                VALUES (:iid, :uid, 'owner')
                ON CONFLICT DO NOTHING
            """), {"iid": row.inventory_id, "uid": body.owner_user_id})

            await db.commit()
            return {
                "inventory_id": row.inventory_id,
                "inventory_name": row.inventory_name,
                "owner_user_id": row.owner_user_id,
                "share_code": row.share_code
            }
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"create inventory failed: {e}")


# Join room: Verify using the share_code and add members. (legacy; currently unused by FE)
@app.post("/inventories/{inventory_id}/join")
async def join_inventory(inventory_id: str, body: JoinInventoryIn):
    async with SessionLocal() as db:
        chk = await db.execute(text(
            "SELECT share_code FROM inventories WHERE inventory_id=:iid"
        ), {"iid": inventory_id})
        row = chk.first()
        if not row:
            raise HTTPException(404, "inventory not found")
        if row.share_code != body.share_code:
            raise HTTPException(400, "invalid share code")
        try:
            ins = text("""
                INSERT INTO inventory_members(inventory_id, user_id, role)
                VALUES (:iid, :uid, 'member')
                ON CONFLICT DO NOTHING
            """)
            await db.execute(ins, {"iid": inventory_id, "uid": body.user_id})
            await db.commit()
            return {"ok": True}
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"join failed: {e}")

@app.post("/inventories/join/by-login-code")
async def join_inventory_by_login_code(body: JoinByLoginCodeIn):
    async with SessionLocal() as db:
        # resolve user_id from login_code
        u = (await db.execute(text("""
            SELECT user_id FROM users WHERE login_code = :code LIMIT 1
        """), {"code": body.login_code})).first()
        if not u:
            raise HTTPException(404, "invalid login code")
        # check inventory exists
        chk = await db.execute(text(
            "SELECT 1 FROM inventories WHERE inventory_id=:iid"
        ), {"iid": body.inventory_id})
        if not chk.first():
            raise HTTPException(404, "inventory not found")

        try:
            ins = text("""
                INSERT INTO inventory_members(inventory_id, user_id, role)
                VALUES (:iid, :uid, 'member')
                ON CONFLICT DO NOTHING
            """)
            await db.execute(ins, {"iid": body.inventory_id, "uid": u.user_id})
            await db.commit()
            return {"ok": True}
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"join by login_code failed: {e}")            

# Query the room a user is in (for displaying room name & code on the frontend)
@app.get("/inventories/by-user")
async def get_user_inventory(user_id: str = Query(...)):
    async with SessionLocal() as db:
        sql = text("""
            SELECT inv.inventory_id, inv.inventory_name, inv.owner_user_id, inv.share_code,
                   m.role, m.joined_at
            FROM inventory_members m
            JOIN inventories inv ON inv.inventory_id = m.inventory_id
            WHERE m.user_id = :uid
            LIMIT 1
        """)
        res = await db.execute(sql, {"uid": user_id})
        row = res.first()
        if not row:
            return None
        return {
            "inventory_id": row.inventory_id,
            "inventory_name": row.inventory_name,
            "owner_user_id": row.owner_user_id,
            "share_code": row.share_code,
            "role": row.role,
            "joined_at": row.joined_at
        }



# Add new food entries (non-members will be rejected by triggers in your database)
@app.post("/items")
async def create_item(body: CreateItemIn):
    async with SessionLocal() as db:
        try:
            q = text("""
                 INSERT INTO inventory_items(inventory_id, grocery_id, quantity,
                                             purchased_at, actual_expiry, created_by)
                 VALUES (:inv, :gid, :qty, :pdate, :edate, :creator)
                 ON CONFLICT (inventory_id, grocery_id, purchased_at)
                 DO UPDATE SET
                     quantity      = inventory_items.quantity + EXCLUDED.quantity,
                actual_expiry = COALESCE(EXCLUDED.actual_expiry, inventory_items.actual_expiry),
                updated_at    = now()
                RETURNING item_id, inventory_id, grocery_id, quantity,
              purchased_at, actual_expiry, created_by, created_at, updated_at
             """)

            res = await db.execute(q, {
                "inv": body.inventory_id,
                "gid": body.grocery_id,
                "qty": body.quantity,
                "pdate": body.purchased_at,
                "edate": body.actual_expiry,
                "creator": body.created_by
            })
            await db.commit()
            row = res.first()
            return {
                "item_id": row.item_id,
                "inventory_id": row.inventory_id,
                "grocery_id": row.grocery_id,
                "quantity": float(row.quantity),
                "purchased_at": row.purchased_at,
                "actual_expiry": row.actual_expiry,
                "created_by": row.created_by,
                "created_at": row.created_at,
                "updated_at": row.updated_at
            }
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"create item failed: {e}")

# View food lists by room (with item names for front-end display)
@app.get("/items")
async def list_items(inventory_id: str = Query(...), limit: int = Query(200, ge=1, le=500)):
    async with SessionLocal() as db:
        sql = text("""
            SELECT i.item_id, i.inventory_id, i.grocery_id, i.quantity,
                   i.purchased_at, i.actual_expiry, i.created_by,
                   i.created_at, i.updated_at,
                   g.name AS grocery_name,
                   g.category_id,
                   c.category_name
            FROM inventory_items i
            JOIN groceries g ON g.grocery_id = i.grocery_id
            JOIN categories c ON c.category_id = g.category_id
            WHERE i.inventory_id = :inv
            ORDER BY i.updated_at DESC
            LIMIT :limit
        """)
        res = await db.execute(sql, {"inv": inventory_id, "limit": limit})
        rows = res.fetchall()
        return [
            {
                "item_id": r.item_id,
                "inventory_id": r.inventory_id,
                "grocery_id": r.grocery_id,
                "grocery_name": r.grocery_name,
                "category_id": r.category_id,
                "category_name": r.category_name,
                "quantity": float(r.quantity),
                "purchased_at": r.purchased_at,
                "actual_expiry": r.actual_expiry,
                "created_by": r.created_by,
                "created_at": r.created_at,
                "updated_at": r.updated_at
            } for r in rows
        ]



# 2.1 Retrieve user by login_code 
@app.get("/users/by-login-code")
async def get_user_by_login_code(login_code: str = Query(..., min_length=4, max_length=16)):
    async with SessionLocal() as db:
        q = text("""
            SELECT user_id, display_name, login_code
            FROM users
            WHERE login_code = :code
            LIMIT 1
        """)
        res = await db.execute(q, {"code": login_code})
        row = res.first()
        if not row:
            raise HTTPException(404, "invalid login code")
        return {
            "user_id": row.user_id,
            "display_name": row.display_name,
            "login_code": row.login_code
        }

# 2.2 Directly search for rooms using the login_code
@app.get("/inventories/by-login-code")
async def get_inventory_by_login_code(login_code: str = Query(..., min_length=4, max_length=16)):
    async with SessionLocal() as db:
        sql = text("""
            WITH u AS (
              SELECT user_id FROM users WHERE login_code = :code
            )
            SELECT inv.inventory_id, inv.inventory_name, inv.owner_user_id, inv.share_code,
                   m.role, m.joined_at
            FROM inventory_members m
            JOIN inventories inv ON inv.inventory_id = m.inventory_id
            JOIN u ON u.user_id = m.user_id
            LIMIT 1
        """)
        res = await db.execute(sql, {"code": login_code})
        row = res.first()
        if not row:
            # If not found, return None to keep consistency with /inventories/by-user
            return None
        return {
            "inventory_id": row.inventory_id,
            "inventory_name": row.inventory_name,
            "owner_user_id": row.owner_user_id,
            "share_code": row.share_code,
            "role": row.role,
            "joined_at": row.joined_at
        }

# --------- NEW: endpoints that operate purely by users.login_code ---------

# Get inventory (minimal payload) via login_code (does not expose share_code)
@app.get("/inventories/by-login-code/min")
async def get_inventory_by_login_code_min(login_code: str = Query(..., min_length=4, max_length=16)):
    async with SessionLocal() as db:
        sql = text("""
            WITH u AS (SELECT user_id FROM users WHERE login_code = :code)
            SELECT inv.inventory_id, inv.inventory_name, inv.owner_user_id, m.role, m.joined_at
            FROM inventory_members m
            JOIN inventories inv ON inv.inventory_id = m.inventory_id
            JOIN u ON u.user_id = m.user_id
            LIMIT 1
        """)
        res = await db.execute(sql, {"code": login_code})
        row = res.first()
        if not row:
            return None
        return {
            "inventory_id": row.inventory_id,
            "inventory_name": row.inventory_name,
            "owner_user_id": row.owner_user_id,
            "role": row.role,
            "joined_at": row.joined_at
        }

# List members by login_code (read-only)
@app.get("/inventories/members/by-login-code")
async def list_members_by_login_code(login_code: str = Query(..., min_length=4, max_length=16)):
    async with SessionLocal() as db:
        # resolve inventory
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, login_code)

        rows = (await db.execute(text("""
            SELECT m.user_id, u.display_name, m.role, m.joined_at
            FROM inventory_members m
            JOIN users u ON u.user_id = m.user_id
            WHERE m.inventory_id = :iid
            ORDER BY m.joined_at ASC
        """), {"iid": inv_id})).fetchall()

        return [{"user_id": r.user_id, "display_name": r.display_name, "role": r.role, "joined_at": r.joined_at} for r in rows]

# List items by login_code (read-only)
@app.get("/items/by-login-code")
async def list_items_by_login_code(login_code: str = Query(...), limit: int = Query(200, ge=1, le=500)):
    async with SessionLocal() as db:
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, login_code)

        rows = (await db.execute(text("""
            SELECT i.item_id, i.inventory_id, i.grocery_id, i.quantity,
                   i.purchased_at, i.actual_expiry, i.created_by,
                   i.created_at, i.updated_at,
                   g.name AS grocery_name,
                   g.category_id,
                   c.category_name
            FROM inventory_items i
            JOIN groceries g ON g.grocery_id = i.grocery_id
            JOIN categories c ON c.category_id = g.category_id
            WHERE i.inventory_id = :iid
            ORDER BY i.updated_at DESC
            LIMIT :limit
        """), {"iid": inv_id, "limit": limit})).fetchall()

        return [{
            "item_id": r.item_id,
            "inventory_id": r.inventory_id,
            "grocery_id": r.grocery_id,
            "grocery_name": r.grocery_name,
            "category_id": r.category_id,
            "category_name": r.category_name,
            "quantity": float(r.quantity),
            "purchased_at": r.purchased_at,
            "actual_expiry": r.actual_expiry,
            "created_by": r.created_by,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        } for r in rows]


# Create item via login_code (actor inferred from code)
class CreateItemByLoginCodeIn(BaseModel):
    login_code: str
    grocery_id: int
    quantity: float = 1.0
    purchased_at: Optional[date] = None
    actual_expiry: Optional[date] = None

@app.post("/items/by-login-code")
async def create_item_by_login_code(body: CreateItemByLoginCodeIn):
    async with SessionLocal() as db:
        # resolve (user_id, inventory_id)
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, body.login_code)

        try:
            res = await db.execute(text("""
                INSERT INTO inventory_items(inventory_id, grocery_id, quantity, purchased_at, actual_expiry, created_by)
                VALUES (:inv, :gid, :qty, :pdate, :edate, :creator)
                ON CONFLICT (inventory_id, grocery_id, purchased_at)
                DO UPDATE SET
                    quantity      = inventory_items.quantity + EXCLUDED.quantity,
                    actual_expiry = COALESCE(EXCLUDED.actual_expiry, inventory_items.actual_expiry),
                    updated_at    = now()
                RETURNING item_id, inventory_id, grocery_id, quantity, purchased_at,
                          actual_expiry, created_by, created_at, updated_at
            """), {
                "inv": inv_id,
                "gid": body.grocery_id,
                "qty": body.quantity,
                "pdate": body.purchased_at,
                "edate": body.actual_expiry,
                "creator": u_id
            })

            await db.commit()
            r = res.first()
            return {
                "item_id": r.item_id,
                "inventory_id": r.inventory_id,
                "grocery_id": r.grocery_id,
                "quantity": float(r.quantity),
                "purchased_at": r.purchased_at,
                "actual_expiry": r.actual_expiry,
                "created_by": r.created_by,
                "created_at": r.created_at,
                "updated_at": r.updated_at
            }
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"create item failed: {e}")

# Mark an item as used via login_code (minimal implementation: set quantity to 0)
@app.patch("/items/{item_id}/consume")
async def consume_item_by_login_code(item_id: str, body: MarkConsumedIn):
    async with SessionLocal() as db:
        # resolve (user_id, inventory_id) to ensure the caller belongs to this inventory
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, body.login_code)

        try:
            res = await db.execute(text("""
                UPDATE inventory_items
                SET quantity = CASE WHEN :consumed THEN 0 ELSE quantity END,
                    updated_at = now()
                WHERE item_id = :item_id
                  AND inventory_id = :iid
                RETURNING item_id, quantity, updated_at
            """), {"consumed": body.consumed, "item_id": item_id, "iid": inv_id})
            row = res.first()
            if not row:
                raise HTTPException(404, "item not found in your inventory")
            await db.commit()
            return {"item_id": row.item_id, "quantity": float(row.quantity), "updated_at": row.updated_at}
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"update item failed: {e}")

# Optional: delete item via login_code
@app.delete("/items/{item_id}/by-login-code")
async def delete_item_by_login_code(item_id: str, login_code: str = Query(..., min_length=4, max_length=16)):
    async with SessionLocal() as db:
        # resolve (user_id, inventory_id)
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, login_code)
        try:
            res = await db.execute(text("""
                DELETE FROM inventory_items
                WHERE item_id = :item_id
                  AND inventory_id = :iid
                RETURNING item_id
            """), {"item_id": item_id, "iid": inv_id})
            row = res.first()
            if not row:
                raise HTTPException(404, "item not found in your inventory")
            await db.commit()
            return {"ok": True}
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"delete item failed: {e}")

# --------- end of login_code-based endpoints ---------


# List all categories
@app.get("/categories")
async def list_categories():
    async with SessionLocal() as db:
        res = await db.execute(text("""
            SELECT category_id, category_name
            FROM categories
            ORDER BY category_id
        """))
        rows = res.fetchall()
        return [{"category_id": r.category_id, "category_name": r.category_name} for r in rows]


# Search / Filter / Paginate Ingredients
@app.get("/groceries")
async def list_groceries(
    q: Optional[str] = Query(None, description="Perform a fuzzy search by name, case-insensitive"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    limit: int = Query(300, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    where = []
    params = {"limit": limit, "offset": offset}

    # Only add to the WHERE clause when "q" has a value
    if q:
        where.append("name ILIKE :q")
        params["q"] = f"%{q}%"

    if category_id is not None:
        where.append("category_id = :cid")
        params["cid"] = category_id

    sql = """
    SELECT
      grocery_id, product_id, name, category_id,
      dop_pantry_max, dop_pantry_metric,
      dop_refrigerate_max, dop_refrigerate_metric,
      dop_freeze_max, dop_freeze_metric,
      created_at
    FROM groceries
    """

    if where:
        sql += " WHERE " + " AND ".join(where)

    sql += " ORDER BY name LIMIT :limit OFFSET :offset"

    async with SessionLocal() as db:
        res = await db.execute(text(sql), params)
        rows = res.fetchall()
        return [
            {
                "grocery_id": r.grocery_id,
                "product_id": r.product_id,
                "name": r.name,
                "category_id": r.category_id,
                "dop_pantry_max": r.dop_pantry_max,
                "dop_pantry_metric": r.dop_pantry_metric,
                "dop_refrigerate_max": r.dop_refrigerate_max,
                "dop_refrigerate_metric": r.dop_refrigerate_metric,
                "dop_freeze_max": r.dop_freeze_max,
                "dop_freeze_metric": r.dop_freeze_metric,
                "created_at": r.created_at
            }
            for r in rows
        ]


# Retrieve Details for a Single Ingredient
@app.get("/groceries/{grocery_id}")
async def get_grocery(grocery_id: int):
    async with SessionLocal() as db:
        res = await db.execute(text("""
            SELECT
              grocery_id, product_id, name, category_id,
              dop_pantry_max, dop_pantry_metric,
              dop_refrigerate_max, dop_refrigerate_metric,
              dop_freeze_max, dop_freeze_metric,
              created_at
            FROM groceries
            WHERE grocery_id = :gid
        """), {"gid": grocery_id})
        row = res.first()
        if not row:
            raise HTTPException(404, "grocery not found")
        return {
            "grocery_id": row.grocery_id,
            "product_id": row.product_id,
            "name": row.name,
            "category_id": row.category_id,
            "dop_pantry_max": row.dop_pantry_max,
            "dop_pantry_metric": row.dop_pantry_metric,
            "dop_refrigerate_max": row.dop_refrigerate_max,
            "dop_refrigerate_metric": row.dop_refrigerate_metric,
            "dop_freeze_max": row.dop_freeze_max,
            "dop_freeze_metric": row.dop_freeze_metric,
            "created_at": row.created_at,
        }
