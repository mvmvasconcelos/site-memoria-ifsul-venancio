from flask import Blueprint, jsonify, request

from ..auth_utils import login_required
from ..models import ContentHistory, User

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


@history_bp.get("")
@login_required
def list_history_entries():
    raw_limit = request.args.get("limit", default="100")
    try:
        limit = int(raw_limit)
    except ValueError:
        return jsonify({"error": "Parâmetro limit inválido"}), 400

    if limit < 1:
        limit = 1
    if limit > 500:
        limit = 500

    entries = (
        ContentHistory.query.order_by(ContentHistory.timestamp.desc(), ContentHistory.id.desc())
        .limit(limit)
        .all()
    )

    user_ids = {entry.user_id for entry in entries}
    users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {user.id: user.username for user in users}

    return jsonify([serialize_history_entry(entry, user_map.get(entry.user_id)) for entry in entries])