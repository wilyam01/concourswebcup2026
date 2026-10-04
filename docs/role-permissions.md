# Navigation et niveaux d’accès

Les espaces affichent une catégorie à la fois. La navigation du tableau citoyen conserve la catégorie sélectionnée dans le fragment d’URL (`#citizenServices`, `#my-requests`, etc.) afin qu’un lien puisse rouvrir directement cette vue. Le menu de l’espace équipe fonctionne de la même façon. Retour/avance du navigateur restaure la catégorie.

## Niveaux

| Rôle | Navigation et fonctions visibles |
| --- | --- |
| **Citoyen** | Catalogue et état des services, signalements publics et personnels, soutien aux demandes ouvertes, rendez-vous personnels, consultations et propositions, alertes et réglages de son propre compte. Il peut exporter ou supprimer ses données et déposer une demande de confidentialité. |
| **Agent** | Espace équipe : demandes à traiter, boîte de réception et réponses, rendez-vous qui lui sont attribués, annonces limitées à un secteur, suspension/rétablissement de comptes citoyens et journal opérationnel limité. Il ne peut pas attribuer des rôles, publier à toute la ville, couper un service, traiter le registre complet de confidentialité, ni consulter les événements privés d’authentification. |
| **Administrateur** | Fonctions d’équipe et administration : gestion des rôles et accès, annonces globales, arrêt/rétablissement des services, traitement du registre complet de confidentialité, indicateurs globaux et journal d’audit complet. Il ne peut pas modifier son propre rôle ou suspendre son propre compte. |

L’administration étend les pouvoirs de gestion; les fonctions personnelles (réservation citoyenne, vote ou suppression de son compte) restent associées au rôle citoyen. L’inscription publique crée uniquement un compte citoyen. Seul un administrateur peut promouvoir un compte depuis la gestion des comptes.

## Contrôle des droits

Les catégories et boutons masqués dans le navigateur facilitent l’usage, mais ne protègent pas les données. Le backend vérifie la session, le rôle, le propriétaire du dossier et, pour les agents, l’affectation du rendez-vous sur les routes sensibles. La promotion de rôle, les données globales et les commandes d’arrêt de service sont donc également restreintes côté API. En mode local de démonstration, les comptes et les annonces restent dans le navigateur et ne constituent pas des comptes de production.
