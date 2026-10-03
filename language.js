(() => {
  const storageKey = 'novaTerraLanguage.v1';
  const supported = ['fr', 'en', 'zh', 'es', 'it', 'pt', 'de', 'sw'];
  const labels = { fr: 'Français', en: 'English', zh: '中文', es: 'Español', it: 'Italiano', pt: 'Português', de: 'Deutsch', sw: 'Kiswahili' };
  const catalog = {
    'Aller au contenu principal': { en: 'Skip to main content', sw: 'Ruka hadi maudhui makuu' },
    'Navigation principale': { en: 'Main navigation', sw: 'Urambazaji mkuu' },
    'Services': { en: 'Services', sw: 'Huduma' },
    'Actualités': { en: 'News', sw: 'Habari' },
    'La communauté': { en: 'Community', sw: 'Jamii' },
    'Urgences': { en: 'Emergencies', sw: 'Dharura' },
    'Connexion': { en: 'Sign in', sw: 'Ingia' },
    'Rejoindre Nova Terra': { en: 'Join Nova Terra', sw: 'Jiunge na Nova Terra' },
    'Ouvrir le menu': { en: 'Open menu', sw: 'Fungua menyu' },
    'Fermer le menu': { en: 'Close menu', sw: 'Funga menyu' },
    'Changer le thème': { en: 'Change theme', sw: 'Badilisha mandhari' },
    'Retour à l’accueil': { en: 'Back to home', sw: 'Rudi mwanzo' },
    'Aller au formulaire principal': { en: 'Skip to the main form', sw: 'Ruka hadi fomu kuu' },
    'Espace de travail': { en: 'Workspace', sw: 'Eneo la kazi' },
    'Navigation': { en: 'Navigation', sw: 'Urambazaji' },
    'Vue d’ensemble': { en: 'Overview', sw: 'Muhtasari' },
    'Signalements': { en: 'Reports', sw: 'Ripoti' },
    'Mes demandes': { en: 'My requests', sw: 'Maombi yangu' },
    'État de la planète': { en: 'Planet status', sw: 'Hali ya sayari' },
    'Haut Conseil': { en: 'High Council', sw: 'Baraza Kuu' },
    'Contact citoyen': { en: 'Citizen contact', sw: 'Mawasiliano ya raia' },
    'Espace agent': { en: 'Staff area', sw: 'Eneo la wafanyakazi' },
    'Citoyen': { en: 'Citizen', sw: 'Raia' },
    'Actualiser': { en: 'Refresh', sw: 'Onyesha upya' },
    'Effacer les filtres': { en: 'Clear filters', sw: 'Futa vichujio' },
    'Rechercher une demande': { en: 'Search requests', sw: 'Tafuta maombi' },
    'Tous les statuts': { en: 'All statuses', sw: 'Hali zote' },
    'Toutes les priorités': { en: 'All priorities', sw: 'Vipaumbele vyote' },
    'Toutes les catégories': { en: 'All categories', sw: 'Aina zote' },
    'En cours': { en: 'In progress', sw: 'Inaendelea' },
    'Terminé': { en: 'Completed', sw: 'Imekamilika' },
    'Dossiers en attente': { en: 'Pending cases', sw: 'Kesi zinazosubiri' },
    'Demandes citoyennes': { en: 'Citizen requests', sw: 'Maombi ya raia' },
    'Rendez-vous': { en: 'Appointments', sw: 'Miadi' },
    'Déconnexion': { en: 'Sign out', sw: 'Ondoka' },
    'Bonjour,': { en: 'Hello,', sw: 'Habari,' },
    'Le pouls de': { en: 'The pulse of', sw: 'Mapigo ya' },
    'Explorer mon espace': { en: 'Explore my space', sw: 'Chunguza nafasi yangu' },
    'Découvrir les services': { en: 'Discover services', sw: 'Gundua huduma' },
    'Urgences et lieux de soin': { en: 'Emergencies and care locations', sw: 'Dharura na vituo vya huduma' },
    'Tous les lieux': { en: 'All locations', sw: 'Maeneo yote' },
    'Hôpitaux & soins': { en: 'Hospitals & care', sw: 'Hospitali na huduma' },
    'Secours': { en: 'Rescue services', sw: 'Huduma za uokoaji' },
    'Lieux frais': { en: 'Cooling centres', sw: 'Maeneo ya kupumzika kwenye ubaridi' },
    'Lieux répertoriés': { en: 'Listed locations', sw: 'Maeneo yaliyoorodheshwa' },
    'Aucun lieu dans cette catégorie.': { en: 'No locations in this category.', sw: 'Hakuna maeneo katika kundi hili.' },
    'SANTÉ & SÉCURITÉ': { en: 'HEALTH & SAFETY', sw: 'AFYA NA USALAMA' },
    'Repère les centres de soin, postes de secours et lieux de fraîcheur de la cité.': { en: 'Find the city’s care centres, rescue stations and cooling spaces.', sw: 'Tafuta vituo vya afya, vituo vya uokoaji na maeneo ya kupumzika kwenye ubaridi.' },
    'Danger immédiat ? Appelle le 112': { en: 'Immediate danger? Call 112', sw: 'Hatari ya haraka? Piga simu 112' },
    'Carte schématique interactive des urgences et hôpitaux': { en: 'Interactive schematic map of emergency services and hospitals', sw: 'Ramani shirikishi ya huduma za dharura na hospitali' },
    'Maquette illustrative : les emplacements, horaires et disponibilités ne sont pas des données officielles. En situation réelle, appelle le 112.': { en: 'Illustrative mock-up: locations, hours and availability are not official. In a real emergency, call 112.', sw: 'Mfano wa kuonyesha: maeneo, saa na upatikanaji si taarifa rasmi. Katika dharura halisi, piga simu 112.' },
    'VOTRE VILLE, À PORTÉE DE MAIN': { en: 'YOUR CITY, AT YOUR FINGERTIPS', sw: 'Jiji lako karibu nawe' },
    'Les services qui': { en: 'Services that', sw: 'Huduma zinazofanya' },
    'font la cité.': { en: 'make a city.', sw: 'jiji.' },
    'Les ressources essentielles et les équipes municipales, réunies dans un même lieu.': { en: 'Essential resources and city teams, together in one place.', sw: 'Rasilimali muhimu na timu za jiji, pamoja sehemu moja.' },
    'Voir le tableau de bord': { en: 'View dashboard', sw: 'Tazama dashibodi' },
    'Rechercher un service par nom ou besoin': { en: 'Search services by name or need', sw: 'Tafuta huduma kwa jina au hitaji' },
    'Eau & environnement': { en: 'Water & environment', sw: 'Maji na mazingira' },
    'Santé & bien-être': { en: 'Health & wellbeing', sw: 'Afya na ustawi' },
    'Énergie & habitat': { en: 'Energy & housing', sw: 'Nishati na makazi' },
    'Se déplacer': { en: 'Getting around', sw: 'Usafiri' },
    'Participer aux décisions': { en: 'Take part in decisions', sw: 'Shiriki katika maamuzi' },
    'Aide & accompagnement': { en: 'Help & support', sw: 'Msaada na usaidizi' },
    'Un besoin urgent ?': { en: 'Need urgent help?', sw: 'Unahitaji msaada wa haraka?' },
    'ÉNERGIE': { en: 'ENERGY', sw: 'NISHATI' },
    'BIEN-ÊTRE': { en: 'WELLBEING', sw: 'USTAWI' },
    'ACTUALITÉS': { en: 'NEWS', sw: 'HABARI' },
    'La cité avance': { en: 'The city moves forward', sw: 'Jiji linasonga mbele' },
    'quand chacun·e': { en: 'when everyone', sw: 'kila mtu anaposhiriki' },
    'y prend part.': { en: 'takes part.', sw: 'katika maendeleo yake.' },
    'Créer mon compte citoyen': { en: 'Create my citizen account', sw: 'Fungua akaunti yangu ya raia' },
    'Connexion à mon espace': { en: 'Sign in to my space', sw: 'Ingia kwenye akaunti yangu' },
    'Prendre soin de notre monde, ensemble.': { en: 'Caring for our world, together.', sw: 'Tunajali dunia yetu pamoja.' },
    'Tableau de bord': { en: 'Dashboard', sw: 'Dashibodi' },
    'Demandes': { en: 'Requests', sw: 'Maombi' },
    'Messages citoyens': { en: 'Citizen messages', sw: 'Ujumbe wa raia' },
    'Alertes & accès': { en: 'Alerts & access', sw: 'Arifa na ufikiaji' },
    'Journal d’activité': { en: 'Activity log', sw: 'Rekodi ya shughuli' },
    'Coordination': { en: 'Coordination', sw: 'Uratibu' },
    'SUIVI OPÉRATIONNEL': { en: 'OPERATIONS TRACKING', sw: 'UFUATILIAJI WA SHUGHULI' },
    'À traiter': { en: 'To review', sw: 'Kushughulikiwa' },
    'Priorité haute': { en: 'High priority', sw: 'Kipaumbele cha juu' },
    'Priorité normale': { en: 'Normal priority', sw: 'Kipaumbele cha kawaida' },
    'Priorité basse': { en: 'Low priority', sw: 'Kipaumbele cha chini' },
    'Toutes les catégories': { en: 'All categories', sw: 'Aina zote' },
    'Enregistrer': { en: 'Save', sw: 'Hifadhi' },
    'Annuler': { en: 'Cancel', sw: 'Ghairi' },
    'Continuer': { en: 'Continue', sw: 'Endelea' },
    'Nom complet': { en: 'Full name', sw: 'Jina kamili' },
    'Adresse e-mail': { en: 'Email address', sw: 'Barua pepe' },
    'Votre secteur': { en: 'Your district', sw: 'Eneo lako' },
    'Mot de passe': { en: 'Password', sw: 'Nenosiri' },
    'Confirmer le mot de passe': { en: 'Confirm password', sw: 'Thibitisha nenosiri' },
    'Choisir un secteur': { en: 'Choose a district', sw: 'Chagua eneo' },
    'CITOYEN': { en: 'CITIZEN', sw: 'RAIA' },
    'Agent municipal': { en: 'City staff', sw: 'Mfanyakazi wa jiji' },
  };

  const additionalTranslations = [
    ['Aller au contenu principal', '跳转到主要内容', 'Ir al contenido principal', 'Vai al contenuto principale', 'Ir para o conteúdo principal', 'Zum Hauptinhalt springen', 'Ruka hadi maudhui makuu'],
    ['Navigation principale', '主导航', 'Navegación principal', 'Navigazione principale', 'Navegação principal', 'Hauptnavigation', 'Urambazaji mkuu'],
    ['La communauté', '社区', 'Comunidad', 'Comunità', 'Comunidade', 'Gemeinschaft', 'Jamii'],
    ['Urgences', '紧急情况', 'Emergencias', 'Emergenze', 'Emergências', 'Notfälle', 'Dharura'],
    ['Connexion', '登录', 'Iniciar sesión', 'Accedi', 'Entrar', 'Anmelden', 'Ingia'],
    ['Rejoindre Nova Terra', '加入 Nova Terra', 'Unirse a Nova Terra', 'Unisciti a Nova Terra', 'Junte-se à Nova Terra', 'Nova Terra beitreten', 'Jiunge na Nova Terra'],
    ['Ouvrir le menu', '打开菜单', 'Abrir el menú', 'Apri il menu', 'Abrir o menu', 'Menü öffnen', 'Fungua menyu'],
    ['Fermer le menu', '关闭菜单', 'Cerrar el menú', 'Chiudi il menu', 'Fechar o menu', 'Menü schließen', 'Funga menyu'],
    ['Changer le thème', '切换主题', 'Cambiar el tema', 'Cambia tema', 'Alterar o tema', 'Design ändern', 'Badilisha mandhari'],
    ['Retour à l’accueil', '返回首页', 'Volver al inicio', 'Torna alla home', 'Voltar ao início', 'Zur Startseite', 'Rudi mwanzo'],
    ['Espace de travail', '工作区', 'Espacio de trabajo', 'Area di lavoro', 'Espaço de trabalho', 'Arbeitsbereich', 'Eneo la kazi'],
    ['Vue d’ensemble', '概览', 'Resumen', 'Panoramica', 'Visão geral', 'Übersicht', 'Muhtasari'],
    ['Signalements', '问题报告', 'Avisos', 'Segnalazioni', 'Comunicações', 'Meldungen', 'Ripoti'],
    ['Mes demandes', '我的请求', 'Mis solicitudes', 'Le mie richieste', 'Minhas solicitações', 'Meine Anfragen', 'Maombi yangu'],
    ['État de la planète', '星球状况', 'Estado del planeta', 'Stato del pianeta', 'Estado do planeta', 'Zustand des Planeten', 'Hali ya sayari'],
    ['Haut Conseil', '高级委员会', 'Consejo Superior', 'Alto Consiglio', 'Alto Conselho', 'Hoher Rat', 'Baraza Kuu'],
    ['Contact citoyen', '市民联系', 'Contacto ciudadano', 'Contatto cittadini', 'Contato cidadão', 'Bürgerkontakt', 'Mawasiliano ya raia'],
    ['Espace agent', '工作人员专区', 'Área del personal', 'Area operatori', 'Área da equipa', 'Mitarbeiterbereich', 'Eneo la wafanyakazi'],
    ['Citoyen', '市民', 'Ciudadano', 'Cittadino', 'Cidadão', 'Bürger', 'Raia'],
    ['Actualiser', '刷新', 'Actualizar', 'Aggiorna', 'Atualizar', 'Aktualisieren', 'Onyesha upya'],
    ['Effacer les filtres', '清除筛选条件', 'Borrar filtros', 'Cancella filtri', 'Limpar filtros', 'Filter löschen', 'Futa vichujio'],
    ['Rechercher une demande', '搜索请求', 'Buscar una solicitud', 'Cerca una richiesta', 'Pesquisar uma solicitação', 'Anfrage suchen', 'Tafuta maombi'],
    ['Tous les statuts', '所有状态', 'Todos los estados', 'Tutti gli stati', 'Todos os estados', 'Alle Status', 'Hali zote'],
    ['Toutes les priorités', '所有优先级', 'Todas las prioridades', 'Tutte le priorità', 'Todas as prioridades', 'Alle Prioritäten', 'Vipaumbele vyote'],
    ['Toutes les catégories', '所有类别', 'Todas las categorías', 'Tutte le categorie', 'Todas as categorias', 'Alle Kategorien', 'Aina zote'],
    ['En cours', '进行中', 'En curso', 'In corso', 'Em andamento', 'In Bearbeitung', 'Inaendelea'],
    ['Terminé', '已完成', 'Completado', 'Completato', 'Concluído', 'Abgeschlossen', 'Imekamilika'],
    ['Dossiers en attente', '待处理事项', 'Casos pendientes', 'Pratiche in attesa', 'Pedidos pendentes', 'Ausstehende Vorgänge', 'Kesi zinazosubiri'],
    ['Demandes citoyennes', '市民请求', 'Solicitudes ciudadanas', 'Richieste dei cittadini', 'Solicitações cidadãs', 'Bürgeranfragen', 'Maombi ya raia'],
    ['Rendez-vous', '预约', 'Citas', 'Appuntamenti', 'Marcações', 'Termine', 'Miadi'],
    ['Déconnexion', '退出登录', 'Cerrar sesión', 'Esci', 'Sair', 'Abmelden', 'Ondoka'],
    ['Explorer mon espace', '查看我的空间', 'Explorar mi espacio', 'Esplora la mia area', 'Explorar o meu espaço', 'Meinen Bereich erkunden', 'Chunguza nafasi yangu'],
    ['Découvrir les services', '了解服务', 'Descubrir los servicios', 'Scopri i servizi', 'Descobrir os serviços', 'Dienste entdecken', 'Gundua huduma'],
    ['Eau & environnement', '水与环境', 'Agua y medio ambiente', 'Acqua e ambiente', 'Água e ambiente', 'Wasser und Umwelt', 'Maji na mazingira'],
    ['Santé & bien-être', '健康与福祉', 'Salud y bienestar', 'Salute e benessere', 'Saúde e bem-estar', 'Gesundheit und Wohlbefinden', 'Afya na ustawi'],
    ['Énergie & habitat', '能源与住房', 'Energía y vivienda', 'Energia e abitazioni', 'Energia e habitação', 'Energie und Wohnen', 'Nishati na makazi'],
    ['Se déplacer', '出行', 'Desplazarse', 'Spostarsi', 'Mobilidade', 'Mobilität', 'Usafiri'],
    ['Participer aux décisions', '参与决策', 'Participar en las decisiones', 'Partecipare alle decisioni', 'Participar nas decisões', 'An Entscheidungen teilnehmen', 'Shiriki katika maamuzi'],
    ['Aide & accompagnement', '帮助与支持', 'Ayuda y asistencia', 'Aiuto e assistenza', 'Ajuda e apoio', 'Hilfe und Unterstützung', 'Msaada na usaidizi'],
    ['Tableau de bord', '控制面板', 'Panel de control', 'Pannello di controllo', 'Painel de controlo', 'Dashboard', 'Dashibodi'],
    ['Demandes', '请求', 'Solicitudes', 'Richieste', 'Solicitações', 'Anfragen', 'Maombi'],
    ['Messages citoyens', '市民留言', 'Mensajes ciudadanos', 'Messaggi dei cittadini', 'Mensagens dos cidadãos', 'Bürgernachrichten', 'Ujumbe wa raia'],
    ['Alertes & accès', '警报与访问', 'Alertas y acceso', 'Avvisi e accesso', 'Alertas e acesso', 'Warnungen und Zugang', 'Arifa na ufikiaji'],
    ['Journal d’activité', '活动日志', 'Registro de actividad', 'Registro attività', 'Registo de atividade', 'Aktivitätsprotokoll', 'Rekodi ya shughuli'],
    ['Enregistrer', '保存', 'Guardar', 'Salva', 'Guardar', 'Speichern', 'Hifadhi'],
    ['Annuler', '取消', 'Cancelar', 'Annulla', 'Cancelar', 'Abbrechen', 'Ghairi'],
    ['Continuer', '继续', 'Continuar', 'Continua', 'Continuar', 'Weiter', 'Endelea'],
    ['Nom complet', '全名', 'Nombre completo', 'Nome completo', 'Nome completo', 'Vollständiger Name', 'Jina kamili'],
    ['Adresse e-mail', '电子邮箱', 'Correo electrónico', 'Indirizzo e-mail', 'Endereço de e-mail', 'E-Mail-Adresse', 'Barua pepe'],
    ['Votre secteur', '您所在的区域', 'Tu distrito', 'Il tuo quartiere', 'O seu setor', 'Ihr Bezirk', 'Eneo lako'],
    ['Mot de passe', '密码', 'Contraseña', 'Password', 'Palavra-passe', 'Passwort', 'Nenosiri'],
    ['Confirmer le mot de passe', '确认密码', 'Confirmar la contraseña', 'Conferma password', 'Confirmar a palavra-passe', 'Passwort bestätigen', 'Thibitisha nenosiri'],
    ['Choisir un secteur', '选择区域', 'Elegir un distrito', 'Scegli un quartiere', 'Escolher um setor', 'Bezirk auswählen', 'Chagua eneo'],
    ['Langue de l’interface', '界面语言', 'Idioma de la interfaz', 'Lingua dell’interfaccia', 'Idioma da interface', 'Oberflächensprache', 'Lugha ya kiolesura'],
    ['Contraste élevé', '高对比度', 'Alto contraste', 'Contrasto elevato', 'Alto contraste', 'Hoher Kontrast', 'Utofautishaji wa juu'],
    ['Taille du texte', '文字大小', 'Tamaño del texto', 'Dimensione del testo', 'Tamanho do texto', 'Textgröße', 'Ukubwa wa maandishi'],
    ['Palette de couleurs', '颜色方案', 'Paleta de colores', 'Tavolozza dei colori', 'Paleta de cores', 'Farbpalette', 'Paleti ya rangi'],
    ['Interface simplifiée', '简化界面', 'Interfaz simplificada', 'Interfaccia semplificata', 'Interface simplificada', 'Vereinfachte Oberfläche', 'Kiolesura kilichorahisishwa'],
    ['Mode connexion lente', '低速连接模式', 'Modo de conexión lenta', 'Modalità connessione lenta', 'Modo de ligação lenta', 'Modus für langsame Verbindung', 'Hali ya muunganisho wa polepole'],
    ['Ouvrir le glossaire facile à lire', '打开简明词汇表', 'Abrir el glosario en lenguaje sencillo', 'Apri il glossario facile da leggere', 'Abrir o glossário em linguagem simples', 'Glossar in einfacher Sprache öffnen', 'Fungua faharasa rahisi'],
    ['Fermer les préférences', '关闭偏好设置', 'Cerrar preferencias', 'Chiudi preferenze', 'Fechar preferências', 'Einstellungen schließen', 'Funga mapendeleo'],
    ['Choisis la langue de l’interface.', '选择界面语言。', 'Elige el idioma de la interfaz.', 'Scegli la lingua dell’interfaccia.', 'Escolha o idioma da interface.', 'Sprache der Oberfläche auswählen.', 'Chagua lugha ya kiolesura.'],
    ['Français, anglais, chinois, espagnol, italien, portugais, allemand et kiswahili disponibles.', '提供法语、英语、中文、西班牙语、意大利语、葡萄牙语、德语和斯瓦希里语。', 'Francés, inglés, chino, español, italiano, portugués, alemán y suajili disponibles.', 'Francese, inglese, cinese, spagnolo, italiano, portoghese, tedesco e swahili disponibili.', 'Francês, inglês, chinês, espanhol, italiano, português, alemão e suaíli disponíveis.', 'Französisch, Englisch, Chinesisch, Spanisch, Italienisch, Portugiesisch, Deutsch und Swahili verfügbar.', 'Kifaransa, Kiingereza, Kichina, Kihispania, Kiitaliano, Kireno, Kijerumani na Kiswahili vinapatikana.'],
    ['Actualités', '新闻', 'Noticias', 'Notizie', 'Notícias', 'Nachrichten', 'Habari'],
    ['Tous les lieux', '所有地点', 'Todos los lugares', 'Tutti i luoghi', 'Todos os locais', 'Alle Standorte', 'Maeneo yote'],
    ['Hôpitaux & soins', '医院与医疗', 'Hospitales y atención', 'Ospedali e cure', 'Hospitais e cuidados', 'Krankenhäuser und Versorgung', 'Hospitali na huduma'],
    ['Secours', '急救', 'Emergencias', 'Soccorso', 'Socorro', 'Rettungsdienst', 'Huduma za uokoaji'],
    ['Lieux frais', '避暑场所', 'Centros de refrigeración', 'Centri di refrigerio', 'Locais frescos', 'Kühlzentren', 'Maeneo ya kupumzika kwenye ubaridi'],
    ['Lieux répertoriés', '已列地点', 'Lugares registrados', 'Luoghi elencati', 'Locais registados', 'Erfasste Standorte', 'Maeneo yaliyoorodheshwa'],
    ['Aucun lieu dans cette catégorie.', '此类别中没有地点。', 'No hay lugares en esta categoría.', 'Nessun luogo in questa categoria.', 'Não há locais nesta categoria.', 'Keine Standorte in dieser Kategorie.', 'Hakuna maeneo katika kundi hili.'],
    ['SANTÉ & SÉCURITÉ', '健康与安全', 'SALUD Y SEGURIDAD', 'SALUTE E SICUREZZA', 'SAÚDE E SEGURANÇA', 'GESUNDHEIT UND SICHERHEIT', 'AFYA NA USALAMA'],
    ['Danger immédiat ? Appelle le 112', '遇到紧急危险？请拨打 112', '¿Peligro inmediato? Llama al 112', 'Pericolo immediato? Chiama il 112', 'Perigo imediato? Ligue 112', 'Akute Gefahr? Ruf 112 an', 'Hatari ya haraka? Piga simu 112'],
    ['VOTRE VILLE, À PORTÉE DE MAIN', '您的城市，触手可及', 'TU CIUDAD, AL ALCANCE DE LA MANO', 'LA TUA CITTÀ, A PORTATA DI MANO', 'A SUA CIDADE, À DISTÂNCIA DE UM TOQUE', 'IHRE STADT, GANZ NAH', 'Jiji lako karibu nawe'],
    ['Les services qui', '让城市运转的', 'Los servicios que', 'I servizi che', 'Os serviços que', 'Die Dienste, die', 'Huduma zinazofanya'],
    ['font la cité.', '构成城市。', 'hacen ciudad.', 'fanno la città.', 'fazem a cidade.', 'eine Stadt ausmachen.', 'jiji.'],
    ['Les ressources essentielles et les équipes municipales, réunies dans un même lieu.', '重要资源与市政团队，汇聚一处。', 'Recursos esenciales y equipos municipales, reunidos en un mismo lugar.', 'Risorse essenziali e squadre comunali, riunite in un unico luogo.', 'Recursos essenciais e equipas municipais, reunidos num só lugar.', 'Wichtige Ressourcen und städtische Teams an einem Ort.', 'Rasilimali muhimu na timu za jiji, pamoja sehemu moja.'],
    ['Voir le tableau de bord', '查看控制面板', 'Ver el panel de control', 'Vai al pannello di controllo', 'Ver o painel de controlo', 'Dashboard ansehen', 'Tazama dashibodi'],
    ['Rechercher un service par nom ou besoin', '按名称或需求搜索服务', 'Buscar un servicio por nombre o necesidad', 'Cerca un servizio per nome o necessità', 'Pesquisar um serviço por nome ou necessidade', 'Dienst nach Name oder Bedarf suchen', 'Tafuta huduma kwa jina au hitaji'],
    ['Un besoin urgent ?', '需要紧急帮助？', '¿Necesitas ayuda urgente?', 'Hai bisogno di aiuto urgente?', 'Precisa de ajuda urgente?', 'Dringende Hilfe nötig?', 'Unahitaji msaada wa haraka?'],
    ['ÉNERGIE', '能源', 'ENERGÍA', 'ENERGIA', 'ENERGIA', 'ENERGIE', 'NISHATI'],
    ['BIEN-ÊTRE', '福祉', 'BIENESTAR', 'BENESSERE', 'BEM-ESTAR', 'WOHLBEFINDEN', 'USTAWI'],
    ['ACTUALITÉS', '新闻', 'NOTICIAS', 'NOTIZIE', 'NOTÍCIAS', 'NACHRICHTEN', 'HABARI'],
    ['La cité avance', '城市不断前进', 'La ciudad avanza', 'La città avanza', 'A cidade avança', 'Die Stadt entwickelt sich weiter', 'Jiji linasonga mbele'],
    ['quand chacun·e', '当每个人', 'cuando todas las personas', 'quando ognuno', 'quando cada pessoa', 'wenn alle', 'kila mtu anaposhiriki'],
    ['y prend part.', '都参与其中。', 'participa.', 'partecipa.', 'participa.', 'mitmachen.', 'katika maendeleo yake.'],
    ['Voir les actualités', '查看新闻', 'Ver noticias', 'Leggi le notizie', 'Ver notícias', 'Nachrichten ansehen', 'Tazama habari'],
    ['Créer mon compte citoyen', '创建市民账户', 'Crear mi cuenta ciudadana', 'Crea il mio account cittadino', 'Criar a minha conta de cidadão', 'Mein Bürgerkonto erstellen', 'Fungua akaunti yangu ya raia'],
    ['Connexion à mon espace', '登录我的空间', 'Acceder a mi espacio', 'Accedi alla mia area', 'Entrar no meu espaço', 'In meinem Bereich anmelden', 'Ingia kwenye akaunti yangu'],
    ['Prendre soin de notre monde, ensemble.', '携手守护我们的世界。', 'Cuidemos juntos de nuestro mundo.', 'Prendiamoci cura del nostro mondo, insieme.', 'Cuidar do nosso mundo, em conjunto.', 'Gemeinsam für unsere Welt sorgen.', 'Tunajali dunia yetu pamoja.'],
    ['CITOYEN', '市民', 'CIUDADANO', 'CITTADINO', 'CIDADÃO', 'BÜRGER', 'RAIA'],
    ['Agent municipal', '市政工作人员', 'Personal municipal', 'Operatore comunale', 'Agente municipal', 'Stadtmitarbeiter', 'Mfanyakazi wa jiji'],
  ];
  const additionalLocales = ['zh', 'es', 'it', 'pt', 'de', 'sw'];
  additionalTranslations.forEach(([source, ...translated]) => {
    const existing = catalog[source] || {};
    additionalLocales.forEach((locale, index) => {
      if (translated[index]) existing[locale] = translated[index];
    });
    catalog[source] = existing;
  });

  const originals = new WeakMap();
  const translatedValues = new WeakMap();
  const supportedSet = new Set(supported);

  function translateNode(node, language) {
    const current = node.nodeValue;
    const previousTranslation = translatedValues.get(node);
    const original = previousTranslation === current ? originals.get(node) : current;
    if (previousTranslation !== current) originals.set(node, current);
    const trimmed = original.trim();
    const translated = language === 'fr' ? null : catalog[trimmed]?.[language];
    const next = translated ? original.replace(trimmed, translated) : original;
    if (next === current) return;
    translatedValues.set(node, next);
    node.nodeValue = next;
  }

  function translateAttribute(element, attribute, language) {
    const key = `${attribute}`;
    let values = element.__novaTerraOriginalAttributes;
    if (!values) {
      values = new Map();
      Object.defineProperty(element, '__novaTerraOriginalAttributes', { value: values });
    }
    const current = element.getAttribute(attribute);
    const stored = values.get(key);
    const original = stored && stored.translation === current ? stored.original : current;
    const translation = language === 'fr' ? null : catalog[original]?.[language];
    const next = translation || original;
    values.set(key, { original, translation: next });
    if (next !== current) element.setAttribute(attribute, next);
  }

  function translateTree(root, language) {
    if (root.nodeType === Node.TEXT_NODE) {
      translateNode(root, language);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root !== document.body) return;
    if (root.matches?.('[data-language-ui], script, style, select option')) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      ['aria-label', 'placeholder', 'title'].forEach((attribute) => {
        if (root.hasAttribute(attribute)) translateAttribute(root, attribute, language);
      });
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement?.closest('[data-language-ui], script, style, select option')) translateNode(node, language);
    }
  }

  function apply(language) {
    const selected = supportedSet.has(language) ? language : 'fr';
    document.documentElement.lang = selected;
    translateTree(document.body, selected);
  }

  if (!document.querySelector('#interfaceLanguage')) {
    const label = document.createElement('label');
    label.dataset.languageUi = '';
    label.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin:12px;font:inherit;';
    label.textContent = '🌐 ';
    const control = document.createElement('select');
    control.id = 'interfaceLanguage';
    control.setAttribute('aria-label', 'Langue de l’interface');
    supported.forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = labels[code];
      control.append(option);
    });
    control.addEventListener('change', () => {
      try { localStorage.setItem(storageKey, control.value); } catch (_) { /* The selection still applies for this page. */ }
      window.dispatchEvent(new CustomEvent('nova:language-change', { detail: { language: control.value } }));
    });
    label.append(control);
    (document.querySelector('.header-actions, .top-actions, .signup-header, header') || document.body).append(label);
  }

  let saved = null;
  try { saved = localStorage.getItem(storageKey); } catch (_) { /* Keep the page language if storage is unavailable. */ }
  const languageControl = document.querySelector('#interfaceLanguage');
  const initial = supportedSet.has(saved) ? saved
    : supportedSet.has(languageControl?.value) ? languageControl.value
      : supportedSet.has(document.documentElement.lang) ? document.documentElement.lang : 'fr';
  if (languageControl) languageControl.value = initial;
  apply(initial);
  window.addEventListener('nova:language-change', (event) => {
    const selected = event.detail?.language || document.querySelector('#interfaceLanguage')?.value;
    if (supportedSet.has(selected)) apply(selected);
  });
  const observer = new MutationObserver((records) => {
    const language = document.documentElement.lang;
    records.forEach((record) => {
      if (record.type === 'characterData') translateNode(record.target, language);
      record.addedNodes.forEach((added) => translateTree(added, language));
      if (record.type === 'attributes' && record.target.nodeType === Node.ELEMENT_NODE) {
        const attribute = record.attributeName;
        if (['aria-label', 'placeholder', 'title'].includes(attribute)) translateAttribute(record.target, attribute, language);
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'placeholder', 'title'] });
})();
