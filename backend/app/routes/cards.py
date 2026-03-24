from flask import Blueprint, jsonify, request

from ..auth_utils import login_required, to_dict
from ..extensions import db
from ..models import CardItem

cards_bp = Blueprint("cards", __name__)

CARD_FIELDS = [
    "id",
    "page_id",
    "title",
    "description",
    "image_path",
    "date_label",
    "source",
    "order_index",
    "created_at",
    "updated_at",
]


def serialize_card(card: CardItem):
    data = to_dict(card, CARD_FIELDS)
    data["created_at"] = card.created_at.isoformat() if card.created_at else None
    data["updated_at"] = card.updated_at.isoformat() if card.updated_at else None
    return data


@cards_bp.get("/<int:page_id>")
def list_cards(page_id):
    cards = CardItem.query.filter_by(page_id=page_id).order_by(
        CardItem.order_index.asc(), CardItem.id.asc()
    )
    return jsonify([serialize_card(card) for card in cards])


@cards_bp.post("")
@login_required
def create_card():
    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    page_id = payload.get("page_id")

    if not title or not page_id:
        return jsonify({"error": "title e page_id são obrigatórios"}), 400

    card = CardItem(
        page_id=int(page_id),
        title=title,
        description=payload.get("description"),
        image_path=(payload.get("image_path") or "").strip() or None,
        date_label=(payload.get("date_label") or "").strip() or None,
        source=payload.get("source"),
        order_index=int(payload.get("order_index", 0)),
    )
    db.session.add(card)
    db.session.commit()
    return jsonify(serialize_card(card)), 201


@cards_bp.put("/<int:card_id>")
@login_required
def update_card(card_id):
    card = CardItem.query.get(card_id)
    if not card:
        return jsonify({"error": "Card não encontrado"}), 404

    payload = request.get_json(silent=True) or {}

    if "title" in payload:
        card.title = (payload.get("title") or "").strip()
    if "description" in payload:
        card.description = payload.get("description")
    if "image_path" in payload:
        card.image_path = (payload.get("image_path") or "").strip() or None
    if "date_label" in payload:
        card.date_label = (payload.get("date_label") or "").strip() or None
    if "source" in payload:
        card.source = payload.get("source")
    if "order_index" in payload:
        card.order_index = int(payload.get("order_index"))

    db.session.commit()
    return jsonify(serialize_card(card))


@cards_bp.delete("/<int:card_id>")
@login_required
def delete_card(card_id):
    card = CardItem.query.get(card_id)
    if not card:
        return jsonify({"error": "Card não encontrado"}), 404

    db.session.delete(card)
    db.session.commit()
    return jsonify({"message": "Card removido"})


@cards_bp.put("/reorder")
@login_required
def reorder_cards():
    payload = request.get_json(silent=True) or {}
    ordered_ids = payload.get("ordered_ids") or []

    if not isinstance(ordered_ids, list):
        return jsonify({"error": "ordered_ids deve ser uma lista"}), 400

    cards = CardItem.query.filter(CardItem.id.in_(ordered_ids)).all() if ordered_ids else []
    card_map = {card.id: card for card in cards}

    for index, card_id in enumerate(ordered_ids):
        card = card_map.get(card_id)
        if card:
            card.order_index = index

    db.session.commit()
    return jsonify({"message": "Ordem atualizada"})
