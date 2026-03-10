#!/usr/bin/env python3
"""
Script para adicionar a tabela de mídia ao banco de dados existente.
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

from app import create_app, db
from app.models import MediaFile

def migrate_database():
    """Create the media_file table if it doesn't exist."""
    app = create_app()
    
    with app.app_context():
        # Create all tables from models
        db.create_all()
        
        # Check if media_file table was created
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        
        if 'media_file' in tables:
            print("✓ Tabela 'media_file' criada com sucesso!")
            columns = [col['name'] for col in inspector.get_columns('media_file')]
            print(f"  Colunas: {', '.join(columns)}")
        else:
            print("✗ Erro ao criar tabela 'media_file'")
            return False
    
    return True

if __name__ == '__main__':
    success = migrate_database()
    sys.exit(0 if success else 1)
