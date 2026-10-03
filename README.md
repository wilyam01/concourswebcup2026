# Terra Nova - Poste de coordination

MVP statique pour centraliser les signalements habitants et les decisions du Haut Conseil.

## Lancer localement

Ouvrir `index.html` dans un navigateur, ou utiliser un serveur statique :

```powershell
npx serve .
```

## Branchement API

Dans `app.js`, renseigner `API_BASE_URL`. L'interface attend ensuite :

```text
GET {API_BASE_URL}/requests
```

La reponse doit etre un tableau de requetes avec les proprietes :

```js
{
  id: "TN-1042",
  title: "Eclairage absent",
  location: "Quartier Horizon",
  category: "Infrastructure",
  priority: "critical", // critical | normal | low
  status: "pending", // pending | in_progress | resolved | rejected
  createdAt: "Il y a 12 min",
  description: "..."
}
```

En l'absence d'API, les donnees de demonstration restent actives. Les actions du Haut Conseil sont pour l'instant locales : elles devront appeler les routes de mise a jour lorsque l'API sera disponible.
