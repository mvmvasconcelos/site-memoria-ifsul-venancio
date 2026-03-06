import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from .extensions import db
from .models import User
from .routes.auth import auth_bp
from .routes.cards import cards_bp
from .routes.gallery import gallery_bp
from .routes.history import history_bp
from .routes.menu import menu_bp
from .routes.pages import pages_bp
from .routes.timeline import timeline_bp
from .routes.upload import upload_bp


def create_app():
    project_root = Path(__file__).resolve().parents[2]
    database_dir = project_root / "database"
    uploads_dir = project_root / "uploads"

    database_dir.mkdir(parents=True, exist_ok=True)
    uploads_dir.mkdir(parents=True, exist_ok=True)

    app = Flask(
        __name__,
        static_folder=str(project_root / "src"),
    )

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-this-in-production")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", f"sqlite:///{database_dir / 'memoria.db'}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = str(uploads_dir)
    app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

    db.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(pages_bp, url_prefix="/api/pages")
    app.register_blueprint(timeline_bp, url_prefix="/api/timeline")
    app.register_blueprint(cards_bp, url_prefix="/api/cards")
    app.register_blueprint(gallery_bp, url_prefix="/api/gallery")
    app.register_blueprint(history_bp, url_prefix="/api/history")
    app.register_blueprint(menu_bp, url_prefix="/api/menu")
    app.register_blueprint(upload_bp, url_prefix="/api/upload")

    @app.after_request
    def add_no_cache_headers(response):
        path = request.path or ""
        should_disable_cache = (
            path.startswith("/api/")
            or path == "/"
            or path.endswith(".html")
            or path.endswith(".js")
            or path in {
                "/timeline",
                "/territorio",
                "/campus",
                "/trabalhos",
                "/contact",
                "/admin",
            }
        )

        if should_disable_cache:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return response

    @app.get("/api/health")
    def healthcheck():
        return jsonify({"status": "ok", "service": "memoria-cms"})

    @app.get("/")
    def home():
        return send_from_directory(project_root, "index.html")

    @app.get("/<string:slug>")
    def clean_page(slug):
        if "." in slug:
            candidate = project_root / slug
            if candidate.exists() and candidate.is_file():
                return send_from_directory(project_root, slug)

        static_mapping = {
            "timeline": "timeline.html",
            "territorio": "territorio.html",
            "campus": "campus.html",
            "trabalhos": "trabalhos.html",
            "contact": "contact.html",
            "admin": "admin.html",
        }

        if slug in static_mapping:
            return send_from_directory(project_root, static_mapping[slug])
        return jsonify({"error": "Página não encontrada"}), 404

    @app.get("/<path:path>")
    def assets(path):
        target = project_root / path
        if target.exists() and target.is_file():
            return send_from_directory(project_root, path)
        return jsonify({"error": "Recurso não encontrado"}), 404

    @app.cli.command("init-db")
    def init_db_command():
        db.create_all()
        print("Banco inicializado com sucesso")

    @app.cli.command("create-admin")
    def create_admin_command():
        db.create_all()
        if User.query.filter_by(username="admin").first():
            print("Usuário admin já existe")
            return

        initial_password = os.getenv("ADMIN_INITIAL_PASSWORD", "ifsul2025")
        user = User(username="admin")
        user.set_password(initial_password)
        db.session.add(user)
        db.session.commit()
        print("Usuário admin criado: admin / senha inicial definida")

    return app
