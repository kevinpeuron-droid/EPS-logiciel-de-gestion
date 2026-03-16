# Instructions pour migrer vers Next.js 14 et Vercel

Cette application a été générée dans un environnement React/Vite pour la prévisualisation en direct. Voici les instructions exactes pour l'adapter à **Next.js 14 (App Router)** et la déployer sur **Vercel** avec le support **PWA**.

## 1. Initialiser le projet Next.js

```bash
npx create-next-app@latest eps-master
# Choisir: TypeScript (Yes), ESLint (Yes), Tailwind CSS (Yes), src/ directory (Yes), App Router (Yes)
cd eps-master
npm install firebase lucide-react clsx tailwind-merge date-fns @google/genai
npm install -D next-pwa
```

## 2. Configuration PWA (next.config.js)

Créez ou modifiez votre `next.config.js` à la racine :

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
};

module.exports = withPWA(nextConfig);
```

## 3. Variables d'environnement (.env.local)

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_FIREBASE_API_KEY=votre_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_projet
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_projet.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id

# Pour l'IA Gemini
GEMINI_API_KEY=votre_cle_gemini
```

## 4. Structure des dossiers (App Router)

Adaptez la structure générée ici vers le App Router :

*   `src/app/layout.tsx` : Remplace `index.html` et `Layout.tsx`. Ajoutez les balises `<meta>` pour la PWA (theme-color, manifest).
*   `src/app/page.tsx` : Remplace `Sessions.tsx`.
*   `src/app/students/page.tsx` : Remplace `Students.tsx`.
*   `src/app/evaluations/page.tsx` : Remplace `Evaluations.tsx`.
*   `src/app/facilities/page.tsx` : Remplace `Facilities.tsx`.
*   `src/components/` : Copiez les composants `FileUpload.tsx` et `StudentHealthBadge.tsx` tels quels (ajoutez `"use client";` en haut des fichiers car ils utilisent des hooks React).
*   `src/lib/firebase.ts` : Initialisez Firebase avec les variables `NEXT_PUBLIC_`.

## 5. Activer Firebase Storage

1.  Allez sur la [Console Firebase](https://console.firebase.google.com/).
2.  Dans le menu de gauche, cliquez sur **Storage** puis sur **Commencer**.
3.  Démarrez en mode test (ou configurez vos règles de sécurité).
4.  Modifiez les règles de Storage pour autoriser les uploads :

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 10 * 1024 * 1024 && request.resource.contentType.matches('application/pdf');
    }
  }
}
```

## 6. Déploiement sur Vercel

1.  Poussez votre code sur GitHub :
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/VOTRE_USERNAME/eps-master.git
    git push -u origin main
    ```
2.  Allez sur [Vercel](https://vercel.com/) et connectez-vous avec GitHub.
3.  Cliquez sur **Add New... > Project**.
4.  Importez votre dépôt `eps-master`.
5.  Dans la section **Environment Variables**, ajoutez toutes les variables de votre `.env.local`.
6.  Cliquez sur **Deploy**.

Votre PWA sera en ligne et installable sur les tablettes et smartphones des professeurs !
