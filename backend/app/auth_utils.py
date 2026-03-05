from functools import wraps

from flask import jsonify, session

from .models import User


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Não autenticado"}), 401

        user = User.query.get(user_id)
        if not user:
            session.clear()
            return jsonify({"error": "Sessão inválida"}), 401

        return fn(*args, **kwargs)

    return wrapper


def to_dict(model, fields):
    return {field: getattr(model, field) for field in fields}
