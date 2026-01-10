# 🚀 Guia de Deploy - GitHub Pages

## ✅ Mudanças Implementadas

1. **Tempo de inatividade reduzido**: Salas inativas são removidas após **5 minutos**
2. **Configuração para GitHub Pages**: 
   - `vite.config.ts` com base path correto
   - Script de deploy no `package.json`
   - GitHub Actions para deploy automático

---

## 📋 Passos para Deploy

### 1️⃣ Criar Repositório no GitHub

```bash
# Inicializar git (se ainda não foi feito)
cd "E:\Vscode Projetos\Prognostico\Progsnostico"
git init

# Adicionar arquivos
git add .
git commit -m "Initial commit - Prognostico card game"

# Criar repositório no GitHub (via web):
# - Acesse https://github.com/new
# - Nome: Prognostico
# - Deixe PÚBLICO
# - NÃO adicione README, .gitignore ou licença

# Conectar ao repositório remoto
git remote add origin https://github.com/SEU_USUARIO/Prognostico.git
git branch -M main
git push -u origin main
```

### 2️⃣ Configurar Secrets no GitHub

Vá em: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Adicione cada variável do seu `.env`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_DATABASE_URL`

**⚠️ IMPORTANTE**: Copie os valores exatos do seu arquivo `.env`

### 3️⃣ Habilitar GitHub Pages

1. Vá em: **Settings** → **Pages**
2. Em **Source**, selecione: **GitHub Actions**
3. Salve

### 4️⃣ Deploy Automático

O deploy acontecerá automaticamente quando você fizer push para `main`:

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push
```

Acompanhe em: **Actions** tab no GitHub

### 5️⃣ Acessar o Jogo

Após o deploy (2-3 minutos):

```
https://SEU_USUARIO.github.io/Prognostico/
```

---

## 🔧 Deploy Manual (Alternativo)

Se preferir deploy manual sem GitHub Actions:

```bash
# Instalar gh-pages
npm install

# Build e deploy
npm run deploy
```

**Nota**: Configure o repositório remoto e habilite Pages antes.

---

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Deploy manual
npm run deploy
```

---

## 📝 Configurações Importantes

### vite.config.ts
```typescript
base: '/Prognostico/'  // Nome do seu repositório
```

**Se mudar o nome do repo**, atualize o `base` no `vite.config.ts`.

### Firebase Rules

Certifique-se de que as regras estão publicadas no Firebase Console:

1. Acesse: https://console.firebase.google.com
2. Vá em: **Realtime Database** → **Rules**
3. Cole o conteúdo de `firebase-rules.json`
4. **Publicar**

---

## ❗ Troubleshooting

### Problema: Página em branco após deploy
**Solução**: Verifique se o `base` em `vite.config.ts` está correto

### Problema: Firebase não conecta
**Solução**: Verifique se todos os Secrets estão corretos no GitHub

### Problema: Build falha
**Solução**: Execute `npm install` e `npm run build` localmente primeiro

### Problema: 404 ao acessar
**Solução**: 
- Verifique se Pages está habilitado
- Aguarde 2-5 minutos após o primeiro deploy
- Acesse a URL completa com `/Prognostico/` no final

---

## 🎮 Pronto!

Seu jogo está online e acessível para qualquer pessoa jogar!

Compartilhe a URL: `https://SEU_USUARIO.github.io/Prognostico/`
