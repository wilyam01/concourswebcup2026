const toast = document.querySelector('#toast');
let toastTimer;
function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    document.querySelectorAll('.report-row').forEach((row) => {
      row.hidden = filter !== 'all' && row.dataset.status !== filter;
    });
  });
});

document.querySelectorAll('.view-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    const councilView = button.dataset.view === 'council';
    document.querySelector('h1').innerHTML = councilView
      ? 'La cité, sous <span>contrôle.</span>'
      : 'Le pouls de <span>Terra Nova.</span>';
    document.querySelector('.subheading').textContent = councilView
      ? 'Vue stratégique du Haut Conseil · données consolidées en temps réel.'
      : 'Chaque signal compte. Voici ce qui se passe dans votre cité.';
    document.querySelector('.nav-item.active').classList.remove('active');
    const destination = document.querySelector(councilView ? '.nav-item[href="#council"]' : '.nav-item[href="#overview"]');
    destination.classList.add('active');
    if (councilView) document.querySelector('#council').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

document.querySelector('#voteButton').addEventListener('click', () => notify('Consultation du vote #TN-084 — consensus actuel : 72 %.'));
document.querySelectorAll('.map-point').forEach((point) => point.addEventListener('click', () => notify(`${point.getAttribute('aria-label')} · Secteur connecté.`)));
document.querySelectorAll('.map-controls button').forEach((button, index) => button.addEventListener('click', () => notify(['Carte agrandie.', 'Carte réduite.', 'Carte recentrée.'][index])));
document.querySelector('#allReports').addEventListener('click', () => {
  document.querySelector('[data-filter="all"]').click();
  notify('Affichage de tous les signalements disponibles.');
});
document.querySelector('#mobileReports').addEventListener('click', () => {
  document.querySelector('[data-filter="all"]').click();
  notify('Affichage de tous les signalements disponibles.');
});
document.querySelector('#menuButton').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
  document.querySelector('#sidebar').classList.remove('open');
}));

const profilePhotoInput = document.querySelector('#profilePhotoInput');
const profilePhotoButtons = [...document.querySelectorAll('.profile-photo-trigger')];
const profilePhotoStorageKey = 'novaTerraProfilePhoto';

function showProfilePhoto(dataUrl) {
  profilePhotoButtons.forEach((button) => {
    const image = document.createElement('img');
    image.src = dataUrl;
    image.alt = '';
    button.replaceChildren(image);
    button.setAttribute('aria-label', 'Changer la photo de profil');
    button.title = 'Changer la photo de profil';
    button.classList.add('has-profile-photo');
  });
}

try {
  const savedProfilePhoto = localStorage.getItem(profilePhotoStorageKey);
  if (savedProfilePhoto) showProfilePhoto(savedProfilePhoto);
} catch (_) {
  // A saved photo is optional when browser storage is unavailable.
}

profilePhotoButtons.forEach((button) => button.addEventListener('click', () => profilePhotoInput.click()));
profilePhotoInput.addEventListener('change', () => {
  const photo = profilePhotoInput.files?.[0];
  profilePhotoInput.value = '';
  if (!photo) return;
  if (!photo.type.startsWith('image/')) {
    notify('Choisis un fichier image pour ta photo de profil.');
    return;
  }
  if (photo.size > 8 * 1024 * 1024) {
    notify('La photo doit faire moins de 8 Mo.');
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => notify('Impossible de lire cette photo. Essaie un autre fichier.');
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => notify('Ce format d’image ne peut pas être affiché ici.');
    image.onload = () => {
      const maxDimension = 512;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        notify('Impossible de préparer cette photo.');
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      let saved = true;
      try {
        localStorage.setItem(profilePhotoStorageKey, dataUrl);
      } catch (_) {
        saved = false;
      }
      showProfilePhoto(dataUrl);
      notify(saved ? 'Photo de profil mise à jour sur cet appareil.' : 'Photo affichée, mais le navigateur ne peut pas la mémoriser.');
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(photo);
});
