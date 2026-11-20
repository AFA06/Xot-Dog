import re

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import models, schemas
from ..deps import AdminUser, CurrentUser, DbSession
from ..errors import api_error
from ..mappers import modifier_group_out, product_out

router = APIRouter(tags=["catalog"])


@router.get("/catalog", response_model=schemas.CatalogOut)
def get_catalog(db: DbSession, _: CurrentUser):
    categories = db.scalars(select(models.Category).order_by(models.Category.sort))
    products = db.scalars(select(models.Product).order_by(models.Product.sort, models.Product.id))
    groups = db.scalars(select(models.ModifierGroup).order_by(models.ModifierGroup.sort))
    return schemas.CatalogOut(
        categories=[schemas.CategoryOut(id=c.id, name=c.name, sort=c.sort) for c in categories],
        products=[product_out(p) for p in products],
        modifier_groups=[modifier_group_out(g) for g in groups],
    )


@router.put("/products/{product_id}", response_model=schemas.ProductOut)
def save_product(product_id: str, data: schemas.ProductIn, db: DbSession, user: AdminUser):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", product_id):
        raise api_error(422, "invalid_id", "Invalid product id")
    if db.get(models.Category, data.category_id) is None:
        raise api_error(422, "invalid_category", "Unknown category")
    group_ids = list(dict.fromkeys(data.modifier_group_ids))
    known_groups = set(db.scalars(select(models.ModifierGroup.id).where(models.ModifierGroup.id.in_(group_ids))))
    if missing := [g for g in group_ids if g not in known_groups]:
        raise api_error(422, "invalid_modifier", f"Unknown modifier groups: {missing}")
    all_branches = set(db.scalars(select(models.Branch.id)))
    requested = set(data.branch_ids)
    if missing := requested - all_branches:
        raise api_error(422, "invalid_branch", f"Unknown branches: {sorted(missing)}")

    product = db.get(models.Product, product_id)
    current = {link.branch_id for link in product.branch_links} if product else set()
    if not user.is_owner:
        # Managers change availability only for their own branch.
        own = {user.staff.branch_id}
        requested = (current - own) | (requested & own)

    if product is None:
        sort = (db.scalar(select(models.Product.sort).order_by(models.Product.sort.desc()).limit(1)) or 0) + 1
        product = models.Product(id=product_id, sort=sort)
        db.add(product)
    product.sku = data.sku
    product.category_id = data.category_id
    product.name = data.name.model_dump()
    desc = data.description.model_dump() if data.description else None
    product.description = desc if desc and (desc["uz"] or desc["ru"]) else None
    product.price = data.price
    product.active = data.active
    product.tone = data.tone
    product.group_links = [models.ProductModifierGroup(group_id=g, sort=i) for i, g in enumerate(group_ids)]
    product.branch_links = [models.ProductBranch(branch_id=b) for b in sorted(requested)]
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise api_error(409, "sku_conflict", "SKU already used by another product") from e
    db.refresh(product)
    return product_out(product)
