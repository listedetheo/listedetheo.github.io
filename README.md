# La liste de Noël de Théo

Site de liste de Noël « Nuit d'hiver » : la famille réserve un cadeau (en entier ou à plusieurs), Théo ne voit jamais qui a réservé quoi.

- **Liste publique** : `index.html`
- **Espace Théo** (ajout et modification des cadeaux) : `admin.html`
- **Données** : Supabase (tables, règles de sécurité et fonctions côté serveur)
- **Hébergement** : GitHub Pages, sans étape de compilation

## Fichiers

| Fichier | Rôle |
|---|---|
| `assets/js/config.js` | Adresse du projet Supabase et clé publique |
| `assets/js/app.js` | Liste publique : affichage, réservation, participation, code perso, partage |
| `assets/js/admin.js` | Espace Théo : connexion par lien e-mail, cadeaux, photos |
| `assets/js/scene.js` | Scène de nuit (lune, étoiles, neige, sapins) |
| `assets/css/style.css` | Style commun, téléphone et ordinateur |
| `.github/workflows/keepalive.yml` | Garde la base Supabase active (tous les 3 jours) |

## Règles importantes

- Seules l'URL du projet et la clé publique vont dans le code. Jamais la clé « secret » / « service_role ».
- Les invités n'accèdent jamais directement aux tables : tout passe par les fonctions `get_board`, `reserve`, `cancel_reservation` et `recover`.
- Connecté en propriétaire, la base ne renvoie aucun statut de réservation.
