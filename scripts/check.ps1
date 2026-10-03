$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$requiredFiles = @(
  "index.html",
  "config.js",
  "nova-terra.js",
  "api/requests.js",
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

$sourceFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File -Include *.html,*.js,*.css,*.md,*.yml
$mergeMarkerPattern = ("<<<" + "<<<<") + "|" + ("===" + "====") + "|" + (">>>" + ">>>>")
foreach ($sourceFile in $sourceFiles) {
  $content = Get-Content -LiteralPath $sourceFile.FullName -Raw
  if ($content -match $mergeMarkerPattern) {
    throw "Marqueur de conflit Git detecte : $($sourceFile.FullName)"
  }
}

$agentMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "agent/dashboard/index.html") -Raw
$contactMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "contact/index.html") -Raw
$apiAdapter = Get-Content -LiteralPath (Join-Path $projectRoot "nova-terra.js") -Raw
$apiProxy = Get-Content -LiteralPath (Join-Path $projectRoot "api/requests.js") -Raw

if ($agentMarkup -notmatch 'id="kanban"') { throw "Kanban agent introuvable." }
if ($contactMarkup -notmatch 'id="contact-form"') { throw "Formulaire citoyen introuvable." }
if ($apiAdapter -notmatch "citizen-messages") { throw "Endpoint des messages citoyens introuvable." }
if ($apiProxy -notmatch 'process\.env\.WEBCUP_API_KEY') { throw "La cle WebCup doit etre lue depuis une variable d'environnement serveur." }
if ($apiProxy -notmatch 'req\.method !== "GET"') { throw "Le proxy WebCup doit refuser les methodes autres que GET." }
if ($apiProxy -notmatch "normalizeRequest") { throw "Le proxy doit filtrer les champs transmis au navigateur." }

Write-Host "Verification Terra Nova reussie : structure et routes attendues presentes."
