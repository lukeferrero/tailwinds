let currentApartmentId = null;
let currentApartmentName = null;
let allApartments = [];
let imageConfig = {};

// ===== GESTIONE TAB =====

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
  
  if (tabName === 'images') loadImageConfig();
}

// ===== SCHERMATA LISTA =====

function loadApartments() {
  fetch('/api/appartamenti')
    .then(res => res.json())
    .then(data => {
      allApartments = data;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('tableContainer').style.display = 'block';
      
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #999;">Nessun appartamento</td></tr>';
        return;
      }
      
      data.forEach((apt, idx) => {
        const row = document.createElement('tr');
        const statusClass = apt.venduto === 'Sì' ? 'status-sold' : 'status-available';
        const statusText = apt.venduto === 'Sì' ? '✓ Venduto' : '📍 Disponibile';
        
        row.innerHTML = `
          <td><strong>${apt.nome}</strong></td>
          <td>${apt.dimensione || '-'}</td>
          <td>€ ${apt.prezzo || '-'}</td>
          <td><span style="padding: 6px 12px; border-radius: 4px; font-weight: 600; ${apt.venduto === 'Sì' ? 'background: #ffebee; color: #c62828;' : 'background: #e8f5e9; color: #2e7d32;'}">${statusText}</span></td>
          <td><button class="btn-view" onclick="viewApartment(${idx})">👁️ Visualizza</button></td>
        `;
        
        tbody.appendChild(row);
      });
    })
    .catch(err => console.error('Errore:', err));
}

function reloadApartments() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('tableContainer').style.display = 'none';
  loadApartments();
}

function addNewApartment() {
  const nome = prompt('Nome appartamento:');
  if (!nome) return;
  
  const dimensione = prompt('Dimensione (mq):');
  if (!dimensione) return;
  
  const prezzo = prompt('Prezzo (€):');
  if (!prezzo) return;
  
  fetch('/api/appartamenti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: nome,
      dimensione: parseFloat(dimensione),
      prezzo: parseFloat(prezzo),
      venduto: 'No'
    })
  })
  .then(res => res.json())
  .then(data => {
    showMessage('✅ Appartamento creato!', 'success');
    reloadApartments();
  })
  .catch(err => showMessage('❌ Errore', 'error'));
}

// ===== VISUALIZZAZIONE APPARTAMENTO =====

function viewApartment(idx) {
  const apt = allApartments[idx];
  currentApartmentId = apt.id;
  currentApartmentName = apt.nome;
  
  document.getElementById('listScreen').style.display = 'none';
  document.getElementById('detailScreen').classList.add('show');
  
  document.getElementById('detailName').textContent = apt.nome;
  document.getElementById('detailInfo').textContent = apt.dimensione + ' mq • €' + apt.prezzo;
  
  disableEdit();
  loadFiles();
  
  fetch(`/api/personalizzazioni/${apt.id}`)
    .then(res => res.json())
    .then(data => {
      if (data) {
        document.getElementById('pavimento').value = data.pavimento || '';
        document.getElementById('sanitari').value = data.sanitari || '';
        document.getElementById('rubinetteria').value = data.rubinetteria || '';
        document.getElementById('ac').value = data.ac || '';
        document.getElementById('infissiEsterni').value = data.infissiEsterni || '';
        document.getElementById('infissiInterni').value = data.infissiInterni || '';
      }
      updateAllImages();
    });
}

function backToList() {
  document.getElementById('detailScreen').classList.remove('show');
  document.getElementById('listScreen').style.display = 'block';
  disableEdit();
}

function enableEdit() {
  document.getElementById('editBtn').style.display = 'none';
  document.getElementById('saveBtn').style.display = 'block';
  
  document.getElementById('pavimento').disabled = false;
  document.getElementById('sanitari').disabled = false;
  document.getElementById('rubinetteria').disabled = false;
  document.getElementById('ac').disabled = false;
  document.getElementById('infissiEsterni').disabled = false;
  document.getElementById('infissiInterni').disabled = false;
  document.getElementById('uploadBtn').style.display = 'inline-block';
  document.getElementById('fileInput').disabled = false;
}

function disableEdit() {
  document.getElementById('editBtn').style.display = 'block';
  document.getElementById('saveBtn').style.display = 'none';
  
  document.getElementById('pavimento').disabled = true;
  document.getElementById('sanitari').disabled = true;
  document.getElementById('rubinetteria').disabled = true;
  document.getElementById('ac').disabled = true;
  document.getElementById('infissiEsterni').disabled = true;
  document.getElementById('infissiInterni').disabled = true;
  document.getElementById('uploadBtn').style.display = 'none';
  document.getElementById('fileInput').disabled = true;
}

