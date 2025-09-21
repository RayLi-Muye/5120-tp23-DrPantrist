# app/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from typing import Optional, Literal
from pydantic import BaseModel, Field
from datetime import date
import secrets
import os

# ---------------------- Database engine & FastAPI app ----------------------

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://admin:admin1@localhost:5432/UseItUpDB",
)

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

app = FastAPI(title="UseItUp API", version="0.7.1")

# CORS
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
    display_name: str = Field(..., min_length=1, max_length=120)
    inventory_name: str = Field(..., min_length=1, max_length=120)

class JoinByLoginCodeIn(BaseModel):
    login_code: str = Field(..., min_length=4, max_length=4)
    inventory_id: str = Field(..., min_length=1)

class CreateUserIn(BaseModel):
    display_name: str

class CreateItemByLoginCodeIn(BaseModel):
    login_code: str = Field(..., min_length=4, max_length=4)
    grocery_id: int
    quantity: float = 1.0
    purchased_at: Optional[date] = None
    actual_expiry: Optional[date] = None
    visibility: Literal["shared", "private"] = "shared"
    profile_id: Optional[str] = None
    profile_position: Optional[int] = Field(None, ge=1, le=3)

class UpdateItemByLoginCodeIn(BaseModel):
    login_code: str = Field(..., min_length=4, max_length=4)
    quantity: Optional[float] = None
    purchased_at: Optional[date] = None
    actual_expiry: Optional[date] = None

class LeaveInventoryIn(BaseModel):
    login_code: str = Field(..., min_length=4, max_length=4)
    inventory_id: str = Field(..., min_length=1)
    successor_user_id: Optional[str] = None
    delete_if_last: bool = True

class TransferOwnershipIn(BaseModel):
    login_code: str = Field(..., min_length=4, max_length=4)
    inventory_id: str = Field(..., min_length=1)
    new_owner_user_id: str = Field(..., min_length=1)

class AddOrRenameProfileIn(BaseModel):
    login_code: str = Field(..., min_length=4, max_length=4)  # must be current owner's code
    profile_name: str = Field(..., min_length=1, max_length=60)
    position: Optional[int] = Field(None, ge=1, le=3)         # auto-pick if omitted

# ---------------------- Helpers ----------------------

def gen_login_code() -> str:
    """Generate AB12 pattern: two letters + two digits."""
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    return f"{secrets.choice(letters)}{secrets.choice(letters)}{secrets.randbelow(100):02d}"

def _http404(msg: str):
    raise HTTPException(404, msg)

async def _resolve_user_and_inventory_by_login_code(db: AsyncSession, login_code: str):
    """Return (user_id, inventory_id) from a login_code. Requires the user to be in an inventory."""
    u = (await db.execute(
        text("SELECT user_id FROM users WHERE login_code = :code LIMIT 1"),
        {"code": login_code},
    )).first()
    if not u:
        _http404("invalid login code")

    inv = (await db.execute(
        text(
            "SELECT m.inventory_id FROM inventory_members m "
            "WHERE m.user_id = :uid LIMIT 1"
        ),
        {"uid": u.user_id},
    )).first()
    if not inv:
        raise HTTPException(403, "user is not in any inventory")

    return u.user_id, inv.inventory_id

async def _get_owner_user_id(db: AsyncSession, inventory_id: str):
    row = (await db.execute(
        text("SELECT owner_user_id FROM inventories WHERE inventory_id=:iid"),
        {"iid": inventory_id},
    )).first()
    if not row:
        _http404("inventory not found")
    return row.owner_user_id

async def _require_owner_by_login_code(db: AsyncSession, login_code: str, inventory_id: str):
    uid = (await db.execute(
        text("SELECT user_id FROM users WHERE login_code=:c LIMIT 1"),
        {"c": login_code},
    )).scalar_one_or_none()
    if not uid:
        _http404("invalid login code")
    owner_id = await _get_owner_user_id(db, inventory_id)
    if str(uid) != str(owner_id):
        raise HTTPException(403, "owner permission required")
    return uid

