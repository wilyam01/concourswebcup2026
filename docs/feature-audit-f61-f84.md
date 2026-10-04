# Audit des fonctionnalités F61–F84

Cet audit compare les intitulés du backlog au site et au backend présents dans ce dépôt. « Déjà présente » désigne une fonction réutilisable; les XP ne sont pas des unités de livraison et ne sont pas cumulés dans le code.

| Code | État dans le dépôt | Couverture / doublon |
| --- | --- | --- |
| F61 | Déjà présente | Mode éco-conçu : appareils modestes, effets visuels réduits et chargement différé. |
| F62 | Déjà présente | Interface simplifiée et mode bas débit dans les préférences d’accessibilité. |
| F63 | Déjà présente | Arrêt d’un service réservé à l’administrateur et journalisé. |
| F64 | Déjà présente | Statut des services; l’absence d’information et l’échec de vérification sont distingués. |
| F65 | Déjà présente | Résultats de consultations partagés et votes citoyens authentifiés; consultations de démonstration définies dans le client. |
| F66 | Déjà présente | Outils de participation et avis sur des consultations; le catalogue des projets reste illustratif. |
| F67 | Ajoutée | Les propositions citoyennes ont un état de suivi modifiable par un agent ou administrateur et visible dans l’espace citoyen connecté. |
| F68 | Déjà présente | Boîte à idées, avec stockage serveur ou local explicitement annoncé. |
| F69 | Ajoutée | Dependabot propose des mises à jour hebdomadaires du backend et une vérification npm audit s’exécute chaque semaine, à chaque changement des dépendances et à la demande. Les correctifs sont proposés en revue, pas appliqués silencieusement en production. |
| F70 | Déjà présente | Rôles et contrôles d’accès côté serveur; routes administratives et données privées sont restreintes. |
| F71 | Absente | L’inscription et l’accès exigent une adresse e-mail. Retirer cette exigence implique une décision d’identité, une migration de comptes et une récupération de compte adaptée. |
| F72 | Déjà présente | Parcours d’orientation des nouveaux comptes. |
| F73 | Déjà présente | Annonces et alertes publiées selon le rôle et le secteur. |
| F74 | Ajoutée | Annuaire filtrable d’exemples d’associations et partenaires. Les entrées sont fictives et affichées comme démonstration; elles doivent être remplacées par des partenaires vérifiés. |
| F75 | Ajoutée, heuristique | L’espace agent regroupe les demandes ouvertes qui partagent une catégorie ou un service et au moins deux mots significatifs. C’est une aide au tri, pas une décision automatique ni un modèle d’IA. |
| F76 | Ajoutée | Après clôture, le citoyen peut donner une note et un commentaire. Le serveur rattache l’avis au propriétaire du signalement; l’agent le voit sur le dossier. |
| F77 | Partielle, renforcée | Une limite globale protège l’API contre les rafales, en plus des limites plus strictes par route. Le compteur est en mémoire par instance; le délestage coordonné entre instances et la montée en charge restent à la charge de l’hébergement. |
| F78 | Dépend de l’hébergement | L’API a une route de santé et SQLite en mode WAL. La redondance, la réplication et la montée en charge doivent être fournies par l’infrastructure de déploiement. |
| F79 | Déjà présente | Recherche et filtres citoyens par statut, priorité et catégorie. |
| F80 | Déjà présente | Filtres et colonnes de triage dans le tableau agent. |
| F81 | Partielle | Pièges honeypot et limitations de fréquence sur les soumissions publiques; ce n’est pas un CAPTCHA et ne remplace pas un fournisseur anti-bot en production. |
| F82 | Ajoutée | Les envois identiques récents sont refusés côté serveur; le citoyen reçoit un message qui l’invite à vérifier son historique. |
| F83 | Déjà présente | Accusé de réception et référence de suivi pour un signalement accepté. |
| F84 | Ajoutée | Les agents peuvent répondre aux messages depuis leur boîte de réception. La réponse n’est envoyée que si le fournisseur d’e-mail transactionnel est configuré. |

## Configuration requise

- F84 nécessite `RESEND_API_KEY` et `RESEND_FROM` dans l’environnement serveur; aucune clé ne doit être placée dans le navigateur.
- F74 utilise des exemples à remplacer par des fiches validées (nom, adresse, horaires, coordonnées et consentement de publication).
- F71 nécessite une décision produit sur l’identité sans e-mail, la récupération des comptes et la migration des comptes existants. F78 nécessite un hébergement adapté. Les présenter comme livrés par le seul code de la vitrine serait inexact.
- F81 conserve le honeypot et les limites de fréquence. Un CAPTCHA vérifié côté serveur exige le choix et la configuration d’un fournisseur, d’un domaine autorisé et de secrets de déploiement; aucun fournisseur n’est présumé configuré.
