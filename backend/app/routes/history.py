import json

from flask import Blueprint, jsonify, request, session

from ..auth_utils import login_required
from ..extensions import db
from ..history import log_history
from ..models import CardItem, ContentHistory, GalleryItem, Page, TimelineItem, User

history_bp = Blueprint("history", __name__)


def serialize_history_entry(entry: ContentHistory, username: str | None):
    return {
        "id": entry.id,
        "entity_type": entry.entity_type,
        "entity_id": entry.entity_id,
        "action": entry.action,
        "user_id": entry.user_id,
        "username": username,
        "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
    }


ENTITY_CONFIG = {
    "timeline_item": {
        "model": TimelineItem,
        "fields": ["id", "page_id", "title", "date", "image_path", "source", "description", "order_index"],
    },
    "card_item": {
        "model": CardItem,
        "fields": ["id", "page_id", "title", "description", "image_path", "date_label", "source", "order_index"],
    },
    "gallery_item": {
        "model": GalleryItem,
        "fields": ["id", "page_id", "title", "caption", "image_path", "order_index"],
    },
    "page": {
        "model": Page,
        "fields": ["id", "slug", "title", "type", "content", "is_visible", "menu_order"],
    },
}


def parse_json_data(raw_data):
    if not raw_data:
        return None
    if isinstance(raw_data, dict):
        return raw_data
    try:
        return json.loads(raw_data)
    except json.JSONDecodeError:
        return None


def serialize_model_instance(instance, fields):
    return {field: getattr(instance, field) for field in fields}


def apply_state_to_instance(instance, state_data, fields):
    for field in fields:
        if field in state_data:
            setattr(instance, field, state_data[field])


@history_bp.post("/<int:history_id>/restore")
@login_required
def restore_from_history(history_id):
    history_entry = ContentHistory.query.get(history_id)
    if not history_entry:
        return jsonify({"error": "Registro de histórico não encontrado"}), 404

    config = ENTITY_CONFIG.get(history_entry.entity_type)
    if not config:
        return jsonify({"error": f"Restauração não suportada para {history_entry.entity_type}"}), 400

    model = config["model"]
    fields = config["fields"]
    old_data = parse_json_data(history_entry.old_data)

    if history_entry.action == "create":
        instance = model.query.get(history_entry.entity_id)
        if not instance:
            return jsonify({"error": "Entidade já não existe para desfazer criação"}), 404

        before_data = serialize_model_instance(instance, fields)
        db.session.delete(instance)
        log_history(
            history_entry.entity_type,
            history_entry.entity_id,
            "restore",
            session["user_id"],
            old_data=before_data,
            new_data=None,
        )
        db.session.commit()
        return jsonify({"message": "Criação desfeita com sucesso"})

    if history_entry.action not in {"update", "delete"}:
        return jsonify({"error": f"Ação {history_entry.action} não suportada para restauração"}), 400

    if not isinstance(old_data, dict):
        return jsonify({"error": "Registro antigo inválido para restauração"}), 400

    target_id = old_data.get("id", history_entry.entity_id)
    instance = model.query.get(target_id)
    before_data = serialize_model_instance(instance, fields) if instance else None

    if not instance:
        instance = model()
        db.session.add(instance)

    apply_state_to_instance(instance, old_data, fields)
    db.session.flush()

    after_data = serialize_model_instance(instance, fields)
    log_history(
        history_entry.entity_type,
        instance.id,
        "restore",
        session["user_id"],
        old_data=before_data,
        new_data=after_data,
    )
    db.session.commit()
    return jsonify({"message": "Restauração aplicada com sucesso", "entity_id": instance.id})


@history_bp.get("")
@login_required
def list_history_entries():
    raw_limit = request.args.get("limit", default="100")
    entity_type = (request.args.get("entity_type") or "").strip()
    action = (request.args.get("action") or "").strip()

    try:
        limit = int(raw_limit)
    except ValueError:
        return jsonify({"error": "Parâmetro limit inválido"}), 400

    if limit < 1:
        limit = 1
    if limit > 500:
        limit = 500

    query = ContentHistory.query
    if entity_type:
        query = query.filter(ContentHistory.entity_type == entity_type)
    if action:
        query = query.filter(ContentHistory.action == action)

    entries = query.order_by(ContentHistory.timestamp.desc(), ContentHistory.id.desc()).limit(limit).all()

    user_ids = {entry.user_id for entry in entries}
    users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {user.id: user.username for user in users}

    return jsonify([serialize_history_entry(entry, user_map.get(entry.user_id)) for entry in entries])