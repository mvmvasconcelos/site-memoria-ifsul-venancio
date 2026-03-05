from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from ..auth_utils import login_required

upload_bp = Blueprint("upload", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}


def is_allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in ALLOWED_EXTENSIONS


@upload_bp.post("")
@login_required
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "Arquivo não enviado"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Arquivo inválido"}), 400

    if not is_allowed_file(file.filename):
        return jsonify({"error": "Tipo de arquivo não permitido"}), 400

    folder = (request.form.get("folder") or "timeline").strip().lower()
    if not folder:
        folder = "timeline"

    safe_folder = secure_filename(folder) or "timeline"
    upload_root = Path(current_app.config["UPLOAD_FOLDER"])
    target_folder = upload_root / safe_folder
    target_folder.mkdir(parents=True, exist_ok=True)

    original_name = secure_filename(file.filename)
    extension = original_name.rsplit(".", 1)[1].lower()
    generated_name = f"{uuid4().hex}.{extension}"
    destination = target_folder / generated_name

    file.save(destination)

    return (
        jsonify(
            {
                "message": "Upload concluído",
                "image_path": f"uploads/{safe_folder}/{generated_name}",
                "filename": generated_name,
            }
        ),
        201,
    )
