from flask import Blueprint, jsonify, request, session

from ..extensions import db
from ..auth_utils import login_required
from ..models import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Usuário e senha são obrigatórios"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciais inválidas"}), 401

    session["user_id"] = user.id
    return jsonify({"id": user.id, "username": user.username})


@auth_bp.post("/logout")
@login_required
def logout():
    session.clear()
    return jsonify({"message": "Logout realizado"})


@auth_bp.get("/me")
@login_required
def me():
    user = User.query.get(session["user_id"])
    return jsonify({"id": user.id, "username": user.username})


@auth_bp.post("/change-password")
@login_required
def change_password():
    payload = request.get_json(silent=True) or {}
    current_password = payload.get("current_password") or ""
    new_password = payload.get("new_password") or ""

    if not current_password or not new_password:
        return jsonify({"error": "Senha atual e nova senha são obrigatórias"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "A nova senha deve ter pelo menos 8 caracteres"}), 400

    user = User.query.get(session["user_id"])
    if not user or not user.check_password(current_password):
        return jsonify({"error": "Senha atual inválida"}), 401

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Senha atualizada com sucesso"})
