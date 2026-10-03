$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$requiredFiles = @(
  "index.html",
  "config.js",
  "nova-terra.js",
  "api/requests.js",
  "docs/webcup-api.md",
  "docs/demo-pitch.md",
  "presentation.html",
  "presentation.css",
  "presentation-a11y.css",
  "postman/terra-nova-api.postman_collection.json",
  "postman/terra-nova.postman_environment.template.json",
  "contact/index.html",
  "agent/dashboard/index.html",
  ".github/workflows/deploy-pages.yml"
)

foreach ($relativePath in $requiredFiles) {
  $targetPath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $targetPath)) {
    throw "Fichier requis absent : $relativePath"
  }
}

$sourceFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File -Include *.html,*.js,*.css,*.md,*.yml,*.json
$mergeMarkerPattern = ("<<<" + "<<<<") + "|" + ("===" + "====") + "|" + (">>>" + ">>>>")
foreach ($sourceFile in $sourceFiles) {
  $content = Get-Content -LiteralPath $sourceFile.FullName -Raw
  if ($content -match $mergeMarkerPattern) {
    throw "Marqueur de conflit Git detecte : $($sourceFile.FullName)"
  }
}

$agentMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "agent/dashboard/index.html") -Raw
$dashboardMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "dashboard.html") -Raw
$agentScript = Get-Content -LiteralPath (Join-Path $projectRoot "agent/dashboard/agent.js") -Raw
$publicScript = Get-Content -LiteralPath (Join-Path $projectRoot "app.js") -Raw
$contactMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "contact/index.html") -Raw
$contactScript = Get-Content -LiteralPath (Join-Path $projectRoot "contact/contact.js") -Raw
$contactStyles = Get-Content -LiteralPath (Join-Path $projectRoot "contact/contact.css") -Raw
$dashboardTemplateStyles = Get-Content -LiteralPath (Join-Path $projectRoot "dashboard-template.css") -Raw
$homeMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "index.html") -Raw
$homeScript = Get-Content -LiteralPath (Join-Path $projectRoot "public.js") -Raw
$publicStyles = Get-Content -LiteralPath (Join-Path $projectRoot "public.css") -Raw
$presentationMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "presentation.html") -Raw
$presentationA11yStyles = Get-Content -LiteralPath (Join-Path $projectRoot "presentation-a11y.css") -Raw
$dashboardStyles = Get-Content -LiteralPath (Join-Path $projectRoot "styles.css") -Raw
$apiAdapter = Get-Content -LiteralPath (Join-Path $projectRoot "nova-terra.js") -Raw
$apiProxy = Get-Content -LiteralPath (Join-Path $projectRoot "api/requests.js") -Raw
$apiCollectionPath = Join-Path $projectRoot "postman/terra-nova-api.postman_collection.json"
$apiCollectionRaw = Get-Content -LiteralPath $apiCollectionPath -Raw
$apiCollection = $apiCollectionRaw | ConvertFrom-Json

