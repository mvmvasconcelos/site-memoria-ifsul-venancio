from flask import Blueprint, jsonify, request, session

from ..auth_utils import login_required, to_dict
from ..extensions import db
from ..history import log_history
from ..models import GalleryItem

gallery_bp = Blueprint("gallery", __name__)

GALLERY_FIELDS = [
    "id",
    "page_id",
    "title",
    "caption",
    "image_path",
    "order_index",
    "created_at",
    "updated_at",
]


def serialize_gallery_item(item: GalleryItem):
    data = to_dict(item, GALLERY_FIELDS)
    data["created_at"] = item.created_at.isoformat() if item.created_at else None
    data["updated_at"] = item.updated_at.isoformat() if item.updated_at else None
    return data


@gallery_bp.get("/<int:page_id>")
def list_gallery_items(page_id):
    items = GalleryItem.query.filter_by(page_id=page_id).order_by(
        GalleryItem.order_index.asc(), GalleryItem.id.asc()
    )
    return jsonify([serialize_gallery_item(item) for item in items])


@gallery_bp.post("")
@login_required
def create_gallery_item():
    payload = request.get_json(silent=True) or {}
    page_id = payload.get("page_id")
    image_path = (payload.get("image_path") or "").strip()

    if not page_id or not image_path:
        return jsonify({"error": "page_id e image_path são obrigatórios"}), 400

    item = GalleryItem(
        page_id=int(page_id),
        title=(payload.get("title") or "").strip() or None,
        caption=payload.get("caption"),
        image_path=image_path,
        order_index=int(payload.get("order_index", 0)),
    )
    db.session.add(item)
    db.session.flush()

    log_history(
        "gallery_item",
        item.id,
        "create",
        session["user_id"],
        old_data=None,
        new_data=serialize_gallery_item(item),
    )
    db.session.commit()
    return jsonify(serialize_gallery_item(item)), 201


@gallery_bp.put("/<int:item_id>")
@login_required
def update_gallery_item(item_id):
    item = GalleryItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item de galeria não encontrado"}), 404

    old_data = serialize_gallery_item(item)
    payload = request.get_json(silent=True) or {}

    if "title" in payload:
        item.title = (payload.get("title") or "").strip() or None
    if "caption" in payload:
        item.caption = payload.get("caption")
    if "image_path" in payload:
        image_path = (payload.get("image_path") or "").strip()
        if not image_path:
            return jsonify({"error": "image_path não pode ser vazio"}), 400
        item.image_path = image_path
    if "order_index" in payload:
        item.order_index = int(payload.get("order_index"))

    db.session.flush()
    log_history(
        "gallery_item",
        item.id,
        "update",
        session["user_id"],
        old_data=old_data,
        new_data=serialize_gallery_item(item),
    )
    db.session.commit()
    return jsonify(serialize_gallery_item(item))


@gallery_bp.delete("/<int:item_id>")
@login_required
def delete_gallery_item(item_id):
    item = GalleryItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item de galeria não encontrado"}), 404

    old_data = serialize_gallery_item(item)
    db.session.delete(item)
    log_history(
        "gallery_item",
        item_id,
        "delete",
        session["user_id"],
        old_data=old_data,
        new_data=None,
    )
    db.session.commit()
    return jsonify({"message": "Item de galeria removido"})


@gallery_bp.put("/reorder")
@login_required
def reorder_gallery_items():
    payload = request.get_json(silent=True) or {}
    ordered_ids = payload.get("ordered_ids") or []

    if not isinstance(ordered_ids, list):
        return jsonify({"error": "ordered_ids deve ser uma lista"}), 400

    items = (
        GalleryItem.query.filter(GalleryItem.id.in_(ordered_ids)).all()
        if ordered_ids
        else []
    )
    item_map = {item.id: item for item in items}

    for index, item_id in enumerate(ordered_ids):
        item = item_map.get(item_id)
        if item:
            item.order_index = index

    db.session.commit()
    return jsonify({"message": "Ordem da galeria atualizada"})