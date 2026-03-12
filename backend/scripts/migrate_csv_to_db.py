import csv
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app import create_app
from app.extensions import db
from app.models import CardItem, MenuItem, Page, TimelineItem


def upsert_page(slug: str, title: str, page_type: str, menu_order: int) -> Page:
    page = Page.query.filter_by(slug=slug).first()
    if page:
        page.title = title
        page.type = page_type
        page.menu_order = menu_order
        page.is_visible = True
        return page

    page = Page(
        slug=slug,
        title=title,
        type=page_type,
        menu_order=menu_order,
        is_visible=True,
    )
    db.session.add(page)
    db.session.flush()
    return page


def migrate_timeline(project_root: Path, page: Page):
    csv_path = project_root / "src" / "timeline.csv"
    if not csv_path.exists():
        return

    TimelineItem.query.filter_by(page_id=page.id).delete()

    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for index, row in enumerate(reader):
            title = (row.get("title") or "").strip()
            date = (row.get("date") or "").strip()
            if not title or not date:
                continue

            image_name = (row.get("image") or "").strip()
            item = TimelineItem(
                page_id=page.id,
                title=title,
                date=date,
                image_path=f"src/images/{image_name}" if image_name else None,
                source=(row.get("legend") or "").strip() or None,
                description=(row.get("text") or "").strip() or None,
                order_index=index,
            )
            db.session.add(item)


def migrate_cards(project_root: Path, page: Page, csv_filename: str, image_folder: str):
    csv_path = project_root / "src" / csv_filename
    if not csv_path.exists():
        return

    CardItem.query.filter_by(page_id=page.id).delete()

    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for index, row in enumerate(reader):
            title = (row.get("title") or "").strip()
            if not title:
                continue

            image_name = (row.get("image") or "").strip()
            card = CardItem(
                page_id=page.id,
                title=title,
                description=(row.get("text") or "").strip() or None,
                image_path=f"src/images/{image_folder}/{image_name}" if image_name else None,
                date_label=(row.get("date") or "").strip() or None,
                source=(row.get("legend") or "").strip() or None,
                order_index=index,
            )
            db.session.add(card)


def migrate_trabalhos_cards(page: Page):
    CardItem.query.filter_by(page_id=page.id).delete()

    items = [
        {
            "title": "Documentário Narrativas dos Sujeitos do PROEJA do Curso Secretariado do IFSul Câmpus Venâncio Aires",
            "image_path": "src/images/trabalhos/image1.png",
            "caption": "Para assistir o Documentário, acesse: <a href=\"https://www.youtube.com/watch?v=zUmkMOBWh8I\" target=\"_blank\" rel=\"noopener noreferrer\">link</a>",
        },
        {
            "title": "Produto Educacional Mestrado ProfEPT Servidora Giselle Schweickardt",
            "image_path": "src/images/trabalhos/image2.png",
            "caption": "Livro de memórias (e-book): <a href=\"https://educapes.capes.gov.br/handle/capes/747394\" target=\"_blank\" rel=\"noopener noreferrer\">link</a>",
        },
        {
            "title": "Produto Educacional Mestrado ProfEPT Servidora Danielle Schweickardt",
            "image_path": "src/images/trabalhos/image3.png",
            "caption": "Para acessar o guia: <a href=\"http://educapes.capes.gov.br/handle/capes/744665\" target=\"_blank\" rel=\"noopener noreferrer\">link</a>",
        },
        {
            "title": "Produto Educacional Mestrado ProfEPT Servidora Daiana Schons",
            "image_path": "src/images/trabalhos/lei12711.jpeg",
            "caption": "Para acessar o guia: <a href=\"http://educapes.capes.gov.br/handle/capes/746048\" target=\"_blank\" rel=\"noopener noreferrer\">link</a>",
        },
    ]

    for index, item in enumerate(items):
        card_item = CardItem(
            page_id=page.id,
            title=item["title"],
            image_path=item["image_path"],
            description=item["caption"],
            order_index=index,
        )
        db.session.add(card_item)


def sync_menu_items():
    MenuItem.query.delete()
    db.session.flush()

    base_items = [
        MenuItem(
            page_id=None,
            label="Início",
            url='/',
            is_visible=True,
            order_index=0,
        )
    ]

    for item in base_items:
        db.session.add(item)

    pages = (
        Page.query.filter(Page.is_visible.is_(True))
        .order_by(Page.menu_order.asc(), Page.id.asc())
        .all()
    )

    for index, page in enumerate(pages, start=1):
        menu_item = MenuItem(
            page_id=page.id,
            label=page.title,
            url=f"/{page.slug}",
            is_visible=True,
            order_index=index,
        )
        db.session.add(menu_item)

    db.session.add(
        MenuItem(
            page_id=None,
            label="Contato",
            url='/contact',
            is_visible=True,
            order_index=len(pages) + 1,
        )
    )


def main():
    app = create_app()
    project_root = Path(__file__).resolve().parents[2]

    with app.app_context():
        db.create_all()

        page_timeline = upsert_page("timeline", "Linha do Tempo", "timeline", 1)
        page_territorio = upsert_page("territorio", "Transformações Territoriais", "cards", 2)
        page_campus = upsert_page("campus", "Campus", "cards", 3)
        page_trabalhos = upsert_page("trabalhos", "Trabalhos Acadêmicos", "cards", 4)

        migrate_timeline(project_root, page_timeline)
        migrate_cards(project_root, page_territorio, "territorio.csv", "territorio")
        migrate_cards(project_root, page_campus, "campus.csv", "campus")
        migrate_trabalhos_cards(page_trabalhos)
        sync_menu_items()

        db.session.commit()
        print("Migração de CSV para SQLite concluída com sucesso")


if __name__ == "__main__":
    main()
