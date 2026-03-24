from flask import Blueprint, jsonify, request

from ..auth_utils import login_required, to_dict
from ..extensions import db
from ..models import MenuItem, Page

menu_bp = Blueprint("menu", __name__)

MENU_FIELDS = [
    "id",
    "page_id",
    "label",
    "url",
    "is_visible",
    "order_index",
    "created_at",
    "updated_at",
]


def serialize_menu_item(item: MenuItem):
    data = to_dict(item, MENU_FIELDS)
    page = Page.query.get(item.page_id) if item.page_id else None
    data["page_slug"] = page.slug if page else None
    data["page_title"] = page.title if page else None
    data["created_at"] = item.created_at.isoformat() if item.created_at else None
    data["updated_at"] = item.updated_at.isoformat() if item.updated_at else None
    return data


@menu_bp.get("")
def list_menu():
    items = MenuItem.query.order_by(MenuItem.order_index.asc(), MenuItem.id.asc()).all()
    return jsonify([serialize_menu_item(item) for item in items])


@menu_bp.put("")
@login_required
def replace_menu():
    payload = request.get_json(silent=True) or {}
    items_data = payload.get("items")

    if not isinstance(items_data, list):
        return jsonify({"error": "Campo items deve ser uma lista"}), 400

    MenuItem.query.delete()
    db.session.flush()

    created = []
    for index, item_data in enumerate(items_data):
        label = (item_data.get("label") or "").strip()
        if not label:
            return jsonify({"error": f"Label inválido no item {index}"}), 400

        page_id = item_data.get("page_id")
        if page_id is not None:
            page = Page.query.get(int(page_id))
            if not page:
                return jsonify({"error": f"Página inválida no item {index}"}), 400

        item = MenuItem(
            page_id=int(page_id) if page_id is not None else None,
            label=label,
            url=(item_data.get("url") or "").strip() or None,
            is_visible=bool(item_data.get("is_visible", True)),
            order_index=index,
        )
        db.session.add(item)
        created.append(serialize_menu_item(item))

    db.session.commit()
    return jsonify(created)


@menu_bp.put("/reorder")
@login_required
def reorder_menu():
    payload = request.get_json(silent=True) or {}
    ordered_ids = payload.get("ordered_ids") or []

    if not isinstance(ordered_ids, list):
        return jsonify({"error": "ordered_ids deve ser uma lista"}), 400

    items = MenuItem.query.filter(MenuItem.id.in_(ordered_ids)).all() if ordered_ids else []
    item_map = {item.id: item for item in items}

    for index, item_id in enumerate(ordered_ids):
        item = item_map.get(item_id)
        if item:
            item.order_index = index

    db.session.commit()
    return jsonify({"message": "Ordem do menu atualizada"})
