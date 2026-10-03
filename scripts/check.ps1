$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$requiredFiles = @(
  "index.html",
  "config.js",
  "nova-terra.js",
  "api/requests.js",
  "docs/webcup-api.md",
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
$apiAdapter = Get-Content -LiteralPath (Join-Path $projectRoot "nova-terra.js") -Raw
$apiProxy = Get-Content -LiteralPath (Join-Path $projectRoot "api/requests.js") -Raw
$apiCollectionPath = Join-Path $projectRoot "postman/terra-nova-api.postman_collection.json"
$apiCollectionRaw = Get-Content -LiteralPath $apiCollectionPath -Raw
$apiCollection = $apiCollectionRaw | ConvertFrom-Json

if ($agentMarkup -notmatch 'id="kanban"') { throw "Kanban agent introuvable." }
if ($contactMarkup -notmatch 'id="contact-form"') { throw "Formulaire citoyen introuvable." }
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
if ($agentScript -notmatch "description") { throw "La recherche agent doit inclure la description des demandes." }
if ($publicScript -notmatch "normalizePublicSearch") { throw "La recherche publique normalisee est absente." }

Write-Host "Verification Terra Nova reussie : structure et routes attendues presentes."
