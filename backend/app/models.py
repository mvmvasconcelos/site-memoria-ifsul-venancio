from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class User(TimestampMixin, db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Page(TimestampMixin, db.Model):
    __tablename__ = "page"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(120), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=True)
    is_visible = db.Column(db.Boolean, default=True, nullable=False)
    menu_order = db.Column(db.Integer, default=0, nullable=False)


class TimelineItem(TimestampMixin, db.Model):
    __tablename__ = "timeline_item"

    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(
        db.Integer, db.ForeignKey("page.id", ondelete="CASCADE"), nullable=False
    )
    title = db.Column(db.String(500), nullable=False)
    date = db.Column(db.String(50), nullable=False)
    image_path = db.Column(db.String(500), nullable=True)
    source = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    order_index = db.Column(db.Integer, default=0, nullable=False)


class CardItem(TimestampMixin, db.Model):
    __tablename__ = "card_item"

    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(
        db.Integer, db.ForeignKey("page.id", ondelete="CASCADE"), nullable=False
    )
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_path = db.Column(db.String(500), nullable=True)
    date_label = db.Column(db.String(50), nullable=True)
    source = db.Column(db.Text, nullable=True)
    order_index = db.Column(db.Integer, default=0, nullable=False)


class MediaFile(TimestampMixin, db.Model):
    __tablename__ = "media_file"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False, unique=True)
    file_path = db.Column(db.String(500), nullable=False)
    folder = db.Column(db.String(50), nullable=False, default="uploads", index=True)
    file_size = db.Column(db.Integer, nullable=True)
    mime_type = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text, nullable=True)
    alt_text = db.Column(db.String(255), nullable=True)


class MenuItem(TimestampMixin, db.Model):
    __tablename__ = "menu_item"

    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(db.Integer, db.ForeignKey("page.id", ondelete="SET NULL"))
    label = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(255), nullable=True)
    is_visible = db.Column(db.Boolean, default=True, nullable=False)
    order_index = db.Column(db.Integer, default=0, nullable=False)


class ContentHistory(db.Model):
    __tablename__ = "content_history"

    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(80), nullable=False)
    entity_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(20), nullable=False)
    old_data = db.Column(db.Text, nullable=True)
    new_data = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
