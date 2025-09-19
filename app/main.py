# app/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel, Field
from datetime import date
import secrets
import os

# ---------------------- Database engine & FastAPI app ----------------------

# postgresql+asyncpg connection string
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://admin:admin1@localhost:5432/UseItUpDB"  
)

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

app = FastAPI(title="UseItUp Minimal API", version="0.3.0")

# CORS (adjust origins as needed)
origins = [
    "https://tp23.me",
    "https://api.tp23.me",
    "https://www.tp23.me",
    "http://localhost:3000",
    "https://iteration2.d5qwi0lc6ldyd.amplifyapp.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------- Schemas ----------------------

class CreateInventoryIn(BaseModel):
    inventory_name: str = Field(..., min_length=1, max_length=120)
    owner_user_id: str = Field(..., min_length=1, max_length=120)

class JoinInventoryIn(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=120)
    share_code: str = Field(..., min_length=4, max_length=16)

class JoinByLoginCodeIn(BaseModel):
    login_code: str = Field(..., min_length=4, max_length=16)
    inventory_id: str = Field(..., min_length=1)

class CreateUserIn(BaseModel):
    display_name: str

class CreateItemByLoginCodeIn(BaseModel):
    login_code: str
    grocery_id: int
    quantity: float = 1.0
    purchased_at: Optional[date] = None
    actual_expiry: Optional[date] = None

class UpdateItemByLoginCodeIn(BaseModel):
    login_code: str
    # partial update fields (all optional)
    quantity: Optional[float] = None
    purchased_at: Optional[date] = None
    actual_expiry: Optional[date] = None

# ---------------------- Helpers ----------------------

def gen_share_code(n: int = 8) -> str:
    """Generate a human-friendly invite/share code (no confusing chars)."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(n))

def _http404(msg: str):
    raise HTTPException(404, msg)

async def _resolve_user_and_inventory_by_login_code(db: AsyncSession, login_code: str):
    """
    Resolve (user_id, inventory_id) from a user's login_code.
    Assumption: a user belongs to at most one inventory (enforced by uq_member_single_room).
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
        # User exists but isn't in any inventory yet
        raise HTTPException(403, "user is not in any inventory")

    return u.user_id, inv.inventory_id

# ---------------------- Health ----------------------

@app.get("/")
def root():
    return {"ok": True, "try": ["/health", "/docs"]}

@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------------- Users ----------------------

@app.post("/users/create")
async def create_user(body: CreateUserIn):
    """
    Create a user and generate a 6-char login_code (used by the FE to identify the actor).
    """
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

# ---------------------- Inventories ----------------------

@app.post("/inventories/create")
async def create_inventory(body: CreateInventoryIn):
    """
    Create an inventory (room). DB trigger also inserts owner as a member,
    but we do an idempotent insert here for safety.
    """
    share_code = gen_share_code(8)
    async with SessionLocal() as db:
        try:
            res = await db.execute(text("""
                INSERT INTO inventories(inventory_name, owner_user_id, share_code)
                VALUES (:name, :owner, :scode)
                RETURNING inventory_id, inventory_name, owner_user_id, share_code
            """), {"name": body.inventory_name, "owner": body.owner_user_id, "scode": share_code})
            row = res.first()

            # Idempotent: ensure the owner is a member with role 'owner'
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

@app.post("/inventories/{inventory_id}/join")
async def join_inventory(inventory_id: str, body: JoinInventoryIn):
    """
    Join by share_code (legacy flow; FE may not use it now).
    """
    async with SessionLocal() as db:
        chk = await db.execute(text("SELECT share_code FROM inventories WHERE inventory_id=:iid"),
                               {"iid": inventory_id})
        row = chk.first()
        if not row:
            raise HTTPException(404, "inventory not found")
        if row.share_code != body.share_code:
            raise HTTPException(400, "invalid share code")

        # Detect whether the upper limit has been reached
        pre = await db.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM inventory_members
            WHERE inventory_id = :iid
              AND role IS DISTINCT FROM 'owner'
        """), {"iid": inventory_id})
        if pre.scalar_one() >= 3:
            # full
            raise HTTPException(409, "household is full: max 3 shared members")

        try:
            await db.execute(text("""
                INSERT INTO inventory_members(inventory_id, user_id, role)
                VALUES (:iid, :uid, 'member')
                ON CONFLICT DO NOTHING
            """), {"iid": inventory_id, "uid": body.user_id})
            await db.commit()
            return {"ok": True}
        except Exception as e:
            await db.rollback()
            if "non-owner members" in str(e):
                raise HTTPException(409, "household is full: max 3 shared members")
            raise HTTPException(400, f"join failed: {e}")

@app.post("/inventories/join/by-login-code")
async def join_inventory_by_login_code(body: JoinByLoginCodeIn):
    """
    Join a specific inventory using the caller's login_code.
    """
    async with SessionLocal() as db:
        u = (await db.execute(text("""
            SELECT user_id FROM users WHERE login_code = :code LIMIT 1
        """), {"code": body.login_code})).first()
        if not u:
            raise HTTPException(404, "invalid login code")

        exists = await db.execute(text("SELECT 1 FROM inventories WHERE inventory_id=:iid"),
                                  {"iid": body.inventory_id})
        if not exists.first():
            raise HTTPException(404, "inventory not found")

        # Detect whether the upper limit has been reached
        pre = await db.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM inventory_members
            WHERE inventory_id = :iid
              AND role IS DISTINCT FROM 'owner'
        """), {"iid": body.inventory_id})
        if pre.scalar_one() >= 3:
            raise HTTPException(409, "household is full: max 3 shared members")

        try:
            await db.execute(text("""
                INSERT INTO inventory_members(inventory_id, user_id, role)
                VALUES (:iid, :uid, 'member')
                ON CONFLICT DO NOTHING
            """), {"iid": body.inventory_id, "uid": u.user_id})
            await db.commit()
            return {"ok": True}
        except Exception as e:
            await db.rollback()
            if "non-owner members" in str(e):
                raise HTTPException(409, "household is full: max 3 shared members")
            raise HTTPException(400, f"join by login_code failed: {e}")

