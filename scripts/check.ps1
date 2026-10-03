$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$requiredFiles = @(
  "index.html",
  "eco-mode.js",
  "config.js",
  "nova-terra.js",
  "api/requests.js",
  "docs/webcup-api.md",
  "docs/demo-pitch.md",
  "docs/personne-3-runbook.md",
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

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $javaScriptFiles = Get-ChildItem -LiteralPath $projectRoot -Recurse -File -Filter *.js |
    Where-Object { $_.FullName -notmatch '[\\/](node_modules|concourswebcup2026-main)[\\/]' }
  foreach ($javaScriptFile in $javaScriptFiles) {
    & $node.Source --check $javaScriptFile.FullName
    if ($LASTEXITCODE -ne 0) {
      throw "Syntaxe JavaScript invalide : $($javaScriptFile.FullName)"
    }
  }
}

$agentMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "agent/dashboard/index.html") -Raw
$agentAdminScript = Get-Content -LiteralPath (Join-Path $projectRoot "agent/dashboard/agent-admin.js") -Raw
$backendServer = Get-Content -LiteralPath (Join-Path $projectRoot "backend/src/server.js") -Raw
$dashboardMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "dashboard.html") -Raw
$agentScript = Get-Content -LiteralPath (Join-Path $projectRoot "agent/dashboard/agent.js") -Raw
$publicScript = Get-Content -LiteralPath (Join-Path $projectRoot "app.js") -Raw
$contactMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "contact/index.html") -Raw
$contactScript = Get-Content -LiteralPath (Join-Path $projectRoot "contact/contact.js") -Raw
$contactStyles = Get-Content -LiteralPath (Join-Path $projectRoot "contact/contact.css") -Raw
$dashboardTemplateStyles = Get-Content -LiteralPath (Join-Path $projectRoot "dashboard-template.css") -Raw
$homeMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "index.html") -Raw
$homeScript = Get-Content -LiteralPath (Join-Path $projectRoot "public.js") -Raw
$ecoModeScript = Get-Content -LiteralPath (Join-Path $projectRoot "eco-mode.js") -Raw
$communityScript = Get-Content -LiteralPath (Join-Path $projectRoot "community.js") -Raw
$cityDataScript = Get-Content -LiteralPath (Join-Path $projectRoot "city-data.js") -Raw
$deployWorkflow = Get-Content -LiteralPath (Join-Path $projectRoot ".github/workflows/deploy-pages.yml") -Raw
$publicStyles = Get-Content -LiteralPath (Join-Path $projectRoot "public.css") -Raw
$presentationMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "presentation.html") -Raw
$presentationA11yStyles = Get-Content -LiteralPath (Join-Path $projectRoot "presentation-a11y.css") -Raw
$dashboardStyles = Get-Content -LiteralPath (Join-Path $projectRoot "styles.css") -Raw
$apiAdapter = Get-Content -LiteralPath (Join-Path $projectRoot "nova-terra.js") -Raw
$loginMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "connexion.html") -Raw
$signupMarkup = Get-Content -LiteralPath (Join-Path $projectRoot "inscription.html") -Raw
$loginScript = Get-Content -LiteralPath (Join-Path $projectRoot "login.js") -Raw
$signupScript = Get-Content -LiteralPath (Join-Path $projectRoot "signup.js") -Raw
$appointmentsScript = Get-Content -LiteralPath (Join-Path $projectRoot "appointments.js") -Raw
$accessibilityScript = Get-Content -LiteralPath (Join-Path $projectRoot "accessibility.js") -Raw
$assistantScript = Get-Content -LiteralPath (Join-Path $projectRoot "assistant.js") -Raw
$apiProxy = Get-Content -LiteralPath (Join-Path $projectRoot "api/requests.js") -Raw
$apiCollectionPath = Join-Path $projectRoot "postman/terra-nova-api.postman_collection.json"
$apiCollectionRaw = Get-Content -LiteralPath $apiCollectionPath -Raw
$apiCollection = $apiCollectionRaw | ConvertFrom-Json

