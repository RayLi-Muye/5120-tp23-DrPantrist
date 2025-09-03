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

# postgresql+asyncpg
DATABASE_URL = "postgresql+asyncpg://admin:admin1@127.0.0.1:5432/UseItUpDB"

class CreateInventoryIn(BaseModel):
    inventory_name: str = Field(..., min_length=1, max_length=120)
    owner_user_id: str = Field(..., min_length=1, max_length=120)

class JoinInventoryIn(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=120)
    share_code: str = Field(..., min_length=4, max_length=16)

class CreateItemIn(BaseModel):
    inventory_id: str = Field(..., min_length=1)
    grocery_id: int
    created_by: str = Field(..., min_length=1, max_length=120)
    quantity: float = 1.0
    # "YYYY-MM-DD"；
    purchased_at: Optional[date] = None
    actual_expiry: Optional[date] = None


class CreateUserIn(BaseModel):
    display_name: str

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

app = FastAPI(title="UseItUp Minimal API", version="0.2.0")

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "https://tp23.me",       
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
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(n))

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


# Join room: Verify using the share_code and add members.
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
                RETURNING item_id, inventory_id, grocery_id, quantity, purchased_at,
                          actual_expiry, created_by, created_at, updated_at
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
                   g.name AS grocery_name
            FROM inventory_items i
            JOIN groceries g ON g.grocery_id = i.grocery_id
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
                "quantity": float(r.quantity),
                "purchased_at": r.purchased_at,
                "actual_expiry": r.actual_expiry,
                "created_by": r.created_by,
                "created_at": r.created_at,
                "updated_at": r.updated_at
            } for r in rows
        ]

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
    q: Optional[str] = Query(None, description="按名称模糊搜索，不区分大小写"),
    category_id: Optional[int] = Query(None, description="按分类过滤"),
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