@app.get("/inventories/by-user")
async def get_user_inventory(user_id: str = Query(...)):
    """
    Get the inventory a user belongs to (for header display: name/code/role).
    """
    async with SessionLocal() as db:
        res = await db.execute(text("""
            SELECT inv.inventory_id, inv.inventory_name, inv.owner_user_id, inv.share_code,
                   m.role, m.joined_at
            FROM inventory_members m
            JOIN inventories inv ON inv.inventory_id = m.inventory_id
            WHERE m.user_id = :uid
            LIMIT 1
        """), {"uid": user_id})
        row = res.first()
        if not row:
            return None

        # Remaining spots
        cnt = (await db.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM inventory_members
            WHERE inventory_id = :iid
              AND role IS DISTINCT FROM 'owner'
        """), {"iid": row.inventory_id})).scalar_one()

        return {
            "inventory_id": row.inventory_id,
            "inventory_name": row.inventory_name,
            "owner_user_id": row.owner_user_id,
            "share_code": row.share_code,
            "role": row.role,
            "joined_at": row.joined_at,
            "member_count_non_owner": cnt,
            "remaining_slots": max(0, 3 - cnt)
        }

# ---------------------- Items ----------------------

@app.get("/items")
async def list_items(inventory_id: str = Query(...), limit: int = Query(200, ge=1, le=500)):
    """
    List items in an inventory (sorted by updated_at DESC so FE sees freshest first).
    """
    async with SessionLocal() as db:
        res = await db.execute(text("""
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
        """), {"inv": inventory_id, "limit": limit})
        rows = res.fetchall()
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

@app.get("/items/by-login-code")
async def list_items_by_login_code(login_code: str = Query(...), limit: int = Query(200, ge=1, le=500)):
    """
    List items for the inventory the login_code belongs to (read-only).
    """
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

@app.post("/items/by-login-code")
async def create_item_by_login_code(body: CreateItemByLoginCodeIn):
    """
    Create an item using the caller's login_code.
    IMPORTANT: call public.set_actor(uid) before writing so the DB trigger
    (check_member_can_write) knows who the actor is, validates membership,
    and writes created_by automatically.
    """
    async with SessionLocal() as db:
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, body.login_code)
        try:
            # Set the session actor for this transaction
            await db.execute(text("SELECT public.set_actor(:uid)"), {"uid": u_id})

            # Do NOT send created_by here; the trigger will fill it
            ins = await db.execute(text("""
                INSERT INTO inventory_items(
                    inventory_id, grocery_id, quantity, purchased_at, actual_expiry
                )
                VALUES (
                    :inv, :gid, :qty,
                    COALESCE(:pdate, CURRENT_DATE),
                    :edate
                )
                RETURNING item_id
            """), {
                "inv": inv_id,
                "gid": body.grocery_id,
                "qty": body.quantity,
                "pdate": body.purchased_at,
                "edate": body.actual_expiry
            })
            new_id = ins.first().item_id
            await db.commit()  # trigger runs within this transaction

            # Fetch the inserted row and a fresh list for FE (sorted by updated_at DESC)
            async with SessionLocal() as db2:
                row = (await db2.execute(text("""
                    SELECT i.item_id, i.inventory_id, i.grocery_id, i.quantity,
                           i.purchased_at, i.actual_expiry, i.created_by,
                           i.created_at, i.updated_at,
                           g.name AS grocery_name,
                           g.category_id,
                           c.category_name
                    FROM inventory_items i
                    JOIN groceries g ON g.grocery_id = i.grocery_id
                    JOIN categories c ON c.category_id = g.category_id
                    WHERE i.item_id = :id
                """), {"id": new_id})).first()

                inserted_full = {
                    "item_id": row.item_id,
                    "inventory_id": row.inventory_id,
                    "grocery_id": row.grocery_id,
                    "grocery_name": row.grocery_name,
                    "category_id": row.category_id,
                    "category_name": row.category_name,
                    "quantity": float(row.quantity),
                    "purchased_at": row.purchased_at,
                    "actual_expiry": row.actual_expiry,
                    "created_by": row.created_by,
                    "created_at": row.created_at,
                    "updated_at": row.updated_at
                }

                rows = (await db2.execute(text("""
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
                """), {"iid": inv_id, "limit": 200})).fetchall()

                items = [{
                    "item_id": x.item_id,
                    "inventory_id": x.inventory_id,
                    "grocery_id": x.grocery_id,
                    "grocery_name": x.grocery_name,
                    "category_id": x.category_id,
                    "category_name": x.category_name,
                    "quantity": float(x.quantity),
                    "purchased_at": x.purchased_at,
                    "actual_expiry": x.actual_expiry,
                    "created_by": x.created_by,
                    "created_at": x.created_at,
                    "updated_at": x.updated_at
                } for x in rows]

                return {"inserted": inserted_full, "items": items}

        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"create item failed: {e}")

@app.patch("/items/{item_id}/by-login-code")
async def update_item_by_login_code(item_id: str, body: UpdateItemByLoginCodeIn):
    """
    Partially update an item (quantity / purchased_at / actual_expiry).
    IMPORTANT: set actor before UPDATE so the trigger can validate the writer.
    """
    async with SessionLocal() as db:
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, body.login_code)
        try:
            await db.execute(text("SELECT public.set_actor(:uid)"), {"uid": u_id})

            # If nothing to change, skip
            if body.quantity is None and body.purchased_at is None and body.actual_expiry is None:
                return {"ok": True, "no_change": True}

            await db.execute(text("""
                UPDATE inventory_items
                   SET quantity      = COALESCE(:qty, quantity),
                       purchased_at  = COALESCE(:pdate, purchased_at),
                       actual_expiry = COALESCE(:edate, actual_expiry)
                 WHERE item_id = :id
                   AND inventory_id = :iid
            """), {
                "qty": body.quantity,
                "pdate": body.purchased_at,
                "edate": body.actual_expiry,
                "id": item_id,
                "iid": inv_id
            })

            await db.commit()
            return {"ok": True}
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"update item failed: {e}")

@app.delete("/items/{item_id}/by-login-code")
async def delete_item_by_login_code(item_id: str, login_code: str = Query(..., min_length=4, max_length=16)):
    """
    Delete an item belonging to the caller's inventory.
    (We set actor for consistency; current delete path doesn't use the trigger.)
    """
    async with SessionLocal() as db:
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, login_code)
        await db.execute(text("SELECT public.set_actor(:uid)"), {"uid": u_id})
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

# ---------------------- Lookups ----------------------

@app.get("/users/by-login-code")
async def get_user_by_login_code(login_code: str = Query(..., min_length=4, max_length=16)):
    """Resolve the user from a login_code."""
    async with SessionLocal() as db:
        res = await db.execute(text("""
            SELECT user_id, display_name, login_code
            FROM users
            WHERE login_code = :code
            LIMIT 1
        """), {"code": login_code})
        row = res.first()
        if not row:
            raise HTTPException(404, "invalid login code")
        return {"user_id": row.user_id, "display_name": row.display_name, "login_code": row.login_code}

@app.get("/inventories/by-login-code")
async def get_inventory_by_login_code(login_code: str = Query(..., min_length=4, max_length=16)):
    """Get full inventory info (includes share_code) for a login_code."""
    async with SessionLocal() as db:
        res = await db.execute(text("""
            WITH u AS (SELECT user_id FROM users WHERE login_code = :code)
            SELECT inv.inventory_id, inv.inventory_name, inv.owner_user_id, inv.share_code,
                   m.role, m.joined_at
            FROM inventory_members m
            JOIN inventories inv ON inv.inventory_id = m.inventory_id
            JOIN u ON u.user_id = m.user_id
            LIMIT 1
        """), {"code": login_code})
        row = res.first()
        if not row:
            return None
        # Remaining spots
        cnt = (await db.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM inventory_members
            WHERE inventory_id = :iid
              AND role IS DISTINCT FROM 'owner'
        """), {"iid": row.inventory_id})).scalar_one()

        return {
            "inventory_id": row.inventory_id,
            "inventory_name": row.inventory_name,
            "owner_user_id": row.owner_user_id,
            "share_code": row.share_code,
            "role": row.role,
            "joined_at": row.joined_at,
            "member_count_non_owner": cnt,
            "remaining_slots": max(0, 3 - cnt)
        }