async def _resolve_profile_id(
    db: AsyncSession,
    inventory_id: str,
    profile_id: Optional[str],
    profile_position: Optional[int],
):
    """Resolve profile_id from explicit id or position (1..3). Return None if neither provided."""
    if profile_id:
        ok = (await db.execute(
            text(
                "SELECT profile_id FROM inventory_profiles "
                "WHERE inventory_id=:iid AND profile_id=:pid"
            ),
            {"iid": inventory_id, "pid": profile_id},
        )).first()
        if not ok:
            _http404("profile not found")
        return profile_id

    if profile_position is not None:
        pid = (await db.execute(
            text(
                "SELECT profile_id FROM inventory_profiles "
                "WHERE inventory_id=:iid AND position=:pos"
            ),
            {"iid": inventory_id, "pos": profile_position},
        )).scalar_one_or_none()
        if not pid:
            _http404("profile at given position not found")
        return pid

    return None

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
    """Create a user with a unique 4-char login_code."""
    async with SessionLocal() as db:
        for _ in range(20):  # simple retry for rare code collisions
            login_code = gen_login_code()
            try:
                res = await db.execute(
                    text(
                        "INSERT INTO users(display_name, login_code) "
                        "VALUES (:name, :code) "
                        "RETURNING user_id, display_name, login_code"
                    ),
                    {"name": body.display_name, "code": login_code},
                )
                await db.commit()
                row = res.first()
                return {
                    "user_id": row.user_id,
                    "display_name": row.display_name,
                    "login_code": row.login_code,
                }
            except Exception as e:
                await db.rollback()
                if "unique" not in str(e).lower():
                    raise HTTPException(400, f"create user failed: {e}")
        raise HTTPException(500, "failed to generate unique login code")

# ---------------------- Inventories ----------------------

@app.post("/inventories/create")
async def create_inventory(body: CreateInventoryIn):
    """
    One-shot creation: create owner user + inventory.
    Inputs: display_name + inventory_name.
    Effects:
      - create user with unique login_code
      - create inventory (DB defaults inventory_type to 'shared')
      - ensure owner is a member (role='owner')
      - DB triggers create default profile at position=1
    Returns: { "user": {...}, "inventory": {...} }
    """
    async with SessionLocal() as db:
        # 1) create user
        user_row = None
        for _ in range(20):
            login_code = gen_login_code()
            try:
                user_row = (await db.execute(
                    text("""
                        INSERT INTO users(display_name, login_code)
                        VALUES (:name, :code)
                        RETURNING user_id, display_name, login_code
                    """),
                    {"name": body.display_name, "code": login_code},
                )).first()
                break
            except Exception as e:
                await db.rollback()
                if "unique" in str(e).lower():
                    continue
                raise HTTPException(400, f"create user failed: {e}")
        if not user_row:
            raise HTTPException(500, "failed to generate unique login code")

        # 2) create inventory (inventory_type uses DB default 'shared')
        try:
            inv_row = (await db.execute(
                text("""
                    INSERT INTO inventories(inventory_name, owner_user_id)
                    VALUES (:inv_name, :owner)
                    RETURNING inventory_id, inventory_name, owner_user_id, inventory_type
                """),
                {"inv_name": body.inventory_name, "owner": user_row.user_id},
            )).first()

            # idempotent: ensure owner is a member
            await db.execute(
                text("""
                    INSERT INTO inventory_members(inventory_id, user_id, role)
                    VALUES (:iid, :uid, 'owner')
                    ON CONFLICT DO NOTHING
                """),
                {"iid": inv_row.inventory_id, "uid": user_row.user_id},
            )

            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"create inventory failed: {e}")

        return {
            "user": {
                "user_id": user_row.user_id,
                "display_name": user_row.display_name,
                "login_code": user_row.login_code,
            },
            "inventory": {
                "inventory_id": inv_row.inventory_id,
                "inventory_name": inv_row.inventory_name,
                "owner_user_id": inv_row.owner_user_id,
                "inventory_type": inv_row.inventory_type,  # from DB default 'shared'
            },
        }


