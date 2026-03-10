# 🖼️ Gerenciador de Mídia - Implementação Completa

## Resumo das Mudanças

### ✅ Backend

#### 1. **Novo Modelo de Dados** ([backend/app/models.py](backend/app/models.py))
- Criada classe `MediaFile` para gerenciar arquivos de mídia
- Campos: `id`, `filename`, `file_path`, `folder`, `file_size`, `mime_type`, `description`, `alt_text`, com timestamps

#### 2. **Nova Rota de API** ([backend/app/routes/media.py](backend/app/routes/media.py))
- `GET /api/media` - Listar arquivos (com filtro por pasta)
- `POST /api/media` - Upload de arquivo
- `GET /api/media/<id>` - Obter detalhes de arquivo
- `PUT /api/media/<id>` - Atualizar metadados (alt_text, description)
- `DELETE /api/media/<id>` - Deletar arquivo

#### 3. **Registro da Rota** ([backend/app/__init__.py](backend/app/__init__.py))
- Importada nova rota `media_bp`
- Registrada em `/api/media`

### ✅ Frontend

#### 1. **Interface HTML** ([admin.html](admin.html))
- Novo painel "🖼️ Mídia" no menu lateral
- Vista em lista (tabela) e grid (miniaturas)
- Modais para editar metadados e confirmar exclusões
- Filtro por pasta (timeline, trabalhos, territorio, campus)

#### 2. **Funções JavaScript** ([src/js/admin-cms.js](src/js/admin-cms.js))
- `loadMedia()` - Carrega lista de mídia de um servidor
- `renderMediaTable()` - Renderiza visualização em tabela
- `renderMediaGrid()` - Renderiza visualização em grid
- `toggleMediaView()` - Alterna entre visualizações
- `uploadMediaFile()` e `handleMediaFileSelection()` - Gerenciam upload
- `openMediaEditModal()`, `saveMediaEdit()` - Editar metadados
- `openDeleteMediaModal()`, `confirmDeleteMedia()` - Deletar arquivos
- `attachMediaEventListeners()` - Conecta event listeners

#### 3. **Estilos CSS** ([src/css/admin.css](src/css/admin.css))
- `.media-grid-container` - Grid responsivo com miniaturas
- `.media-grid-item` - Cards de mídia com hover effects
- `.media-list-view` / `.media-grid-view` - Controle de visualização
- `.media-edit-content` - Layout do modal de edição
- Estilos responsivos para mobile

## 📋 Como Usar

### 1. Aplicar Migração do Banco de Dados (Dentro do Container)

```bash
# Entre no container da aplicação
docker-compose exec web python migrate_media_table.py
```

Se estiver usando outro nome de serviço, ajuste conforme necessário:
```bash
docker-compose exec <service_name> python migrate_media_table.py
```

### 2. Reiniciar Aplicação

```bash
docker-compose restart
```

### 3. Acessar Admin

A página de admin agora possui:
- **Sidebar**: Novo item "🖼️ Mídia" entre "Gerenciar Páginas" e "Galeria"
- **Dashboard**: Novo card mostrando total de arquivos de mídia
- **Painel Mídia**: Com upload e gerenciamento de arquivos

### 4. Funcionalidades Disponíveis

#### Upload de Arquivo
1. Selecione a pasta (timeline, trabalhos, etc.)
2. Clique em "📤 Upload de Arquivo"
3. Escolha a imagem desejada
4. Arquivo é salvo com UUID e registrado no banco

#### Visualização
- **Lista**: Tabela com nome, pasta, tamanho, data
- **Grid**: Miniaturas com ações rápidas
- Alterne com botão "Grid/Lista"

#### Editar Metadados
1. Clique em "✎ Editar" em qualquer arquivo
2. Adicione "Texto Alternativo" (alt_text)
3. Adicione "Descrição"
4. Clique "Salvar"

#### Deletar Arquivo
1. Clique em "🗑 Deletar"
2. Confirme a exclusão (não pode ser desfeita)
3. Arquivo é removido do banco E do filesystem

#### Filtrar por Pasta
- Use o dropdown "Pasta: Todos" para filtrar por local de armazenamento

## 🗂️ Estrutura de Pastas

Arquivos de mídia são salvos em:
```
uploads/
├── timeline/      # Imagens da timeline
├── trabalhos/     # Imagens de trabalhos acadêmicos
├── territorio/    # Imagens de transformações territoriais
└── campus/        # Imagens de campus
```

## 📊 Modelo de Dados

```python
class MediaFile(TimestampMixin, db.Model):
    id              # ID único
    filename        # Nome original do arquivo
    file_path       # Caminho relativo (uploads/pasta/uuid.ext)
    folder          # Pasta (timeline, trabalhos, etc.)
    file_size       # Tamanho em bytes
    mime_type       # Tipo MIME
    description     # Descrição (opcional)
    alt_text        # Texto alternativo para acessibilidade
    created_at      # Data de upload
    updated_at      # Data da última atualização
```

## 🔄 Diferenças da "Galeria"

A seção "Galeria de Trabalhos" continua funcionando para gerenciar especificamente o conteúdo da página de trabalhos acadêmicos (página "trabalhos.html").

A nova seção "Mídia" é um gerenciador genérico de todos os arquivos de imagem, similar ao WordPress Media Manager:
- ✅ Múltiplas pastas
- ✅ Visualização em lista ou grid
- ✅ Metadados (alt_text, description)
- ✅ Histórico de uploads
- ✅ Exclusão de arquivos

## ⚙️ API Endpoints

### Listar Mídia
```http
GET /api/media                    # Todos os arquivos
GET /api/media?folder=timeline    # Apenas da pasta timeline
```

**Response:**
```json
[
  {
    "id": 1,
    "filename": "foto.jpg",
    "file_path": "uploads/timeline/abc123.jpg",
    "folder": "timeline",
    "file_size": 45324,
    "mime_type": "image/jpeg",
    "alt_text": "Descrição",
    "description": "Foto histórica",
    "created_at": "2026-03-09T10:30:00",
    "updated_at": "2026-03-09T10:30:00"
  }
]
```

### Upload de Arquivo
```http
POST /api/media
Content-Type: multipart/form-data

file: <file>
folder: timeline
```

### Atualizar Metadados
```http
PUT /api/media/1
Content-Type: application/json

{
  "alt_text": "Descrição acessível",
  "description": "Descrição da imagem"
}
```

### Deletar Arquivo
```http
DELETE /api/media/1
```

## 🚀 Próximas Melhorias (Opcional)

- [ ] Busca/filtro por nome de arquivo
- [ ] Edição em lote
- [ ] Visualização de dimensões da imagem
- [ ] Compressão automática de imagens
- [ ] Drag & drop para upload
- [ ] URL relativa automaticamente gerada para cópia rápida
- [ ] Histórico de exclusões (soft delete)
