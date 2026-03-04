# 📚 Documentação - Painel Admin da Timeline

## 🔧 Configuração Inicial

### 1. Configurar GitHub Token

No arquivo `src/js/admin.js`, altere as seguintes linhas:

```javascript
const CONFIG = {
  // GitHub Configuration
  GITHUB_OWNER: 'SEU_USUARIO_GITHUB',  // ⚠️ Alterar para seu usuário do GitHub
  GITHUB_REPO: 'site-memoria-ifsul-venancio',  // ✅ Nome do repositório (já configurado)
  GITHUB_TOKEN: 'SEU_PERSONAL_ACCESS_TOKEN_AQUI',  // ⚠️ Colar seu GitHub PAT aqui
  GITHUB_BRANCH: 'main',
  // ...
};
```

**Como criar o GitHub Personal Access Token (PAT):**

1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token" → "Generate new token (classic)"
3. Defina um nome: `Admin Timeline Memorial IFSul`
4. Selecione a permissão: ✅ **repo** (Full control of private repositories)
5. Clique em "Generate token"
6. **COPIE O TOKEN** (ele só aparece uma vez!)
7. Cole no campo `GITHUB_TOKEN` no arquivo `admin.js`

### 2. Configurar Usuário do GitHub

Altere `GITHUB_OWNER` para o nome do seu usuário do GitHub (ou da organização onde o repositório está hospedado).

Exemplo:
```javascript
GITHUB_OWNER: 'ifsul-venancio',  // seu usuário do GitHub
```

### 3. Senha Atual

- **Senha configurada**: `ifsul2025`
- **Hash SHA-256**: `067c2857adcf2d7dceba07bd3ae401d63dec8780f0fc6efdb6aef4d2a4de73ae`

**Para alterar a senha:**
1. Escolha uma nova senha
2. Gere o hash SHA-256 (use: https://emn178.github.io/online-tools/sha256.html)
3. Substitua o valor de `PASSWORD_HASH` no arquivo `admin.js`

---

## 🚀 Como Usar

### Acessar o Painel

1. Acesse: `https://memoriaifsulvenancio.com.br/admin.html`
2. Digite a senha: `ifsul2025`
3. Clique em "Entrar"

### Adicionar Evento

1. Clique no botão **"➕ Adicionar Novo Evento"**
2. Preencha os campos:
   - **Data** (obrigatório): Selecione no calendário
   - **Título** (obrigatório): Nome do evento
   - **Imagem**: Faça upload OU digite o nome da imagem existente
   - **Legenda**: Fonte/créditos da imagem
   - **Texto**: Descrição detalhada
3. Clique em **"Salvar"**

### Editar Evento

1. Na tabela, clique em **"✏️ Editar"** no evento desejado
2. Modifique os campos necessários
3. Clique em **"Salvar"**

### Excluir Evento

1. Na tabela, clique em **"🗑️ Excluir"** no evento desejado
2. Confirme a exclusão
3. O evento será removido permanentemente

### Upload de Imagens

**Opção 1 - Upload via formulário:**
- Clique em "Escolher arquivo" no campo Imagem
- Selecione a imagem do seu computador
- A imagem será enviada automaticamente para `src/images/timeline/`

**Opção 2 - Usar imagem existente:**
- Digite apenas o nome do arquivo no campo de texto
- Exemplo: `imagem.jpg`
- A imagem deve estar em: `src/images/timeline/imagem.jpg`

---

## ⚙️ Como Funciona

### Fluxo de Dados

```
1. Admin acessa /admin.html
2. Autenticação via senha (client-side)
3. Sistema carrega timeline.csv do GitHub via API
4. Admin faz alterações (CRUD)
5. Sistema converte para CSV
6. GitHub API faz commit direto na branch main
7. GitHub Pages rebuilda automaticamente
8. Site público atualizado em ~1-2 minutos
```

### Estrutura de Arquivos

```
/admin.html                    # Interface do painel admin
/src/js/admin.js              # Lógica completa (auth, CRUD, GitHub API)
/src/css/admin.css            # Estilos da interface
/src/timeline.csv             # Dados da timeline (editável via admin)
/src/images/timeline/         # Pasta para imagens da timeline
/robots.txt                   # Bloqueia indexação do admin.html
```

---

## 🔒 Segurança

### Camadas de Proteção

1. **URL não divulgada**: Ninguém sabe que `/admin.html` existe
2. **robots.txt**: Bloqueia crawlers (Google, Bing, etc)
3. **Senha com hash SHA-256**: Proteção básica client-side
4. **GitHub PAT**: Token pode ser revogado a qualquer momento
5. **Histórico Git**: Todas as mudanças são rastreadas

### Limitações Conhecidas

⚠️ **Esta é uma solução client-side** - qualquer pessoa que:
- Encontre a URL `/admin.html`
- Inspecione o código-fonte
- Descubra o token ou quebre o hash

**Poderia fazer alterações.** Para uso acadêmico/interno, isso é aceitável.

### Revogar Acesso

Se o token for comprometido:
1. Acesse: https://github.com/settings/tokens
2. Encontre o token "Admin Timeline Memorial IFSul"
3. Clique em "Delete"
4. Crie um novo token e atualize no `admin.js`

---

## 🐛 Solução de Problemas

### Erro: "GitHub API Error: 401"
- **Causa**: Token inválido ou expirado
- **Solução**: Verifique se o `GITHUB_TOKEN` está correto

### Erro: "GitHub API Error: 404"
- **Causa**: Repositório ou arquivo não encontrado
- **Solução**: Verifique `GITHUB_OWNER` e `GITHUB_REPO`

### Erro ao fazer upload de imagem
- **Causa**: Arquivo muito grande (limite: 1MB via API)
- **Solução**: Reduza o tamanho da imagem antes do upload

### Senha não funciona
- **Causa**: Hash incorreto
- **Solução**: Gere novamente o hash SHA-256 da senha

### Alterações não aparecem no site
- **Causa**: GitHub Pages demora ~1-2 minutos para rebuildar
- **Solução**: Aguarde alguns minutos e limpe o cache do navegador

---

## 📝 Notas Técnicas

### Formato CSV

```csv
date,title,image,legend,text
"2005","Título do evento","imagem.jpg","Fonte: ...",""
```

### Exemplo de Commit

Cada alteração gera um commit automático:
```
[Admin] Atualização da timeline - 04/03/2026 14:32:15
```

### Rate Limits GitHub API

- **Autenticado**: 5.000 requisições/hora
- **Uso típico**: ~2-3 requisições por operação
- **Suficiente para**: Uso normal sem problemas

---

## 🆘 Suporte

### Console do Navegador

Abra o Developer Tools (F12) e veja o console para logs detalhados:
- Hash da senha digitada
- Erros da API do GitHub
- Status das operações

### Histórico no GitHub

Veja todas as alterações em:
```
https://github.com/SEU_USUARIO/site-memoria-ifsul-venancio/commits/main
```

---

## ✅ Checklist de Implementação

- [x] Criar `admin.html`
- [x] Criar `admin.css`
- [x] Criar `admin.js`
- [x] Criar `robots.txt`
- [ ] Configurar `GITHUB_OWNER` no `admin.js`
- [ ] Configurar `GITHUB_TOKEN` no `admin.js`
- [ ] Testar login
- [ ] Testar adicionar evento
- [ ] Testar editar evento
- [ ] Testar excluir evento
- [ ] Testar upload de imagem
- [ ] Verificar sincronização com GitHub
- [ ] Verificar atualização do site público

---

**✨ O painel está pronto para uso! Basta configurar o token do GitHub e começar a gerenciar a timeline.**
