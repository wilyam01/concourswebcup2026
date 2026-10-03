# Terra Nova - Poste de coordination

MVP statique pour les citoyens et les agents municipaux de Terra Nova.

## Lancer localement

Ouvrir `index.html` dans un navigateur, ou utiliser un serveur statique :

```powershell
npx serve .
```

## Pages disponibles

- `index.html` : tableau citoyen existant
- `contact/index.html` : formulaire de contact citoyen
- `agent/dashboard/index.html` : back-office agents, Kanban et messages recus

## Branchement API Nova Terra

Dans `nova-terra.js`, renseigner `NOVA_TERRA_API_BASE_URL`. L'interface utilise ensuite :

```text
GET   {API_BASE_URL}/requests
PATCH {API_BASE_URL}/requests/{id}          body: { "status": "todo" | "in_progress" | "done" }
GET   {API_BASE_URL}/citizen-messages
POST  {API_BASE_URL}/citizen-messages       body: { name, email, category, subject, message }
```

`GET /requests` peut renvoyer directement un tableau ou un objet avec `requests`, `data` ou `items`. Chaque demande doit fournir :

```js
{
  id: "TN-1042",
  title: "Eclairage absent",
  district: "Quartier Horizon", // `location` ou `zone` sont aussi acceptes
  type: "Infrastructure", // `category` est aussi accepte
  priority: "high", // high | normal | low
  status: "todo", // todo | in_progress | done
  createdAt: "Il y a 12 min",
  description: "..."
}
```

En l'absence d'API, les donnees de demonstration restent actives. Les formulaires et deplacements de cartes Kanban sont alors memorises dans le navigateur avec `localStorage`.
