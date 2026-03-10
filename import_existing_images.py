#!/usr/bin/env python3
"""
Script para importar imagens existentes de src/images para o banco de dados.
Mapeia as imagens para as pastas apropriadas e cria registros MediaFile.
"""
import os
import sys
import shutil
from pathlib import Path
from uuid import uuid4
from datetime import datetime

backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

from app import create_app, db
from app.models import MediaFile

# Mapping de pastas source para folders no BD
SOURCE_TO_FOLDER = {
    'campus': 'campus',
    'territorio': 'territorio',
    'timeline': 'timeline',
    'trabalhos': 'trabalhos',
}

# Imagens da raiz que devem ser mapeadas
ROOT_IMAGE_MAPPING = {
    'image1.png': 'campus',
    'image2.png': 'campus',
    'image3.png': 'campus',
    'image4.png': 'campus',
    'image5.png': 'campus',
    'image6.png': 'campus',
    'image7.png': 'campus',
    'image8.png': 'campus',
    'image9.png': 'campus',
    'image10.png': 'campus',
    'image11.png': 'campus',
    'image12.png': 'campus',
    'image13.png': 'campus',
    'image14.png': 'campus',
    'image15.png': 'campus',
    'image16.png': 'campus',
    'image17.png': 'campus',
    'image18.jpeg': 'campus',
    'image19.jpeg': 'campus',
    'image20.jpeg': 'campus',
    'image21.jpeg': 'campus',
    'image22.png': 'campus',
    'image23.jpeg': 'campus',
    'image24.jpeg': 'campus',
    # Imagens da raiz (sem categorização clara)
    '05-de-novembro-de-2021-01-ifsul-1024x682.jpg': 'campus',
    'fase2.jpg': 'campus',
    'header.jpg': 'campus',
    'lei2008.jpg': 'campus',
    'logo-horizontal.png': 'campus',
    'pesquisa.jpg': 'campus',
    'reportagem30jun.jpg': 'campus',
}

def get_mime_type(ext):
    """Get MIME type from file extension."""
    ext_lower = ext.lower()
    mime_map = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
    }
    return mime_map.get(ext_lower, 'image/jpeg')

def import_images():
    """Import existing images from src/images to database."""
    app = create_app()
    
    with app.app_context():
        # Usar a mesma lógica de project_root do create_app()
        import_script_path = Path(__file__).resolve()
        project_root = import_script_path.parent  # /app (container) ou workspace root (local)
        src_images_root = project_root / 'src' / 'images'
        upload_root = Path(app.config['UPLOAD_FOLDER'])
        
        if not src_images_root.exists():
            print(f"❌ Pasta source não encontrada: {src_images_root}")
            return False
        
        imported = 0
        skipped = 0
        
        # Process subfolder images
        print("\n📁 Processando imagens de subpastas...")
        for folder_name, target_folder in SOURCE_TO_FOLDER.items():
            source_folder = src_images_root / folder_name
            if not source_folder.exists():
                print(f"⚠️  Pasta não encontrada: {source_folder}")
                continue
            
            target_path = upload_root / target_folder
            target_path.mkdir(parents=True, exist_ok=True)
            
            # Get all image files from this folder
            image_files = list(source_folder.glob('*'))
            print(f"\n  {folder_name}/: {len(image_files)} arquivo(s)")
            
            for source_file in image_files:
                if not source_file.is_file():
                    continue
                
                # Skip .gitkeep
                if source_file.name == '.gitkeep':
                    continue
                
                ext = source_file.suffix[1:] if source_file.suffix else 'jpg'
                filename = source_file.name
                
                # Check if already exists in database
                existing = MediaFile.query.filter_by(filename=filename).first()
                if existing:
                    print(f"    ⊘ {filename} (já existe)")
                    skipped += 1
                    continue
                
                # Generate new filename with UUID
                generated_name = f"{uuid4().hex}.{ext}"
                dest_file = target_path / generated_name
                
                try:
                    # Copy file
                    shutil.copy2(source_file, dest_file)
                    
                    # Get file size
                    file_size = dest_file.stat().st_size
                    mime_type = get_mime_type(ext)
                    
                    # Create database record
                    media = MediaFile(
                        filename=filename,
                        file_path=f"uploads/{target_folder}/{generated_name}",
                        folder=target_folder,
                        file_size=file_size,
                        mime_type=mime_type,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    
                    db.session.add(media)
                    db.session.flush()
                    
                    print(f"    ✓ {filename}")
                    imported += 1
                    
                except Exception as e:
                    print(f"    ✗ {filename}: {str(e)}")
                    skipped += 1
        
        # Process root images
        print(f"\n📁 Processando imagens da raiz...")
        root_images = [f for f in src_images_root.glob('*') 
                      if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp']]
        
        print(f"  raiz/: {len(root_images)} arquivo(s)")
        
        for source_file in root_images:
            filename = source_file.name
            target_folder = ROOT_IMAGE_MAPPING.get(filename)
            
            if not target_folder:
                print(f"    ⊘ {filename} (sem mapeamento)")
                continue
            
            # Check if already exists in database
            existing = MediaFile.query.filter_by(filename=filename).first()
            if existing:
                print(f"    ⊘ {filename} (já existe)")
                skipped += 1
                continue
            
            ext = source_file.suffix[1:] if source_file.suffix else 'jpg'
            target_path = upload_root / target_folder
            target_path.mkdir(parents=True, exist_ok=True)
            
            # Generate new filename with UUID
            generated_name = f"{uuid4().hex}.{ext}"
            dest_file = target_path / generated_name
            
            try:
                # Copy file
                shutil.copy2(source_file, dest_file)
                
                # Get file size
                file_size = dest_file.stat().st_size
                mime_type = get_mime_type(ext)
                
                # Create database record
                media = MediaFile(
                    filename=filename,
                    file_path=f"uploads/{target_folder}/{generated_name}",
                    folder=target_folder,
                    file_size=file_size,
                    mime_type=mime_type,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                
                db.session.add(media)
                db.session.flush()
                
                print(f"    ✓ {filename}")
                imported += 1
                
            except Exception as e:
                print(f"    ✗ {filename}: {str(e)}")
                skipped += 1
        
        # Commit all changes
        try:
            db.session.commit()
            print(f"\n✅ Importação concluída!")
            print(f"   ✓ Importadas: {imported}")
            print(f"   ⊘ Puladas: {skipped}")
            return True
        except Exception as e:
            print(f"❌ Erro ao salvar no banco: {str(e)}")
            db.session.rollback()
            return False

if __name__ == '__main__':
    success = import_images()
    sys.exit(0 if success else 1)