@app.post("/inventories/join/by-login-code")
async def join_inventory_by_login_code(body: JoinByLoginCodeIn):
    """Join an inventory by login_code. No member limit."""
    async with SessionLocal() as db:
        u = (await db.execute(
            text("SELECT user_id FROM users WHERE login_code = :code LIMIT 1"),
            {"code": body.login_code},
        )).first()
        if not u:
            raise HTTPException(404, "invalid login code")

        exists = await db.execute(
            text("SELECT 1 FROM inventories WHERE inventory_id=:iid"),
            {"iid": body.inventory_id},
        )
        if not exists.first():
            raise HTTPException(404, "inventory not found")

        try:
            await db.execute(
                text(
                    "INSERT INTO inventory_members(inventory_id, user_id, role) "
                    "VALUES (:iid, :uid, 'member') "
                    "ON CONFLICT DO NOTHING"
                ),
                {"iid": body.inventory_id, "uid": u.user_id},
            )
            await db.commit()
            return {"ok": True}
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"join by login_code failed: {e}")

# ---------------------- Profiles ----------------------

@app.get("/inventories/profiles/by-login-code")
async def list_profiles_by_login_code(login_code: str = Query(..., min_length=4, max_length=4)):
    async with SessionLocal() as db:
        _, inv_id = await _resolve_user_and_inventory_by_login_code(db, login_code)
        rows = (await db.execute(
            text(
                "SELECT profile_id, profile_name, position, created_at "
                "FROM inventory_profiles "
                "WHERE inventory_id=:iid "
                "ORDER BY position"
            ),
            {"iid": inv_id},
        )).fetchall()
        return {
            "inventory_id": inv_id,
            "profiles": [
                {
                    "profile_id": r.profile_id,
                    "profile_name": r.profile_name,
                    "position": r.position,
                    "created_at": r.created_at,
                }
                for r in rows
            ],
        }

@app.post("/inventories/profiles/add-or-rename")
async def add_or_rename_profile(body: AddOrRenameProfileIn, inventory_id: str = Query(...)):
    """
    Owner-only.
      - If position is free: create profile.
      - If position exists: rename it.
      - If position omitted: auto-pick the smallest free one (2 or 3).
    """
    async with SessionLocal() as db:
        await _require_owner_by_login_code(db, body.login_code, inventory_id)

        taken = (await db.execute(
            text("SELECT position FROM inventory_profiles WHERE inventory_id=:iid"),
            {"iid": inventory_id},
        )).scalars().all()

        pos = body.position
        if pos is None:
            for cand in (2, 3):
                if cand not in taken:
                    pos = cand
                    break

        if pos is None:
            raise HTTPException(409, "no free profile slot (only 3 allowed)")
        if pos < 1 or pos > 3:
            raise HTTPException(400, "position must be 1..3")

        try:
            res = await db.execute(
                text(
                    "INSERT INTO inventory_profiles(inventory_id, profile_name, position) "
                    "VALUES (:iid, :name, :pos) "
                    "ON CONFLICT (inventory_id, position) "
                    "DO UPDATE SET profile_name=EXCLUDED.profile_name "
                    "RETURNING profile_id, profile_name, position"
                ),
                {"iid": inventory_id, "name": body.profile_name, "pos": pos},
            )
            row = res.first()
            await db.commit()
            return {
                "inventory_id": inventory_id,
                "profile_id": row.profile_id,
                "profile_name": row.profile_name,
                "position": row.position,
            }
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"add/rename profile failed: {e}")

# ---------------------- Inventory Info ----------------------

@app.get("/inventories/by-login-code")
async def get_inventory_by_login_code(login_code: str = Query(..., min_length=4, max_length=4)):
    async with SessionLocal() as db:
        res = await db.execute(
            text(
                "WITH u AS (SELECT user_id FROM users WHERE login_code = :code) "
                "SELECT inv.inventory_id, inv.inventory_name, inv.owner_user_id, inv.inventory_type, "
                "       m.role, m.joined_at "
                "FROM inventory_members m "
                "JOIN inventories inv ON inv.inventory_id = m.inventory_id "
                "JOIN u ON u.user_id = m.user_id "
                "LIMIT 1"
            ),
            {"code": login_code},
        )
        row = res.first()
        if not row:
            return None

        profs = (await db.execute(
            text(
                "SELECT profile_id, profile_name, position "
                "FROM inventory_profiles "
                "WHERE inventory_id=:iid ORDER BY position"
            ),
            {"iid": row.inventory_id},
        )).fetchall()

        total = (await db.execute(
            text("SELECT COUNT(*) FROM inventory_members WHERE inventory_id = :iid"),
            {"iid": row.inventory_id},
        )).scalar_one()

        return {
            "inventory_id": row.inventory_id,
            "inventory_name": row.inventory_name,
            "owner_user_id": row.owner_user_id,
            "inventory_type": row.inventory_type,
            "role": row.role,
            "joined_at": row.joined_at,
            "member_count_total": total,
            "profiles": [
                {
                    "profile_id": p.profile_id,
                    "profile_name": p.profile_name,
                    "position": p.position,
                }
                for p in profs
            ],
        }

