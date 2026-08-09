# Collection de JV — contexte du projet

## Quoi
Catalogue personnel de la collection de jeux vidéo d'Olivier (1 338 jeux, 37 consoles,
6 univers/constructeurs). Application web statique en un seul fichier : `index.html`
(HTML + CSS + JS vanilla, pas de build, pas de dépendances npm). S'ouvre directement
dans un navigateur.

## Backend
Firebase (projet `collectionjv-96c80`), SDK "compat" (pas de modules ES, pour que le
fichier fonctionne même ouvert en `file://`).
- **Firestore** : source de vérité unique. Collection `games` (un document par jeu,
  id `bNNN` pour les 1 338 jeux importés d'origine, `uXXXXXX` pour les jeux ajoutés
  depuis l'appli). Collection `meta` (doc `status`) pour savoir si le catalogue de base
  a déjà été importé (import automatique au premier lancement, par lots de 400 via
  `writeBatch`).
- **Authentication** : e-mail/mot de passe, un seul compte (Olivier). Écran de connexion
  bloquant tant qu'on n'est pas identifié.
- **Pas de Firebase Storage** : les photos de jaquettes sont compressées côté navigateur
  (canvas → JPEG, ~640px, qualité 0.72) puis stockées en base64 directement dans le champ
  `img` du document Firestore. Choix délibéré pour éviter le forfait payant Blaze que
  Google impose désormais pour Storage.
- Règles Firestore nécessaires : `allow read, write: if request.auth != null;`

## Structure des données (par jeu)
`id, n (titre), p (plateforme/console), cat (univers/constructeur), y (année), g (genre),
pub (éditeur), dev (développeur), f (franchise), ed (édition), r (région), img (photo,
data URL base64 ou URL externe)`

## Design
- Thème sombre "fichier d'archive/catalogue" : fonds bruns/noirs, accents laiton (brass),
  fiche cartonnée façon carte de bibliothèque pour le détail d'un jeu.
- Polices : Anton (titres), Inter (texte/UI), Space Mono (petits éléments décoratifs
  uniquement — pas de texte long en monospace, lisibilité).
- Chaque jeu a un ratio largeur/hauteur de vignette propre à sa console (mesures réelles
  fournies par l'utilisateur, table `PLATFORM_RATIO`), pour ne pas déformer les photos.
- Code couleur par constructeur (`CAT_HEX`) : liseré coloré à gauche, pas de fond plein.

## Navigation (menu latéral, pas de dropdown)
- "Tout afficher" en haut : tous les jeux, alphabétique, sans regroupement.
- Puis un bloc par constructeur (Nintendo, Sony, Sega, Microsoft, PC, Retro 80's) —
  cliquable pour filtrer sur tout le constructeur (jeux groupés par console).
  Consoles toujours listées dessous (pas d'accordéon), cliquables individuellement
  (jeux de cette console, alphabétique).
- Ordre des consoles par constructeur : `CUSTOM_ORDER` dans le JS — ordre imposé pour
  Nintendo et Sony (pas chronologique), chronologique pour Microsoft/Sega/PC, alphabétique
  pour Retro 80's.
- Mobile (<880px) : menu cachée par défaut, tiroir glissant via bouton "☰ Consoles".

## Fonctionnalités clés
- Ajout/édition/suppression de jeu avec confirmation avant suppression (jeu et photo).
- Suppression d'un jeu : undo via toast pendant 6s.
- Champs Plateforme/Univers/Genre/Éditeur/Développeur/Franchise/Édition/Région : menus
  déroulants combo (valeurs existantes + option "+ Nouveau…" qui révèle un champ texte —
  attention, ce champ ne doit apparaître QUE quand "+ Nouveau…" est choisi, bug déjà
  corrigé une fois via une règle CSS qui écrasait l'attribut `hidden`).
- Photo cliquable sur la fiche : ouvre le sélecteur de fichier en édition ; en
  consultation, l'agrandit en plein écran (lightbox).
- Recherche avec bouton d'effacement à gauche du champ.
- Bouton flottant "remonter en haut" (apparaît après 400px de scroll).
- Bouton "Copie de secours" : exporte tout le catalogue en JSON téléchargeable.

## Conventions de travail
- Toujours répondre et coder les commentaires en français (langue de l'utilisateur).
- Olivier veut des réponses concises, directes, sans flatterie ni détours.
- Un seul fichier `index.html` — pas de séparation en plusieurs fichiers CSS/JS.
- Toujours vérifier la syntaxe JS avant de livrer (`node --check`).
