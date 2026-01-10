# 🚀 Deploy Guide - GitHub Pages

## Prerequisites

- GitHub account
- Firebase project configured
- Repository pushed to GitHub

## Setup

### 1. Configure GitHub Secrets

Go to: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets with your Firebase credentials:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_DATABASE_URL`

### 2. Enable GitHub Pages

1. Go to: **Settings** → **Pages**
2. Under **Source**, select: **GitHub Actions**
3. Save

### 3. Deploy

Push to `main` branch:

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

The deployment will start automatically. Check progress in the **Actions** tab.

### 4. Access Your Game

After deployment (2-3 minutes):

```
https://YOUR_USERNAME.github.io/Prognostico/
```

## Manual Deploy (Alternative)

```bash
npm install
npm run deploy
```

## Important Notes

- The `base` path in `vite.config.ts` must match your repository name
- If you rename the repository, update the `base` value
- All Firebase credentials must be added as GitHub Secrets
- The first deployment may take 5-10 minutes

## Troubleshooting

### Blank page after deploy
Check if `base` in `vite.config.ts` matches your repository name

### Firebase connection fails
Verify all Secrets are correctly configured

### Build fails
Run `npm install` and `npm run build` locally to check for errors

### 404 error
- Ensure Pages is enabled
- Wait 2-5 minutes after first deploy
- Access the full URL with `/Prognostico/` at the end