# ---------------------- Categories & Groceries ----------------------

@app.get("/categories")
async def list_categories():
    """Return full category records (detailed fields)."""
    async with SessionLocal() as db:
        rows = (await db.execute(text("""
            SELECT
              category_id,
              category_name,
              avg_pantry_days,           pantry_product_count,
              avg_refrigerate_days,      refrigerate_product_count,
              avg_freeze_days,           freeze_product_count,
              co2_factor_kg,             co2_method,    co2_confidence,
              price,                     product_size,  unit
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
            "unit": r.unit,
        } for r in rows]

@app.get("/groceries")
async def list_groceries(
    q: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    limit: int = Query(300, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
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
      price, product_size, unit, created_at
    FROM groceries
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY name LIMIT :limit OFFSET :offset"

    async with SessionLocal() as db:
        rows = (await db.execute(text(sql), params)).fetchall()
        return [
            dict(
                grocery_id=r.grocery_id,
                product_id=r.product_id,
                name=r.name,
                category_id=r.category_id,
                dop_pantry_max=r.dop_pantry_max,
                dop_pantry_metric=r.dop_pantry_metric,
                dop_refrigerate_max=r.dop_refrigerate_max,
                dop_refrigerate_metric=r.dop_refrigerate_metric,
                dop_freeze_max=r.dop_freeze_max,
                dop_freeze_metric=r.dop_freeze_metric,
                price=r.price,
                product_size=r.product_size,
                unit=r.unit,
                created_at=r.created_at,
            )
            for r in rows
        ]

# ---------------------- Items ----------------------

@app.get("/items/by-login-code")
async def list_items_by_login_code(
    login_code: str = Query(..., min_length=4, max_length=4),
    visibility: Optional[Literal["shared", "private"]] = Query(None),
    profile_id: Optional[str] = None,
    profile_position: Optional[int] = Query(None, ge=1, le=3),
    limit: int = Query(200, ge=1, le=500),
):
    """
    List items in the caller's inventory, with optional filters:
      - visibility = shared/private
      - if private, optionally filter by profile_id/profile_position
    """
    async with SessionLocal() as db:
        _, inv_id = await _resolve_user_and_inventory_by_login_code(db, login_code)

        pid = None
        if visibility == "private":
            pid = await _resolve_profile_id(db, inv_id, profile_id, profile_position)

        sql = """
        SELECT i.item_id, i.inventory_id, i.grocery_id, i.quantity,
               i.purchased_at, i.actual_expiry, i.created_by,
               i.visibility, i.profile_id,
               i.created_at, i.updated_at,
               g.name AS grocery_name, g.category_id, c.category_name
        FROM inventory_items i
        JOIN groceries g ON g.grocery_id = i.grocery_id
        JOIN categories c ON c.category_id = g.category_id
        WHERE i.inventory_id = :iid
        """
        params = {"iid": inv_id, "limit": limit}

        if visibility:
            sql += " AND i.visibility = :vis"
            params["vis"] = visibility
        if pid:
            sql += " AND i.profile_id = :pid"
            params["pid"] = pid

        sql += " ORDER BY i.updated_at DESC LIMIT :limit"

        rows = (await db.execute(text(sql), params)).fetchall()
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
                "visibility": r.visibility,
                "profile_id": r.profile_id,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
            for r in rows
        ]

@app.post("/items/by-login-code")
async def create_item_by_login_code(body: CreateItemByLoginCodeIn):
    """
    Create an item in the caller's inventory.
      - visibility='shared': ignore profile fields
      - visibility='private': requires profile_id or profile_position
    """
    async with SessionLocal() as db:
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, body.login_code)

        pid = None
        if body.visibility == "private":
            pid = await _resolve_profile_id(db, inv_id, body.profile_id, body.profile_position)

        try:
            await db.execute(text("SELECT public.set_actor(:uid)"), {"uid": u_id})

            ins = await db.execute(
                text(
                    "INSERT INTO inventory_items("
                    "  inventory_id, grocery_id, quantity, purchased_at, actual_expiry,"
                    "  visibility, profile_id"
                    ") VALUES ("
                    "  :inv, :gid, :qty, COALESCE(:pdate, CURRENT_DATE), :edate, :vis, :pid"
                    ") RETURNING item_id"
                ),
                {
                    "inv": inv_id,
                    "gid": body.grocery_id,
                    "qty": body.quantity,
                    "pdate": body.purchased_at,
                    "edate": body.actual_expiry,
                    "vis": body.visibility,
                    "pid": pid,
                },
            )
            new_id = ins.first().item_id
            await db.commit()

            async with SessionLocal() as db2:
                row = (await db2.execute(
                    text(
                        "SELECT i.item_id, i.inventory_id, i.grocery_id, i.quantity,"
                        "       i.purchased_at, i.actual_expiry, i.created_by,"
                        "       i.visibility, i.profile_id,"
                        "       i.created_at, i.updated_at,"
                        "       g.name AS grocery_name, g.category_id, c.category_name "
                        "FROM inventory_items i "
                        "JOIN groceries g ON g.grocery_id = i.grocery_id "
                        "JOIN categories c ON c.category_id = g.category_id "
                        "WHERE i.item_id = :id"
                    ),
                    {"id": new_id},
                )).first()

                return {
                    "inserted": {
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
                        "visibility": row.visibility,
                        "profile_id": row.profile_id,
                        "created_at": row.created_at,
                        "updated_at": row.updated_at,
                    }
                }

        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"create item failed: {e}")

@app.patch("/items/{item_id}/by-login-code")
async def update_item_by_login_code(item_id: str, body: UpdateItemByLoginCodeIn):
    """Patch quantity/purchased_at/actual_expiry of an item, validating membership."""
    async with SessionLocal() as db:
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, body.login_code)
        try:
            await db.execute(text("SELECT public.set_actor(:uid)"), {"uid": u_id})

            if body.quantity is None and body.purchased_at is None and body.actual_expiry is None:
                return {"ok": True, "no_change": True}

            await db.execute(
                text(
                    "UPDATE inventory_items "
                    "SET quantity      = COALESCE(:qty, quantity), "
                    "    purchased_at  = COALESCE(:pdate, purchased_at), "
                    "    actual_expiry = COALESCE(:edate, actual_expiry) "
                    "WHERE item_id = :id AND inventory_id = :iid"
                ),
                {
                    "qty": body.quantity,
                    "pdate": body.purchased_at,
                    "edate": body.actual_expiry,
                    "id": item_id,
                    "iid": inv_id,
                },
            )

            await db.commit()
            return {"ok": True}
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"update item failed: {e}")

@app.delete("/items/{item_id}/by-login-code")
async def delete_item_by_login_code(item_id: str, login_code: str = Query(..., min_length=4, max_length=4)):
    """Delete an item from the caller's inventory."""
    async with SessionLocal() as db:
        u_id, inv_id = await _resolve_user_and_inventory_by_login_code(db, login_code)
        await db.execute(text("SELECT public.set_actor(:uid)"), {"uid": u_id})
        try:
            row = (await db.execute(
                text(
                    "DELETE FROM inventory_items "
                    "WHERE item_id = :item_id AND inventory_id = :iid "
                    "RETURNING item_id"
                ),
                {"item_id": item_id, "iid": inv_id},
            )).first()
            if not row:
                raise HTTPException(404, "item not found in your inventory")
            await db.commit()
            return {"ok": True}
        except Exception as e:
            await db.rollback()
            raise HTTPException(400, f"delete item failed: {e}")
