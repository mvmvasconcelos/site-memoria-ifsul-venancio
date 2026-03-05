import json

from .extensions import db
from .models import ContentHistory


def log_history(entity_type, entity_id, action, user_id, old_data=None, new_data=None):
    history = ContentHistory(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        user_id=user_id,
        old_data=json.dumps(old_data, ensure_ascii=False) if old_data is not None else None,
        new_data=json.dumps(new_data, ensure_ascii=False) if new_data is not None else None,
    )
    db.session.add(history)
