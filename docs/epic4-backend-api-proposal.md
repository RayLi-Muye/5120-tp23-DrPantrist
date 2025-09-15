# EPIC4 Backend Design Proposal — Shared vs Private Items

This document proposes minimal, backward‑compatible backend changes to support Shared and Private inventory items per household member.

## Goals
- One Shared section per household (visible to all members)
- One Private section per member (visible only to that member)
- Choose Shared or Private when creating an item
- Enforce read‑only on other members’ Private items

## Data Model Changes

Table: `items`
- New column: `visibility TEXT NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared','private'))`
- New column: `owner_user_id UUID NULL` (nullable; required when `visibility='private'`)

Constraints:
- `CASE WHEN visibility = 'private' THEN owner_user_id IS NOT NULL END`
- Foreign key: `owner_user_id -> users.user_id` (ON DELETE SET NULL) — or RESTRICT if you prefer.

Notes:
- Existing rows default to `shared` with `owner_user_id = NULL` to maintain compatibility.

## API Changes (Additions)

1) Create item (by login code)
- Endpoint: `POST /items/by-login-code`
- Request (new fields optional, default `shared`):
  {"login_code":"ABCD12","grocery_id":101,"quantity":1.0,"purchased_at":"2025-09-11","actual_expiry":"2025-09-15","visibility":"private"|"shared","owner_user_id":"<USER_UUID>"}
- Validation rules:
  - Resolve `user_id` from `login_code`.
  - If `visibility='private'` then `owner_user_id` must equal the resolved `user_id` (prevent faking ownership for another user).
  - If `visibility='shared'` then `owner_user_id` must be NULL (ignore if provided).
- Response: same shape as now, with added fields:
  - `visibility`
  - `owner_user_id`

2) List items by login code
- Endpoint: `GET /items/by-login-code?login_code=...`
- Response: include `visibility` and `owner_user_id` per item.

3) Mark item as used
- Endpoint: `PATCH /items/{item_id}/consume`
- Request (unchanged): `{"login_code":"...","consumed":true}`
- Enforcement:
  - If item.visibility = 'private' and `owner_user_id != resolved_user_id`, return 403: `Private item cannot be modified by other members`.
  - If `shared`, allow any current household member.

4) Delete item
- Endpoint: `DELETE /items/{item_id}/by-login-code?login_code=...`
- Enforcement mirrors (3): forbid deleting others’ private items.

## Ownership & Permissions Semantics

- `shared`: visible to all members of the inventory. Any member can mark as used or delete.
- `private`: visible to all members for transparency/read‑only, but only `owner_user_id` can modify.

Visibility of items is always scoped to the inventory identified by the `login_code` → `inventory_id` mapping.

## Migration Plan

1. Add columns with defaults and constraints.
2. Backfill (optional): set `visibility='private'` for historical rows if you have owner semantics; otherwise keep default `shared`.
3. Update endpoints to read/write new fields.
4. Increment API version if needed; current clients ignore unknown fields.

## Error Responses (samples)

- 400: `{"detail":"owner_user_id required for private items"}`
- 403: `{"detail":"Private item cannot be modified by other members"}`
- 422: `{"detail":"Invalid visibility value"}`

## Minimal SQL Sketch

ALTER TABLE items
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared','private')),
  ADD COLUMN owner_user_id UUID NULL REFERENCES users(user_id);

-- Optional stricter constraint
ALTER TABLE items
  ADD CONSTRAINT private_owner_required CHECK (
    (visibility = 'private' AND owner_user_id IS NOT NULL) OR
    (visibility = 'shared')
  );

## Security Considerations

- All write endpoints must resolve `user_id` from `login_code` server‑side; never trust client‑provided `owner_user_id` unless validated.
- Reads are authorized by membership to the inventory (via login code). Do not leak items across inventories.
- Consider rate‑limits per login code to avoid brute forcing.

## Frontend Interop Notes

- The app already groups items by `visibility` and `owner_user_id` when present.
- Until backend ships, frontend uses a temporary local override for `visibility` to let users choose Shared vs Private on create; it affects only local grouping and should be removed once backend is updated.