if ($agentMarkup -notmatch 'id="kanban"') { throw "Kanban agent introuvable." }
if ($contactMarkup -notmatch 'id="contact-form"') { throw "Formulaire citoyen introuvable." }
if ($contactMarkup -notmatch 'id="delivery-mode"' -or $contactScript -notmatch "apiBaseUrl") { throw "Le formulaire de contact doit distinguer le mode demo de la transmission API." }
if ($contactStyles -notmatch '\.contact-page \.community-inbox-trigger \.community-inbox-label\s*\{\s*display:\s*none' -or $contactStyles -notmatch '\.contact-page \.assistant-panel\s*\{\s*right:\s*10px;\s*bottom:\s*64px') { throw "Les commandes mobiles de contact doivent rester compactes sans recouvrir le formulaire." }
if ($contactStyles -notmatch 'html\[data-theme="light"\] \.contact-page \.service-note h2' -or $contactStyles -notmatch 'html\[data-theme="light"\] \.contact-page \.service-note dd') { throw "Le panneau contact doit conserver un contraste lisible en thème clair." }
if ($contactScript -notmatch "ne sera pas transmis aux services municipaux" -or $contactScript -notmatch "aucun e-mail de suivi ne sera envoyé") { throw "Le formulaire de demonstration ne doit pas laisser croire qu'un message a ete transmis." }
if ($apiAdapter -notmatch "citizen-messages") { throw "Endpoint des messages citoyens introuvable." }
if ($apiProxy -notmatch 'process\.env\.WEBCUP_API_KEY') { throw "La cle WebCup doit etre lue depuis une variable d'environnement serveur." }
if ($apiProxy -notmatch 'req\.method !== "GET"') { throw "Le proxy WebCup doit refuser les methodes autres que GET." }
if ($apiProxy -notmatch "normalizeRequest") { throw "Le proxy doit filtrer les champs transmis au navigateur." }
if ($apiProxy -notmatch "normalizeRequests") { throw "Le proxy doit tolerer et compter les demandes corrompues." }
if ($apiAdapter -notmatch "NOVA_TERRA_REQUESTS_CACHE_KEY" -or $apiAdapter -notmatch "AbortController") { throw "Le client API doit limiter les attentes et conserver un instantane local." }
if ($apiCollection.item.Count -lt 5 -or $apiCollectionRaw -notmatch '"apiKey"') { throw "La collection Postman doit couvrir les routes officielles et le proxy." }
if ($publicScript -notmatch 'visibilitychange' -or $publicScript -notmatch 'setInterval') { throw "Le tableau public doit reprendre le polling apres un onglet inactif." }
if ($agentScript -notmatch 'visibilitychange' -or $agentScript -notmatch 'Promise.allSettled') { throw "Le tableau agent doit reprendre le polling et preserver les sources disponibles." }
foreach ($filterId in @("request-search", "status-filter", "priority-filter", "type-filter", "clear-filters", "request-count")) {
  if ($agentMarkup -notmatch "id=`"$filterId`"") { throw "Filtre ou indicateur agent absent : $filterId." }
}
foreach ($reportId in @("api-status", "reports-search", "loadMoreReports", "reports-empty", "reports-loading", "open-report-count", "nav-open-report-count")) {
  if ($dashboardMarkup -notmatch "id=`"$reportId`"") { throw "Surface publique des signalements absente : $reportId." }
}
foreach ($detailId in @("reportDialog", "reportDialogReference", "reportDialogTitle", "reportDialogDescription", "reportDialogStatus", "reportDialogPriority", "reportDialogUpdated", "reportDialogLocation", "closeReportDialog", "closeReportDialogAction")) {
  if ($dashboardMarkup -notmatch "id=`"$detailId`"") { throw "Détail du signalement absent : $detailId." }
}
if ($agentScript -notmatch "description") { throw "La recherche agent doit inclure la description des demandes." }
if ($publicScript -notmatch "normalizePublicSearch") { throw "La recherche publique normalisee est absente." }
if ($publicScript -notmatch "openReportDetails" -or $publicScript -notmatch 'row-arrow\[data-request-id\]') { throw "Les signalements publics doivent pouvoir afficher leur détail." }
$themeStyles = Get-Content -LiteralPath (Join-Path $projectRoot "theme.css") -Raw
if ($themeStyles -notmatch "\.detail-dialog" -or $themeStyles -notmatch "\.profile-dialog") { throw "Les fenêtres de détail et de profil doivent avoir une presentation dediee." }
if ($themeStyles -notmatch 'html\[data-theme="light"\] \.signup-header \.theme-toggle' -or $themeStyles -notmatch 'html\[data-theme="light"\] \.deck-nav \.theme-toggle') { throw "Les boutons de thème doivent rester lisibles dans les en-têtes clairs." }
foreach ($councilId in @("council-source", "council-priority-title", "council-priority-meta", "council-urgent-count", "council-open-summary", "reviewUrgentReports")) {
  if ($dashboardMarkup -notmatch "id=`"$councilId`"") { throw "Indicateur ou action du Haut Conseil absent : $councilId." }
}
if ($publicScript -notmatch "updateCouncilSummary" -or $publicScript -notmatch "reviewUrgentReports") { throw "Le Haut Conseil doit etre alimente par les demandes et ouvrir le filtre urgent." }
if ($publicScript -notmatch "Dernière réponse en mémoire" -or $publicScript -notmatch "instantané local") { throw "Le tableau doit distinguer les sources de secours du flux API." }
if ($apiAdapter -notmatch 'function getDemoRequests\(\)' -or $apiAdapter -notmatch 'return getDemoRequests\(\)') { throw "Les demandes fictives invalides doivent etre ignorees sans signaler une panne API." }
if ($publicScript -notmatch 'usingDemoData\s*\?\s*"Les données de démonstration') { throw "Une erreur de données fictives ne doit pas etre signalee comme une panne API." }
if ($dashboardTemplateStyles -notmatch '\.reports-panel,\s*\.report-table-wrap\s*\{\s*min-width:\s*0;\s*max-width:\s*100%' -or $dashboardTemplateStyles -notmatch '\.reports-panel\s*\{\s*overflow:\s*hidden') { throw "Le tableau des signalements doit rester contenu dans l'ecran mobile." }
if ($dashboardMarkup -notmatch "LECTURE SEULE" -or $dashboardMarkup -notmatch "Statuts non modifiables via l’API actuelle") { throw "Le Haut Conseil doit expliquer les limites d'ecriture de l'API." }
if ($dashboardMarkup -notmatch 'id="logoutButton"' -or $publicScript -notmatch "NovaTerraAuth\.signOut\(\)") { throw "L’espace citoyen doit permettre de fermer sa session." }
if ($homeMarkup -notmatch 'aria-controls="publicNav"' -or $homeMarkup -notmatch 'aria-expanded="false"') { throw "Le menu mobile public doit exposer son etat et son controle." }
if ($homeScript -notmatch "event.key === 'Escape'" -or $homeScript -notmatch "Fermer le menu") { throw "Le menu public doit etre accessible au clavier et annoncer son etat." }
if ($homeScript -notmatch "IntersectionObserver" -or $homeScript -notmatch "is-visible" -or $homeScript -notmatch "isIntersecting" -or $publicStyles -notmatch "animation-play-state:\s*paused") { throw "Les animations decoratives de l'accueil doivent etre suspendues hors ecran." }
if ($presentationMarkup -notmatch 'href="#main-content"' -or $presentationMarkup -notmatch 'id="main-content"') { throw "La présentation doit offrir un lien clavier vers le contenu principal." }
if ($presentationA11yStyles -notmatch 'font-size:\s*clamp\(36px,\s*11vw,\s*52px\)' -or $presentationA11yStyles -notmatch 'html\s*\{[^}]*scroll-behavior:\s*auto[^}]*scroll-snap-type:\s*y mandatory' -or $presentationA11yStyles -notmatch '(?s)prefers-reduced-motion:\s*reduce.*?html,\s*\.deck-body\s*\{[^}]*scroll-snap-type:\s*none') { throw "La présentation doit naviguer entre diapositives et respecter la réduction des animations." }
if ($dashboardMarkup -notmatch '<body class="dashboard-page">' -or $dashboardStyles -notmatch '@scope \(html\[data-theme="light"\] \.dashboard-page\)') { throw "Le thème clair du tableau de bord doit rester isolé des autres pages." }

Write-Host "Verification Terra Nova reussie : structure et routes attendues presentes."
