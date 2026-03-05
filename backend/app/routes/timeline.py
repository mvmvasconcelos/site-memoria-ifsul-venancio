import re
from datetime import date

from flask import Blueprint, jsonify, request, session

from ..auth_utils import login_required, to_dict
from ..extensions import db
from ..history import log_history
from ..models import TimelineItem

timeline_bp = Blueprint("timeline", __name__)

TIMELINE_DATE_REGEX = re.compile(r"^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$")

TIMELINE_FIELDS = [
    "id",
    "page_id",
    "title",
    "date",
    "image_path",
    "source",
    "description",
    "order_index",
    "created_at",
    "updated_at",
]


def serialize_item(item: TimelineItem):
    data = to_dict(item, TIMELINE_FIELDS)
    data["created_at"] = item.created_at.isoformat() if item.created_at else None
    data["updated_at"] = item.updated_at.isoformat() if item.updated_at else None
    return data


def is_valid_timeline_date(value: str) -> bool:
    match = TIMELINE_DATE_REGEX.match((value or "").strip())
    if not match:
        return False

    year = int(match.group(1))
    month_raw = match.group(2)
    day_raw = match.group(3)

    if month_raw is None:
        return True

    month = int(month_raw)
    if month < 1 or month > 12:
        return False

    if day_raw is None:
        return True

    day = int(day_raw)
    try:
        date(year, month, day)
    except ValueError:
        return False

    return True


@timeline_bp.get("/<int:page_id>")
def list_timeline(page_id):
    items = TimelineItem.query.filter_by(page_id=page_id).order_by(
        TimelineItem.order_index.asc(), TimelineItem.id.asc()
    )
    return jsonify([serialize_item(item) for item in items])


@timeline_bp.post("")
@login_required
def create_timeline_item():
    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    date = (payload.get("date") or "").strip()
    page_id = payload.get("page_id")

    if not title or not date or not page_id:
        return jsonify({"error": "title, date e page_id são obrigatórios"}), 400

    if not is_valid_timeline_date(date):
        return jsonify({"error": "date inválida. Use AAAA, AAAA-MM ou AAAA-MM-DD"}), 400

    item = TimelineItem(
        page_id=int(page_id),
        title=title,
        date=date,
        image_path=(payload.get("image_path") or "").strip() or None,
        source=payload.get("source"),
        description=payload.get("description"),
        order_index=int(payload.get("order_index", 0)),
    )
    db.session.add(item)
    db.session.flush()

    log_history(
        "timeline_item",
        item.id,
        "create",
        session["user_id"],
        old_data=None,
        new_data=serialize_item(item),
    )
    db.session.commit()
    return jsonify(serialize_item(item)), 201


@timeline_bp.put("/<int:item_id>")
@login_required
def update_timeline_item(item_id):
    item = TimelineItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item não encontrado"}), 404

    old_data = serialize_item(item)
    payload = request.get_json(silent=True) or {}

    if "title" in payload:
        item.title = (payload.get("title") or "").strip()
    if "date" in payload:
        candidate_date = (payload.get("date") or "").strip()
        if not is_valid_timeline_date(candidate_date):
            return jsonify({"error": "date inválida. Use AAAA, AAAA-MM ou AAAA-MM-DD"}), 400
        item.date = candidate_date
    if "image_path" in payload:
        item.image_path = (payload.get("image_path") or "").strip() or None
    if "source" in payload:
        item.source = payload.get("source")
    if "description" in payload:
        item.description = payload.get("description")
    if "order_index" in payload:
        item.order_index = int(payload.get("order_index"))

    db.session.flush()
    log_history(
        "timeline_item",
        item.id,
        "update",
        session["user_id"],
        old_data=old_data,
        new_data=serialize_item(item),
    )
    db.session.commit()
    return jsonify(serialize_item(item))


@timeline_bp.delete("/<int:item_id>")
@login_required
def delete_timeline_item(item_id):
    item = TimelineItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item não encontrado"}), 404

    old_data = serialize_item(item)
    db.session.delete(item)
    log_history(
        "timeline_item",
        item_id,
        "delete",
        session["user_id"],
        old_data=old_data,
        new_data=None,
    )
    db.session.commit()
    return jsonify({"message": "Item removido"})


@timeline_bp.put("/reorder")
@login_required
def reorder_timeline_items():
    payload = request.get_json(silent=True) or {}
    ordered_ids = payload.get("ordered_ids") or []

    if not isinstance(ordered_ids, list):
        return jsonify({"error": "ordered_ids deve ser uma lista"}), 400

    items = TimelineItem.query.filter(TimelineItem.id.in_(ordered_ids)).all() if ordered_ids else []
    item_map = {item.id: item for item in items}

    for index, item_id in enumerate(ordered_ids):
        item = item_map.get(item_id)
        if item:
            item.order_index = index

    db.session.commit()
    return jsonify({"message": "Ordem atualizada"})
