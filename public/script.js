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

// ===== CAMPI PERSONALIZZATI DINAMICI =====

let currentCustomFields = [];

function loadAndRenderDynamicFields() {
  fetch('/api/custom-fields')
    .then(res => res.json())
    .then(fields => {
      currentCustomFields = fields;
      renderDynamicFields(fields);
      
      // Carica i valori salvati
      if (currentApartmentId) {
        loadDynamicFieldValues(currentApartmentId);
      }
    });
}

function renderDynamicFields(fields) {
  const container = document.getElementById('dynamicFieldsContainer');
  container.innerHTML = '';

  fields.forEach(field => {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'form-group';
    fieldGroup.id = `field-${field.id}`;

    let inputHTML = '';

    switch(field.fieldType) {
      case 'text':
        const maxAttr = field.maxLength ? `maxlength="${field.maxLength}"` : '';
        inputHTML = `<input type="text" id="custom-${field.id}" placeholder="${field.fieldName}" disabled ${maxAttr}>`;
        if (field.maxLength) {
          inputHTML += `<small style="color: #999; margin-top: 5px; display: block;">Max ${field.maxLength} caratteri</small>`;
        }
        break;

      case 'number':
        inputHTML = `<input type="number" id="custom-${field.id}" placeholder="${field.fieldName}" disabled>`;
        break;

      case 'boolean':
        inputHTML = `<label><input type="checkbox" id="custom-${field.id}" disabled> ${field.fieldName}</label>`;
        break;

      case 'select':
        inputHTML = `<select id="custom-${field.id}" disabled>
          <option value="">-- Seleziona --</option>`;
        field.fieldOptions.forEach(opt => {
          inputHTML += `<option value="${opt}">${opt}</option>`;
        });
        inputHTML += `</select>`;
        break;

      case 'file':
        inputHTML = `<input type="file" id="custom-${field.id}" disabled style="display: none;">
          <button type="button" class="btn-upload" onclick="document.getElementById('custom-${field.id}').click()" style="display: none;">
            📤 Carica File
          </button>
          <div id="custom-${field.id}-files" style="margin-top: 10px;"></div>`;
        break;
    }

    fieldGroup.innerHTML = `<label>${field.fieldName}${field.required ? ' *' : ''}</label>${inputHTML}`;
    container.appendChild(fieldGroup);
  });
}

function loadDynamicFieldValues(apartmentId) {
  fetch(`/api/custom-field-values/${apartmentId}`)
    .then(res => res.json())
    .then(values => {
      Object.entries(values).forEach(([fieldId, fieldValue]) => {
        const input = document.getElementById(`custom-${fieldId}`);
        if (input) {
          if (input.type === 'checkbox') {
            input.checked = fieldValue === '1' || fieldValue === 'true';
          } else {
            input.value = fieldValue || '';
          }
        }
      });
    });
}

function saveDynamicFieldValues() {
  const values = {};

  currentCustomFields.forEach(field => {
    const input = document.getElementById(`custom-${field.id}`);
    if (input) {
      let value = '';
      if (input.type === 'checkbox') {
        value = input.checked ? '1' : '0';
      } else {
        value = input.value;
      }
      values[field.id] = value;
    }
  });

  fetch('/api/custom-field-values/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apartmentId: currentApartmentId,
      values: values
    })
  })
  .then(res => res.json())
  .then(() => {
    console.log('Campi personalizzati salvati');
  });
}

// Aggiorna la funzione savePersonalization per salvare anche i campi personalizzati
const originalSavePersonalization = savePersonalization;
savePersonalization = function() {
  originalSavePersonalization();
  saveDynamicFieldValues();
};

// Aggiorna la funzione viewApartment per caricare i campi dinamici
const originalViewApartment = viewApartment;
viewApartment = function(idx) {
  originalViewApartment(idx);
  setTimeout(() => {
    loadAndRenderDynamicFields();
  }, 100);
};

// Aggiorna enableEdit per abilitare i campi dinamici
const originalEnableEdit = enableEdit;
enableEdit = function() {
  originalEnableEdit();
  
  currentCustomFields.forEach(field => {
    const input = document.getElementById(`custom-${field.id}`);
    if (input) {
      input.disabled = false;
      if (field.fieldType === 'file') {
        const btn = input.nextElementSibling;
        if (btn && btn.className === 'btn-upload') {
          btn.style.display = 'inline-block';
        }
      }
    }
  });
};

// Aggiorna disableEdit per disabilitare i campi dinamici
const originalDisableEdit = disableEdit;
disableEdit = function() {
  originalDisableEdit();
  
  currentCustomFields.forEach(field => {
    const input = document.getElementById(`custom-${field.id}`);
    if (input) {
      input.disabled = true;
      if (field.fieldType === 'file') {
        const btn = input.nextElementSibling;
        if (btn && btn.className === 'btn-upload') {
          btn.style.display = 'none';
        }
      }
    }
  });
};