@app.get("/inventories/by-login-code/min")
async def get_inventory_by_login_code_min(login_code: str = Query(..., min_length=4, max_length=16)):
    """Minimal inventory info for a login_code (does NOT expose share_code)."""
    async with SessionLocal() as db:
        res = await db.execute(text("""
            WITH u AS (SELECT user_id FROM users WHERE login_code = :code)
            SELECT inv.inventory_id, inv.inventory_name, inv.owner_user_id, m.role, m.joined_at
            FROM inventory_members m
            JOIN inventories inv ON inv.inventory_id = m.inventory_id
            JOIN u ON u.user_id = m.user_id
            LIMIT 1
        """), {"code": login_code})
        row = res.first()
        if not row:
            return None

        # Remaining spots
        cnt = (await db.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM inventory_members
            WHERE inventory_id = :iid
              AND role IS DISTINCT FROM 'owner'
        """), {"iid": row.inventory_id})).scalar_one()

        return {
            "inventory_id": row.inventory_id,
            "inventory_name": row.inventory_name,
            "owner_user_id": row.owner_user_id,
            "role": row.role,
            "joined_at": row.joined_at,
            "member_count_non_owner": cnt,
            "remaining_slots": max(0, 3 - cnt)
        }

@app.get("/inventories/members/by-login-code")
async def list_members_by_login_code(
    login_code: str = Query(..., min_length=4, max_length=16),
):
    async with SessionLocal() as db:
        # Resolve (user_id, inventory_id); returns 403 if user not in any inventory
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, login_code)

        # Fetch members
        rows = (await db.execute(text("""
            SELECT
              u.user_id,
              u.display_name,
              m.role,
              m.joined_at,
              (m.user_id = inv.owner_user_id) AS is_owner
            FROM inventory_members m
            JOIN users u        ON u.user_id = m.user_id
            JOIN inventories inv ON inv.inventory_id = m.inventory_id
            WHERE m.inventory_id = :iid
            ORDER BY (m.user_id = inv.owner_user_id) DESC, m.joined_at ASC
        """), {"iid": inv_id})).fetchall()

        # Current non-owner count and remaining slots (cap = 3)
        cnt_non_owner = (await db.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM inventory_members
            WHERE inventory_id = :iid
              AND role IS DISTINCT FROM 'owner'
        """), {"iid": inv_id})).scalar_one()

        return {
            "inventory_id": inv_id,
            "member_count": len(rows),
            "member_count_non_owner": cnt_non_owner,
            "remaining_slots": max(0, 3 - cnt_non_owner),
            "members": [{
                "user_id": r.user_id,
                "display_name": r.display_name,
                "role": r.role,
                "joined_at": r.joined_at,
                "is_owner": bool(r.is_owner)
            } for r in rows]
        }


