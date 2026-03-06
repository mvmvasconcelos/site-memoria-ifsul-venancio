import re
from pathlib import Path

from flask import Blueprint, jsonify, request, session

from ..auth_utils import login_required, to_dict
from ..extensions import db
from ..history import log_history
from ..models import CardItem, GalleryItem, Page

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


def extract_main_html(file_name: str) -> str:
    project_root = Path(__file__).resolve().parents[3]
    file_path = project_root / file_name
    if not file_path.exists() or not file_path.is_file():
        return ""

    html = file_path.read_text(encoding="utf-8")
    match = re.search(r"<main[^>]*>(.*?)</main>", html, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return match.group(1).strip()


def build_content_from_cards(page_id: int) -> str:
    cards = CardItem.query.filter_by(page_id=page_id).order_by(
        CardItem.order_index.asc(), CardItem.id.asc()
    )
    items = []
    for card in cards:
        image = f'<img src="{card.image_path}" alt="{card.title}">' if card.image_path else ""
        date = f'<p class="date">{card.date_label}</p>' if card.date_label else ""
        source = f'<p class="legend">{card.source}</p>' if card.source else ""
        description = f"<p>{card.description}</p>" if card.description else ""
        items.append(
            f"""
<div class=\"territorio-entry\">
  <h3>{card.title}</h3>
  <div class=\"image-container\">{image}{date}</div>
  {source}
  {description}
</div>
            """.strip()
        )

    if not items:
        return ""
    return "\n".join(items)


def build_content_from_gallery(page_id: int) -> str:
    items = GalleryItem.query.filter_by(page_id=page_id).order_by(
        GalleryItem.order_index.asc(), GalleryItem.id.asc()
    )
    sections = []
    for item in items:
        image = f'<img src="{item.image_path}" alt="{item.title or "Trabalho acadêmico"}">' if item.image_path else ""
        caption = f"<p>{item.caption}</p>" if item.caption else ""
        title = item.title or "Trabalho acadêmico"
        sections.append(
            f"""
<section class=\"trabalhos\">
  <h2>{title}</h2>
  {image}
  {caption}
</section>
            """.strip()
        )

    if not sections:
        return ""
    return "<h1>Trabalhos mestrado ProfEPT servidores do câmpus</h1>" + "\n" + "\n".join(sections)


def build_editor_default_content(page: Page) -> str:
    static_mapping = {
        "index": "index.html",
        "contact": "contact.html",
        "territorio": "territorio.html",
        "campus": "campus.html",
        "trabalhos": "trabalhos.html",
    }

    file_name = static_mapping.get(page.slug)
    if file_name:
        static_content = extract_main_html(file_name)
        if static_content:
            return static_content

    if page.slug in {"territorio", "campus"}:
        content = build_content_from_cards(page.id)
        if content:
            return content

    if page.slug == "trabalhos":
        content = build_content_from_gallery(page.id)
        if content:
            return content

    return ""


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

    generated = build_editor_default_content(page)
    if generated:
        return jsonify({"content": generated, "source": "generated"})

    return jsonify({"content": "", "source": "empty"})


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
    db.session.flush()

    log_history(
        "page",
        page.id,
        "create",
        session["user_id"],
        old_data=None,
        new_data=serialize_page(page),
    )
    db.session.commit()
    return jsonify(serialize_page(page)), 201


@pages_bp.put("/<int:page_id>")
@login_required
def update_page(page_id):
    page = Page.query.get(page_id)
    if not page:
        return jsonify({"error": "Página não encontrada"}), 404

    old_data = serialize_page(page)
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

    db.session.flush()
    log_history(
        "page",
        page.id,
        "update",
        session["user_id"],
        old_data=old_data,
        new_data=serialize_page(page),
    )
    db.session.commit()
    return jsonify(serialize_page(page))


@pages_bp.delete("/<int:page_id>")
@login_required
def delete_page(page_id):
    page = Page.query.get(page_id)
    if not page:
        return jsonify({"error": "Página não encontrada"}), 404

    old_data = serialize_page(page)
    db.session.delete(page)
    log_history(
        "page",
        page_id,
        "delete",
        session["user_id"],
        old_data=old_data,
        new_data=None,
    )
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
