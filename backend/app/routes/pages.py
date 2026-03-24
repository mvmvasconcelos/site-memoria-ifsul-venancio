from flask import Blueprint, jsonify, request

from ..auth_utils import login_required, to_dict
from ..extensions import db
from ..models import Page

pages_bp = Blueprint("pages", __name__)

PAGE_FIELDS = [
    "id",
    "slug",
    "title",
    "type",
    "content",
    "is_visible",
    "menu_order",
    "created_at",
    "updated_at",
]


def serialize_page(page: Page):
    data = to_dict(page, PAGE_FIELDS)
    data["created_at"] = page.created_at.isoformat() if page.created_at else None
    data["updated_at"] = page.updated_at.isoformat() if page.updated_at else None
    return data


@pages_bp.get("")
def list_pages():
    pages = Page.query.order_by(Page.menu_order.asc(), Page.id.asc()).all()
    return jsonify([serialize_page(page) for page in pages])


@pages_bp.get("/<string:slug>")
def get_page_by_slug(slug):
    page = Page.query.filter_by(slug=slug).first()
    if not page:
        return jsonify({"error": "Página não encontrada"}), 404
    return jsonify(serialize_page(page))


@pages_bp.get("/<string:slug>/editor-content")
@login_required
def get_editor_content(slug):
    page = Page.query.filter_by(slug=slug).first()
    if not page:
        return jsonify({"error": "Página não encontrada"}), 404

    current_content = (page.content or "").strip()
    if current_content:
        return jsonify({"content": current_content, "source": "db"})

    return jsonify({"content": "", "source": "db_empty"})


@pages_bp.post("")
@login_required
def create_page():
    payload = request.get_json(silent=True) or {}
    slug = (payload.get("slug") or "").strip().lower()
    title = (payload.get("title") or "").strip()
    page_type = (payload.get("type") or "").strip().lower()

    if not slug or not title or not page_type:
        return jsonify({"error": "slug, title e type são obrigatórios"}), 400

    if Page.query.filter_by(slug=slug).first():
        return jsonify({"error": "Já existe uma página com este slug"}), 409

    page = Page(
        slug=slug,
        title=title,
        type=page_type,
        content=payload.get("content"),
        is_visible=bool(payload.get("is_visible", True)),
        menu_order=int(payload.get("menu_order", 0)),
    )
    db.session.add(page)
    db.session.commit()
    return jsonify(serialize_page(page)), 201


@pages_bp.put("/<int:page_id>")
@login_required
def update_page(page_id):
    page = Page.query.get(page_id)
    if not page:
        return jsonify({"error": "Página não encontrada"}), 404

    payload = request.get_json(silent=True) or {}

    if "slug" in payload:
        new_slug = (payload.get("slug") or "").strip().lower()
        if not new_slug:
            return jsonify({"error": "slug inválido"}), 400
        conflict = Page.query.filter(Page.slug == new_slug, Page.id != page_id).first()
        if conflict:
            return jsonify({"error": "Já existe uma página com este slug"}), 409
        page.slug = new_slug

    if "title" in payload:
        page.title = (payload.get("title") or "").strip()
    if "type" in payload:
        page.type = (payload.get("type") or "").strip().lower()
    if "content" in payload:
        page.content = payload.get("content")
    if "is_visible" in payload:
        page.is_visible = bool(payload.get("is_visible"))
    if "menu_order" in payload:
        page.menu_order = int(payload.get("menu_order"))

    db.session.commit()
    return jsonify(serialize_page(page))


@pages_bp.delete("/<int:page_id>")
@login_required
def delete_page(page_id):
    page = Page.query.get(page_id)
    if not page:
        return jsonify({"error": "Página não encontrada"}), 404

    db.session.delete(page)
    db.session.commit()
    return jsonify({"message": "Página removida"})


@pages_bp.put("/reorder")
@login_required
def reorder_pages():
    payload = request.get_json(silent=True) or {}
    ordered_ids = payload.get("ordered_ids") or []

    if not isinstance(ordered_ids, list):
        return jsonify({"error": "ordered_ids deve ser uma lista"}), 400

    pages = Page.query.filter(Page.id.in_(ordered_ids)).all() if ordered_ids else []
    page_map = {page.id: page for page in pages}

    for index, page_id in enumerate(ordered_ids):
        page = page_map.get(page_id)
        if page:
            page.menu_order = index

    db.session.commit()
    return jsonify({"message": "Ordem atualizada"})