# ---------------------- Categories & Groceries ----------------------

@app.get("/categories")
async def list_categories():
    """Minimal categories listing for dropdowns."""
    async with SessionLocal() as db:
        rows = (await db.execute(text("""
            SELECT category_id, category_name
            FROM categories
            ORDER BY category_id
        """))).fetchall()
        return [{"category_id": r.category_id, "category_name": r.category_name} for r in rows]

@app.get("/categories/detail")
async def list_categories_detail():
    """Detailed categories (optional; remove if FE doesn't need these fields)."""
    async with SessionLocal() as db:
        rows = (await db.execute(text("""
            SELECT
              category_id, category_name,
              avg_pantry_days, pantry_product_count,
              avg_refrigerate_days, refrigerate_product_count,
              avg_freeze_days, freeze_product_count,
              co2_factor_kg, co2_method, co2_confidence,
              price, product_size, unit
            FROM categories
            ORDER BY category_id
        """))).fetchall()
        return [{
            "category_id": r.category_id,
            "category_name": r.category_name,
            "avg_pantry_days": r.avg_pantry_days,
            "pantry_product_count": r.pantry_product_count,
            "avg_refrigerate_days": r.avg_refrigerate_days,
            "refrigerate_product_count": r.refrigerate_product_count,
            "avg_freeze_days": r.avg_freeze_days,
            "freeze_product_count": r.freeze_product_count,
            "co2_factor_kg": r.co2_factor_kg,
            "co2_method": r.co2_method,
            "co2_confidence": r.co2_confidence,
            "price": r.price,
            "product_size": r.product_size,
            "unit": r.unit
        } for r in rows]

