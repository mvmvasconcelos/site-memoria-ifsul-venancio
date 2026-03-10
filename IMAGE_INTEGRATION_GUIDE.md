# 🖼️ Guia de Integração de Imagens com o Editor

## 📋 Resumo

O sistema foi completamente refatorado para integrar o **Gerenciador de Mídia** com o **Editor de Páginas**, similar ao WordPress. Agora quando você clica no botão "Imagem" no editor, em vez de pedir uma URL manualmente, abre um modal que permite:

- ✅ Selecionar imagens já existentes no banco
- ✅ Fazer upload de novas imagens on-the-fly
- ✅ Visualizar a imagem antes de inserir
- ✅ Inserir diretamente no conteúdo da página

---

## 🚀 Passo 1: Importar Imagens Existentes

**ANTES** de usar o novo editor, importe todas as ~56 imagens existentes em `src/images/` para o banco de dados:

```bash
# Entre no container
docker-compose exec memoria-cms python import_existing_images.py
```

**Output esperado:**
```
📁 Processando imagens de subpastas...

  campus/: 15 arquivo(s)
    ✓ image1.jpeg
    ✓ image2.jpeg
    ...

  territorio/: 7 arquivo(s)
    ✓ image1.jpeg
    ...

  trabalhos/: 4 arquivo(s)
    ✓ image1.png
    ...

📁 Processando imagens da raiz...

  raiz/: 30 arquivo(s)
    ✓ image1.png
    ...

✅ Importação concluída!
   ✓ Importadas: 56
   ⊘ Puladas: 0
```

---

## 🎯 Passo 2: Usar o Editor com o Novo Seletor de Imagens

### 2.1 Editar uma Página

1. Vá para **Gerenciar Páginas** no admin
2. Clique em **Editar** em qualquer página (ex: Campus, Território, etc.)
3. No editor de conteúdo visual (WYSIWYG), coloque o cursor onde deseja a imagem
4. Clique no botão **"Imagem"** na toolbar

### 2.2 Abra o Modal de Seleção

O modal abre com duas abas:

#### **Aba 1: Selecionar** (padrão)
- **Filtro por pasta:** campus, território, timeline, trabalhos
- **Busca:** Digite o nome do arquivo para filtrar
- **Grid de imagens:** Clique em qualquer miniatura para selecionar
- **Preview:** Visualize a imagem selecionada e informações
- **Botão "Recarregar":** Para sincronizar novas imagens do BD

#### **Aba 2: Upload**
- **Escolher imagem:** Selecione o arquivo da sua máquina
- **Pasta:** Escolha em qual pasta armazenar
- **Texto Alternativo:** (opcional) Alt-text para acessibilidade
- **Descrição:** (opcional) Descrição adicional
- **Botão "Fazer Upload":** Faz upload and mostra na aba Selecionar

### 2.3 Inserir a Imagem

1. Selecione uma imagem (a imagem é preview na direita)
2. Clique em **"✓ Inserir Imagem"**
3. A imagem será inserida no editor de forma automática
4. Salve a página normalmente com **"Salvar Conteúdo"**

---

## 📦 Características Técnicas

### Backend

**Arquivo:** [backend/app/routes/media.py](backend/app/routes/media.py)

**Endpoints:**

- `GET /api/media` - Lista todas as imagens (com filtro por pasta)
- `POST /api/media` - Upload de nova imagem
- `GET /api/media/<id>` - Detalhes de uma imagem
- `PUT /api/media/<id>` - Atualizar metadados (alt_text, description)
- `DELETE /api/media/<id>` - Deletar imagem
- `GET /api/media/list-for-editor` - Lista formatada para o seletor (sem autenticação)
- `GET /media/serve/<path>` - Serve arquivo físico (sem autenticação)

**Banco de dados:**

Tabela `media_file` com colunas:
- `id` (Primary Key)
- `filename` (original)
- `file_path` (path relativo em uploads/)
- `folder` (campus, territorio, timeline, trabalhos)
- `file_size` (bytes)
- `mime_type` (image/jpeg, etc)
- `description` (texto livre)
- `alt_text` (acessibilidade)
- `created_at`, `updated_at`

### Frontend

**Arquivo:** [src/js/admin-cms.js](src/js/admin-cms.js)

**Funções principais:**

- `openImagePickerModal()` - Abre o modal
- `loadImagesForPicker()` - Carrega imagens da API
- `selectImageForEditor()` - Marca imagem selecionada
- `insertSelectedImage()` - Insere no editor (document.execCommand)
- `handleImagePickerUpload()` - Faz upload de nova imagem
- `attachImagePickerListeners()` - Inicializa event listeners

**Arquivo:** [admin.html](admin.html)

- Modal `#imagePickerModal` com abas e grid

**Arquivo:** [src/css/admin.css](src/css/admin.css)

- Estilos do `.image-picker-modal`, `.image-picker-grid`, etc.

---

## 🔄 Fluxo Descritivo