function savePersonalization() {
  const data = {
    id: currentApartmentId,
    apartmentId: currentApartmentId,
    pavimento: document.getElementById('pavimento').value,
    sanitari: document.getElementById('sanitari').value,
    rubinetteria: document.getElementById('rubinetteria').value,
    ac: document.getElementById('ac').value,
    infissiEsterni: document.getElementById('infissiEsterni').value,
    infissiInterni: document.getElementById('infissiInterni').value
  };
  
  fetch('/api/personalizzazioni', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(() => {
    showMessage('✅ Salvato!', 'success');
    disableEdit();
  })
  .catch(err => showMessage('❌ Errore', 'error'));
}

// ===== IMMAGINI =====

function loadImageConfig() {
  fetch('/api/immagini')
    .then(res => res.json())
    .then(data => {
      imageConfig = data;
      renderImageConfig();
    });
}

function renderImageConfig() {
  const fields = [
    {id: 'pavimento', label: 'Pavimento', options: ['Piastrelle ceramiche', 'Piastrelle gres porcellanato', 'Parquet naturale', 'Parquet laminato', 'Cemento levigato', 'Marmo', 'Vinile/LVT']},
    {id: 'sanitari', label: 'Sanitari', options: ['Standard (bidet, wc, lavandino)', 'Premium (bidet, wc, lavandino, doccia)', 'Lusso (vasca + doccia, doppio lavandino)', 'Minimalista (wc sospeso, lavandino, doccia)']},
    {id: 'ac', label: 'A/C', options: ['Nessuno', 'Unità singola', 'Multisplit (2 unità)', 'Multisplit (3+ unità)', 'Pompa di calore']},
    {id: 'infissiEsterni', label: 'Infissi Esterni', options: ['Alluminio', 'Alluminio con taglio termico', 'Legno', 'PVC', 'Legno-alluminio']},
    {id: 'infissiInterni', label: 'Infissi Interni', options: ['Legno massiccio', 'Legno laminato', 'PVC', 'Alluminio', 'Vetro (scorrevole)']}
  ];
  
  let html = '';
  fields.forEach(field => {
    html += `<div class="image-config-card">
      <h3>${field.label}</h3>
      <div class="image-options">`;
    
    field.options.forEach(opt => {
      const imgUrl = imageConfig[field.id] && imageConfig[field.id][opt] ? imageConfig[field.id][opt] : '';
      html += `<div class="image-option">
        <span class="image-option-name">${opt}</span>
        <input type="text" class="image-option-input" id="img_${field.id}_${opt}" placeholder="URL immagine" value="${imgUrl}">
        <button type="button" class="image-option-btn" onclick="saveImageMapping('${field.id}', '${opt.replace(/'/g, "\\'")}')">💾</button>
      </div>`;
    });
    
    html += '</div></div>';
  });
  
  document.getElementById('imagesContainer').innerHTML = html;
}

function saveImageMapping(field, option) {
  const inputId = `img_${field}_${option}`;
  const imageUrl = document.getElementById(inputId).value;
  
  if (!imageUrl) {
    showMessage('⚠️ Inserisci un URL', 'error');
    return;
  }
  
  fetch('/api/immagini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, option, imageUrl })
  })
  .then(res => res.json())
  .then(() => {
    showMessage('✅ Immagine salvata!', 'success');
    loadImageConfig();
  })
  .catch(err => showMessage('❌ Errore', 'error'));
}

function updateImage(field) {
  const value = document.getElementById(field).value;
  const imgDiv = document.getElementById(field + '-img');
  
  if (!value || !imageConfig[field] || !imageConfig[field][value]) {
    imgDiv.innerHTML = '';
    return;
  }
  
  const imgUrl = imageConfig[field][value];
  imgDiv.innerHTML = `<img src="${imgUrl}" alt="${value}">`;
}

function updateAllImages() {
  ['pavimento', 'sanitari', 'ac', 'infissiEsterni', 'infissiInterni'].forEach(field => {
    updateImage(field);
  });
}

// ===== FILE MANAGEMENT =====

document.getElementById('fileInput').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
  const files = event.target.files;
  if (files.length === 0) return;
  
  showMessage('⏳ Caricamento file...', 'success');
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('apartmentName', currentApartmentName);
    
    fetch('/api/files/upload', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      showMessage('✅ File caricato: ' + file.name, 'success');
      loadFiles();
    })
    .catch(err => showMessage('❌ Errore caricamento', 'error'));
  }
  
  event.target.value = '';
}

function loadFiles() {
  fetch(`/api/files/${currentApartmentName}`)
    .then(res => res.json())
    .then(files => {
      const filesList = document.getElementById('filesList');
      
      if (!files || files.length === 0) {
        filesList.innerHTML = '<li style="color: #999; border: none; background: white;">Nessun file caricato</li>';
        return;
      }
      
      filesList.innerHTML = '';
      files.forEach(file => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="file-icon">📄</div>
          <div class="file-info">
            <div class="file-name">${file.fileName}</div>
            <div class="file-date">${file.uploadDate}</div>
          </div>
          <div class="file-actions">
            <button type="button" class="btn-download" onclick="downloadFile(${file.id})">⬇️ Scarica</button>
            <button type="button" class="btn-delete" onclick="deleteFile(${file.id}, '${file.fileName}')">🗑️ Cancella</button>
          </div>
        `;
        filesList.appendChild(li);
      });
    });
}

function downloadFile(fileId) {
  window.location.href = `/api/files/download/${fileId}`;
}

function deleteFile(fileId, fileName) {
  if (!confirm('Cancellare: ' + fileName + '?')) return;
  
  fetch(`/api/files/${fileId}`, {
    method: 'DELETE'
  })
  .then(res => res.json())
  .then(() => {
    showMessage('✅ File cancellato', 'success');
    loadFiles();
  })
  .catch(err => showMessage('❌ Errore', 'error'));
}

function showMessage(text, type) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = 'message show ' + type;
  setTimeout(() => msg.classList.remove('show'), 3000);
}

// Carica al load
window.onload = function() {
  loadApartments();
};
