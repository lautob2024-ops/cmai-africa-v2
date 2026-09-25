# CMAI+Africa — site web

Site du club CMAI+Africa (Club of Mathematics and Artificial Intelligence – Africa), reconstruit à partir de l'export Manus pour fonctionner **sans dépendre de Manus**, avec authentification par e-mail/mot de passe, cours à chapitres avec validation automatique, paiement Mobile Money (USSD Push), quittances PDF, communauté (fil, réactions, messagerie privée) et un tableau de bord administrateur complet.

## Démarrage rapide

```bash
npm install
cp .env.example .env     # puis renseigner JWT_SECRET, DATABASE_URL, SMTP_PASS…
npm run db:push          # crée les tables dans la base MySQL
npm run dev               # démarre le serveur (API) sur le port 3000
```
Dans un second terminal, pour le développement du frontend avec rechargement à chaud :
```bash
npm run dev:client        # Vite sur le port 5173, proxie /api vers le port 3000
```

## Mise en production
```bash
npm run build   # construit client (dist/public) et serveur (dist/index.js)
npm start       # sert le site + l'API sur le port défini par PORT
```
Le serveur sert directement les fichiers construits : un seul processus Node suffit derrière un reverse proxy (Nginx, Caddy) ou directement sur un hébergeur Node (Render, Railway, Fly.io, VPS…).

## Variables d'environnement (voir `.env.example`)
- **JWT_SECRET** : chaîne aléatoire ≥ 32 caractères (`openssl rand -hex 32`). Obligatoire en production, sinon le serveur refuse de démarrer.
- **DATABASE_URL** : `mysql://utilisateur:motdepasse@hote:3306/base`
- **UPLOAD_DIR** : dossier où sont stockés les fichiers téléversés (justificatifs, quittances, pièces jointes). Doit être un disque **persistant** chez l'hébergeur.
- **SMTP_*** : envoi des e-mails (vérification, mot de passe oublié, quittances, certificats…). Avec Gmail, utiliser un [mot de passe d'application](https://support.google.com/accounts/answer/185833).
- **PAYMENT_PROVIDER / FEDAPAY_SECRET_KEY / FEDAPAY_ENV** : passerelle Mobile Money (FedaPay). Sans clé, le paiement passe automatiquement en mode manuel (transfert + référence saisie par le membre, confirmée par un administrateur).
- **ADMIN_EMAILS** : adresses qui deviennent administrateur automatiquement à la connexion.

## Images à fournir
Le dossier `client/public/images/` contient des visuels de remplacement (dégradés) générés automatiquement pour que le site ne paraisse jamais cassé. Remplacez-les par les vraies photos, **avec exactement les mêmes noms de fichiers** :
- `logo.jpg` (et `server/assets/logo.jpg` pour le logo sur les quittances PDF)
- `slide-1.jpg` à `slide-4.jpg` (bandeau de la page d'accueil et de connexion)
- `domains.jpg` (illustration des domaines du club)
- `tabs/courses.jpg`, `tabs/payment.jpg`, `tabs/news.jpg`, `tabs/discussions.jpg`, `tabs/community.jpg`, `tabs/certificate.jpg`, `tabs/student.jpg`, `tabs/about.jpg`, `tabs/admin.jpg` (facultatif : chaque carte de l'espace membre a déjà une animation graphique de remplacement)

## Ce qui a changé par rapport à l'export Manus
- **Indépendance vis-à-vis de Manus** : authentification e-mail + mot de passe (l'OAuth Manus a été retiré), stockage des fichiers sur disque, aucune URL ni marque Manus.
- **Mot de passe oublié corrigé** : après réinitialisation, le compte est aussi marqué comme vérifié, donc la connexion fonctionne immédiatement après.
- **Cours validés automatiquement** : plus de bouton « cours terminé ». Chaque chapitre se valide tout seul quand le temps de lecture active (anti-triche : basé sur l'activité réelle du visiteur, plafonné) et le score minimal du quiz sont atteints.
- **Paiement Mobile Money en USSD Push** via FedaPay (MTN, Moov) avec repli automatique en mode manuel si la passerelle n'est pas configurée, quittance PDF générée et envoyée par e-mail à la confirmation.
- **Menu hamburger (☰)** sur toutes les pages internes et sur l'administration.
- **Cartes d'onglets illustrées et animées** sur l'espace membre.
- **Administration enrichie** : e-mails personnalisés (à un membre ou à tous, avec pièces jointes), tableau complet des membres (export CSV), retrait/suppression de membre, gestion des cours (prix, contenu, chapitres, quiz, fichiers), publications (articles, défis, bourses), suivi de progression, certificats.
- **Communauté** : fil de publications façon réseau professionnel (photos/PDF, réactions, commentaires), invitations entre membres, messagerie privée réservée aux invitations acceptées.
- **Performance** : chaque page se charge à la demande (code splitting), React Query ne réinterroge plus inutilement, en-têtes de sécurité (Helmet), compression HTTP.
- **Sécurité** : mots de passe hachés (scrypt), sessions signées, limitation du débit sur les actions sensibles, fichiers protégés par droits d'accès (un justificatif étudiant n'est visible que par son auteur et les administrateurs), CSP stricte.
- **SEO** : `/decouvrir` est la page publique indexable ; les pages de l'espace membre sont exclues de l'indexation (`robots.txt`, balises `noindex`).

## Notes
- Sans `DATABASE_URL`, le serveur démarre mais les fonctionnalités nécessitant la base restent indisponibles (le site affiche des listes vides plutôt que de planter).
- Sans `SMTP_PASS`, les e-mails ne partent pas ; le site continue de fonctionner et les actions concernées (inscription, paiement…) réussissent quand même, l'administrateur peut alors relayer l'information manuellement le temps de configurer le SMTP.