@app.get("/groceries")
async def list_groceries(
    q: Optional[str] = Query(None, description="Case-insensitive name search"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    limit: int = Query(300, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """
    Search / filter / paginate the master groceries list.
    Includes the new columns: price, product_size, unit.
    """
    where = []
    params = {"limit": limit, "offset": offset}

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
      price, product_size, unit,
      created_at
    FROM groceries
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY name LIMIT :limit OFFSET :offset"

    async with SessionLocal() as db:
        rows = (await db.execute(text(sql), params)).fetchall()
        return [{
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
            "price": r.price,
            "product_size": r.product_size,
            "unit": r.unit,
            "created_at": r.created_at
        } for r in rows]

@app.get("/groceries/{grocery_id}")
async def get_grocery(grocery_id: int):
    """Get a single grocery record with all key fields."""
    async with SessionLocal() as db:
        row = (await db.execute(text("""
            SELECT
              grocery_id, product_id, name, category_id,
              dop_pantry_max, dop_pantry_metric,
              dop_refrigerate_max, dop_refrigerate_metric,
              dop_freeze_max, dop_freeze_metric,
              price, product_size, unit,
              created_at
            FROM groceries
            WHERE grocery_id = :gid
        """), {"gid": grocery_id})).first()
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
            "price": row.price,
            "product_size": row.product_size,
            "unit": row.unit,
            "created_at": row.created_at
        }
