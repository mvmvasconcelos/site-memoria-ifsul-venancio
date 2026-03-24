from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename

from ..auth_utils import login_required, to_dict
from ..extensions import db
from ..models import MediaFile

media_bp = Blueprint("media", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
ALLOWED_FOLDERS = {"timeline", "trabalhos", "territorio", "campus"}

MEDIA_FIELDS = [
    "id",
    "filename",
    "file_path",
    "folder",
    "file_size",
    "mime_type",
    "description",
    "alt_text",
    "created_at",
    "updated_at",
]


def is_allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in ALLOWED_EXTENSIONS


def serialize_media_file(item: MediaFile):
    data = to_dict(item, MEDIA_FIELDS)
    data["created_at"] = item.created_at.isoformat() if item.created_at else None
    data["updated_at"] = item.updated_at.isoformat() if item.updated_at else None
    return data


def media_file_exists(item: MediaFile) -> bool:
    upload_root = Path(current_app.config["UPLOAD_FOLDER"]).resolve()

    try:
        full_path = (upload_root / item.file_path).resolve()
    except Exception:
        return False

    return str(full_path).startswith(str(upload_root)) and full_path.is_file()


@media_bp.get("")
@login_required
def list_media():
    """List all media files, optionally filtered by folder."""
    folder = request.args.get("folder", "").strip().lower()
    
    query = MediaFile.query
    if folder:
        query = query.filter_by(folder=folder)
    
    items = query.order_by(MediaFile.created_at.desc()).all()
    items = [item for item in items if media_file_exists(item)]
    return jsonify([serialize_media_file(item) for item in items])


@media_bp.post("")
@login_required
def upload_media():
    """Upload a new media file."""
    if "file" not in request.files:
        return jsonify({"error": "Arquivo não enviado"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Arquivo inválido"}), 400

    if not is_allowed_file(file.filename):
        return jsonify({"error": "Tipo de arquivo não permitido"}), 400

    folder = (request.form.get("folder") or "uploads").strip().lower()
    if folder not in ALLOWED_FOLDERS:
        folder = "uploads"

    safe_folder = secure_filename(folder) or "uploads"
    upload_root = Path(current_app.config["UPLOAD_FOLDER"])
    target_folder = upload_root / safe_folder
    target_folder.mkdir(parents=True, exist_ok=True)

    original_name = secure_filename(file.filename)
    extension = original_name.rsplit(".", 1)[1].lower()
    generated_name = f"{uuid4().hex}.{extension}"
    destination = target_folder / generated_name

    file.save(destination)

    # Get file size
    file_size = destination.stat().st_size
    mime_type = request.form.get("mime_type", f"image/{extension}")
    description = (request.form.get("description") or "").strip() or None
    alt_text = (request.form.get("alt_text") or "").strip() or None

    # Create database record
    media_file = MediaFile(
        filename=original_name,
        file_path=f"{safe_folder}/{generated_name}",
        folder=safe_folder,
        file_size=file_size,
        mime_type=mime_type,
        description=description,
        alt_text=alt_text,
    )

    db.session.add(media_file)
    db.session.commit()

    return jsonify(serialize_media_file(media_file)), 201


@media_bp.get("/<int:media_id>")
@login_required
def get_media(media_id):
    """Get a specific media file."""
    media = MediaFile.query.get_or_404(media_id)
    return jsonify(serialize_media_file(media))


@media_bp.put("/<int:media_id>")
@login_required
def update_media(media_id):
    """Update media file metadata."""
    media = MediaFile.query.get_or_404(media_id)
    payload = request.get_json(silent=True) or {}

    # Update allowed fields
    if "description" in payload:
        media.description = (payload.get("description") or "").strip() or None
    if "alt_text" in payload:
        media.alt_text = (payload.get("alt_text") or "").strip() or None

    db.session.commit()
    return jsonify(serialize_media_file(media))


@media_bp.delete("/<int:media_id>")
@login_required
def delete_media(media_id):
    """Delete a media file."""
    media = MediaFile.query.get_or_404(media_id)
    
    # Delete file from filesystem
    file_path = Path(current_app.config["UPLOAD_FOLDER"]) / media.file_path
    if file_path.exists():
        file_path.unlink()

    db.session.delete(media)
    db.session.commit()

    return "", 204


@media_bp.get("/list-for-editor")
def list_for_editor():
    """
    List all media files formatted for the page editor modal.
    Public endpoint (no authentication required) for loading images in the editor.
    """
    folder = request.args.get("folder", "").strip().lower()
    
    query = MediaFile.query
    if folder and folder in ALLOWED_FOLDERS:
        query = query.filter_by(folder=folder)
    
    items = query.order_by(MediaFile.created_at.desc()).all()
    items = [item for item in items if media_file_exists(item)]
    
    return jsonify([
        {
            "id": item.id,
            "filename": item.filename,
            "url": f"/media/serve/{item.file_path}",
            "folder": item.folder,
            "alt_text": item.alt_text or "",
            "description": item.description or "",
            "size": item.file_size or 0,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ])


@media_bp.get("/public-list")
def public_list_media():
    """
    List all media files - public endpoint for admin media manager.
    Returns data in serialized format compatible with MediaFile ORM.
    No authentication required (admin page itself is protected).
    """
    folder = request.args.get("folder", "").strip().lower()
    
    query = MediaFile.query
    if folder:
        query = query.filter_by(folder=folder)
    
    items = query.order_by(MediaFile.created_at.desc()).all()
    items = [item for item in items if media_file_exists(item)]
    return jsonify([serialize_media_file(item) for item in items])


# Blueprint for public file serving
public_bp = Blueprint("public_media", __name__, url_prefix="/media")


@public_bp.get("/serve/<path:file_path>")
def serve_media(file_path):
    """
    Serve media files from uploads directory.
    Public endpoint accessible to all users.
    """
    upload_root = Path(current_app.config["UPLOAD_FOLDER"])
    
    # Security: prevent path traversal
    safe_path = Path(file_path)
    if ".." in safe_path.parts:
        return jsonify({"error": "Acesso negado"}), 403
    
    full_path = upload_root / safe_path
    
    # Verify file exists and is within upload directory
    try:
        full_path = full_path.resolve()
        upload_root = upload_root.resolve()
        
        if not str(full_path).startswith(str(upload_root)):
            return jsonify({"error": "Acesso negado"}), 403
        
        if not full_path.exists():
            return jsonify({"error": "Arquivo não encontrado"}), 404
        
        return send_file(full_path, conditional=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