```
Editor de Páginas (Visual)
         ↓
    Clica "Imagem"
         ↓
  openImagePickerModal()
         ↓
  Modal abre na aba "Selecionar"
         ↓
  loadImagesForPicker() → Faz request a /api/media/list-for-editor
         ↓
  API retorna: [{id, filename, url (GET /media/serve/...), folder, ...}]
         ↓
  Renderiza grid com miniaturas
         ↓
   [Usuário clica em imagem] OU [Faz upload novo]
         ↓
      [Selecionar]              [Upload]
         ↓                            ↓
   selectImageForEditor()    handleImagePickerUpload() 
         ↓                            ↓
   Atualiza preview        POST /api/media (FormData)
         ↓                            ↓
   Habilita botão              Nova imagem criada
        "Inserir"             Modal volta a "Selecionar"
         ↓                            ↓
   [Clica "Inserir"]         selectImageForEditor()
         ↓                            ↓
insertSelectedImage()         Insere imagem
         ↓
document.execCommand('insertImage', false, url)
         ↓
Editor mostra <img src="/media/serve/uploads/...">
         ↓
Usuário salva página com "Salvar Conteúdo"
         ↓
PUT /api/pages/<id> com content (incluindo tag <img>)
         ↓
Página atualizada no BD e publicada
```

---

## ✅ Exemplo de Uso Prático

### Cenário: Adicionar imagem ao Campus

1. Admin clica em **Gerenciar Páginas** → **Editar** (Campus)
2. Editor abre, usuário digita texto sobre o campus
3. Posiciona cursor onde quer a imagem
4. Clica no botão **"Imagem"** da toolbar
5. **Modal abre:**
   - Aba "Selecionar" está ativa
   - Filtro já mostra "Todos"
   - Grid carrega imagens (incluindo as 15 do campus)
6. **Encontra a imagem:**
   - Busca "campus" para filtrar
   - Clica em uma imagem (ex: "image5.jpeg")
   - Preview mostra a imagem na direita
7. **Insere:**
   - Clica "✓ Inserir Imagem"
   - Modal fecha
   - Imagem aparece no editor onde estava o cursor
8. **Salva:**
   - Clica "Salvar Conteúdo"
   - Página é salva com a imagem

---

## 🎓 Outras Características

### Dashboard
- Card mostrando "Arquivos de Mídia: X"
- Contagem atualizada após upload/delete

### Pré-visualizações
- Ao editar página, imagens aparecem corretamente no Preview (modo Preview)
- URLs são renderizadas como `/media/serve/uploads/campus/...`

### Histórico
- Uploads/deletadas são rastreados na tabela `content_history`

### Validações
- ✅ Apenas imagens permitidas: jpg, jpeg, png, webp, gif
- ✅ Pastas válidas: campus, territorio, timeline, trabalhos
- ✅ Tamanho máximo: 5MB (configurável em Flask config)

---

## 📝 Checklist de Conclusão

- [ ] Ran `import_existing_images.py` com sucesso
- [ ] Verificou que ~56 imagens foram importadas
- [ ] Acessou admin e viu novo painel "🖼️ Mídia"
- [ ] Testou editar página e clicou em "Imagem"
- [ ] Modal abriu corretamente com 2 abas
- [ ] Conseguiu selecionar imagem existente
- [ ] Conseguiu fazer upload de nova imagem
- [ ] Inseriu imagem no editor com sucesso
- [ ] Salvou página e imagem aparece no público
- [ ] Testou em mobile (responsivo)

---

## 🔧 Troubleshooting

| Problema | Solução |
|----------|---------|
| Modal não abre | Verifique se `attachImagePickerListeners()` foi chamada |
| Imagens não carregam | Verifique `GET /media/serve/<path>` (público, sem auth) |
| Upload falha | Verifique pasta é válida e permissões em `/uploads/` |
| Imagem não inserida | Clique no grid e depois em "Inserir", não em Preview |
| Imagens antigas não aparecem | Rode `import_existing_images.py` no container |

---

## 📚 Arquivos Modificados/Criados

| Arquivo | Tipo | Alteração |
|---------|------|-----------|
| [import_existing_images.py](import_existing_images.py) | ✨ NOVO | Script de importação |
| [backend/app/routes/media.py](backend/app/routes/media.py) | 🔄 MODIFICADO | +endpoints list-for-editor e serve |
| [backend/app/__init__.py](backend/app/__init__.py) | 🔄 MODIFICADO | +registro de public_bp |
| [admin.html](admin.html) | 🔄 MODIFICADO | +modal imagePickerModal |
| [src/css/admin.css](src/css/admin.css) | 🔄 MODIFICADO | +estilos image-picker-* |
| [src/js/admin-cms.js](src/js/admin-cms.js) | 🔄 MODIFICADO | +funções imagem picker + integração com editor |

---

## 🎉 Pronto!

O sistema de imagens está completamente integrado. Usuários agora podem gerenciar imagens e inseri-las no editor como se estivessem usando WordPress! 

**Próximos passos sugeridos:**
- Testar fluxo completo em produção
- Treinar equipe na nova interface
- Monitorar crescimento de uploads/
- Realizar backups regulares