if ($agentMarkup -notmatch 'id="kanban"') { throw "Kanban agent introuvable." }
if ($agentMarkup -notmatch 'id="auditNavLink"' -or $agentAdminScript -notmatch "auditCard.hidden = false" -or $agentAdminScript -notmatch "user.profile === 'agent'") { throw "Le journal F48 doit être visible et accessible aux agents." }
if ($backendServer -notmatch "app.get\('/api/audit-logs', authenticate, allowRoles\('ADMIN', 'AGENT'\)" -or $backendServer -notmatch "const agentCategories") { throw "L'API d'audit doit autoriser les agents avec une liste de catégories dédiée." }
$agentAuditPolicy = [regex]::Match($backendServer, '(?s)const agentCategories = \{(.*?)\};').Groups[1].Value
if (-not $agentAuditPolicy -or $agentAuditPolicy -match '\b(auth|contact|account):' -or $agentAuditPolicy -notmatch "account\.access_changed" -or $agentAuditPolicy -notmatch "account\.role_changed") { throw "L'API d'audit agent doit limiter les événements aux changements opérationnels et d'accès." }
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
if ($publicScript -notmatch 'visibilitychange' -or $publicScript -notmatch 'schedulePolling') { throw "Le tableau public doit reprendre le polling apres un onglet inactif." }
if ($agentScript -notmatch 'visibilitychange' -or $agentScript -notmatch 'Promise.allSettled' -or $agentScript -notmatch 'schedulePolling' -or $agentAdminScript -notmatch 'NovaTerraEco\.schedulePolling') { throw "Le tableau agent doit reprendre le polling et respecter le mode bas débit." }
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
$sitePages = @(
  @{ Path = "index.html"; Script = "eco-mode.js" },
  @{ Path = "connexion.html"; Script = "eco-mode.js" },
  @{ Path = "inscription.html"; Script = "eco-mode.js" },
  @{ Path = "dashboard.html"; Script = "eco-mode.js" },
  @{ Path = "contact/index.html"; Script = "../eco-mode.js" },
  @{ Path = "agent/dashboard/index.html"; Script = "../../eco-mode.js" },
  @{ Path = "presentation.html"; Script = "eco-mode.js" }
)
if ($deployWorkflow -notmatch "rsync -a --exclude='.git/' --exclude='concourswebcup2026-main/'" -or $deployWorkflow -notmatch 'path: \$\{\{ runner\.temp \}\}/pages') { throw "Le déploiement Pages doit exclure la copie historique non utilisée du site." }
foreach ($page in $sitePages) {
  $markup = Get-Content -LiteralPath (Join-Path $projectRoot $page.Path) -Raw
  if ($markup -notmatch [regex]::Escape($page.Script)) { throw "Le mode éco-conçu doit être chargé sur $($page.Path)." }
  if ($markup -match "fonts\.googleapis\.com|fonts\.gstatic\.com") { throw "La page $($page.Path) ne doit pas charger de polices tierces." }
}
if ($ecoModeScript -notmatch "effectiveType" -or $ecoModeScript -notmatch "saveData" -or $ecoModeScript -notmatch "deviceMemory" -or $ecoModeScript -notmatch "measureTransfer" -or $ecoModeScript -notmatch "loading = critical \? 'eager' : 'lazy'") { throw "La détection bas débit, le bilan mesuré et les médias différés sont requis." }
if ($homeMarkup -notmatch 'data-service-id="water"' -or $communityScript -notmatch "Status not reported" -or $communityScript -notmatch "classList.add\('unknown'\)") { throw "Les états de service publics doivent distinguer une absence de statut d'une panne de vérification." }
if ($ecoModeScript -notmatch "300_000" -or $ecoModeScript -notmatch "schedulePolling" -or $communityScript -notmatch "schedulePolling") { throw "Les rafraîchissements doivent ralentir explicitement en mode bas débit." }
if ($agentMarkup -notmatch 'id="serviceKillSwitchCard"' -or $agentAdminScript -notmatch "user.profile !== 'admin'" -or $backendServer -notmatch "ADMIN_REQUIRED_FOR_KILL_SWITCH") { throw "L’arrêt rapide d’un service doit être réservé aux administrateurs côté interface et serveur." }
if ($cityDataScript -notmatch "admin_required_for_kill_switch" -or $backendServer -notmatch "current\.service_status === 'unavailable'") { throw "Seul un administrateur peut rétablir un service arrêté." }
if ($backendServer -match 'authorEmail:\s*row\.author_email|u\.email AS author_email' -or $backendServer -notmatch 'normalize_sector\(a\.target_sector\)=normalize_sector\(\?\)') { throw "Les annonces publiques ne doivent pas exposer les e-mails et doivent comparer les secteurs sans tenir compte de la casse." }
if ($cityDataScript -notmatch 'minute !== 0 && minute !== 30' -or $cityDataScript -notmatch 'hour === 16 && minute > 30') { throw "Les créneaux locaux doivent appliquer les mêmes règles de disponibilité que l’API." }
if ($loginMarkup -match 'Maquette de connexion|authentification n’est pas encore activée' -or $signupMarkup -match 'Maquette de préinscription|Aucune donnée n’est envoyée ni conservée') { throw "Les parcours locaux d'inscription et de connexion ne doivent pas être présentés comme désactivés." }
if ($loginScript -notmatch 'NovaTerraAuth\.signIn' -or $signupScript -notmatch 'NovaTerraAuth\.createAccount' -or $signupScript -notmatch 'Compte local de démonstration') { throw "Les formulaires de compte doivent rester reliés à l'authentification locale ou serveur et annoncer leur mode." }
if ($loginScript -notmatch 'forgot_server' -or $loginScript -notmatch 'window\.NovaTerraApi\?\.enabled \? .forgot_server. : .forgot_local.') { throw "Le bouton de récupération doit distinguer les limites du mode serveur et du compte local." }
if ($appointmentsScript -notmatch "nova:language-change', updateAppointmentCopy" -or $appointmentsScript -notmatch 'Local bookings stay in this browser' -or $appointmentsScript -notmatch 'Les réservations locales restent dans ce navigateur') { throw "Les rendez-vous doivent conserver leur mode de stockage exact après un changement de langue." }
if ($accessibilityScript -match '8 a\.m\. and 5 p\.m\.' -or $assistantScript -notmatch 'window\.NovaTerraApi\?\.enabled') { throw "Les aides doivent annoncer les horaires et le mode de compte réellement actifs." }

Write-Host "Verification Terra Nova reussie : structure et routes attendues presentes."
