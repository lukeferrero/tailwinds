let currentApartmentId = null;
let currentApartmentName = null;
let allApartments = [];
let imageConfig = {};
let currentCustomFields = [];

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
  
  // CARICA CAMPI PERSONALIZZATI
  loadAndRenderDynamicFields();
  loadDynamicFieldValues(apt.id);
}

function backToList() {
  document.getElementById('detailScreen').classList.remove('show');
  document.getElementById('listScreen').style.display = 'block';
  disableEdit();
}

function enableEdit() {
  document.getElementById('editBtn').style.display = 'none';
  document.getElementById('saveBtn').style.display = 'block';
  
  // Abilita campi personalizzati
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
  
  document.getElementById('uploadBtn').style.display = 'inline-block';
  document.getElementById('fileInput').disabled = false;
}

function disableEdit() {
  document.getElementById('editBtn').style.display = 'block';
  document.getElementById('saveBtn').style.display = 'none';
  
  // Disabilita campi personalizzati
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
  
  document.getElementById('uploadBtn').style.display = 'none';
  document.getElementById('fileInput').disabled = true;
}

function savePersonalization() {
  // Salva campi personalizzati
  saveDynamicFieldValues();
  
  showMessage('✅ Salvato!', 'success');
  disableEdit();
}

// ===== CAMPI PERSONALIZZATI DINAMICI =====

function loadAndRenderDynamicFields() {
  fetch('/api/custom-fields')
    .then(res => res.json())
    .then(fields => {
      currentCustomFields = fields;
      renderDynamicFields(fields);
    })
    .catch(err => console.error('Errore caricamento campi:', err));
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
        inputHTML = `<select id="custom-${field.id}" disabled onchange="updateSelectImage(${field.id}, this.value)">
          <option value="">-- Seleziona --</option>`;
        field.fieldOptions.forEach(opt => {
          inputHTML += `<option value="${opt}">${opt}</option>`;
        });
        inputHTML += `</select>`;
        inputHTML += `<div class="image-preview" id="select-${field.id}-img"></div>`;
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
          
          // Se è un select, mostra l'immagine
          if (input.tagName === 'SELECT' && fieldValue) {
            updateSelectImage(fieldId, fieldValue);
          }
        }
      });
    })
    .catch(err => console.error('Errore caricamento valori:', err));
}

function saveDynamicFieldValues() {
  const values = {};

  currentCustomFields.forEach(field => {
    const input = document.getElementById(`custom-${field.id}`);
    if (input) {
      let value = '';
      if (input.type === 'checkbox') {
        value = input.checked ? '1' : '0';
      } else if (input.tagName === 'SELECT') {
        value = input.value;
      } else {
        value = input.value;
      }
      if (value) {
        values[field.id] = value;
      }
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
  .catch(err => console.error('Errore salvataggio campi:', err));
}

function updateSelectImage(fieldId, optionValue) {
  const imgDiv = document.getElementById(`select-${fieldId}-img`);
  if (!imgDiv) return;

  // Cerca l'immagine per questo select e questa opzione
  fetch('/api/immagini')
    .then(res => res.json())
    .then(config => {
      const fieldKey = `select_${fieldId}`;
      if (config[fieldKey] && config[fieldKey][optionValue]) {
        const imgUrl = config[fieldKey][optionValue];
        imgDiv.innerHTML = `<img src="${imgUrl}" alt="${optionValue}">`;
      } else {
        imgDiv.innerHTML = '';
      }
    });
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
  fetch('/api/custom-fields')
    .then(res => res.json())
    .then(fields => {
      const selectFields = fields.filter(f => f.fieldType === 'select');
      
      if (selectFields.length === 0) {
        document.getElementById('imagesContainer').innerHTML = '<p style="color: #999; text-align: center; padding: 40px;">Nessun campo select personalizzato. Creane uno in "⚙️ Personalizza Campi"</p>';
        return;
      }

      let html = '';
      selectFields.forEach(field => {
        html += `<div class="image-config-card">
          <h3>${field.fieldName}</h3>
          <div class="image-options">`;
        
        field.fieldOptions.forEach(opt => {
          const fieldKey = `select_${field.id}`;
          const imgUrl = imageConfig[fieldKey] && imageConfig[fieldKey][opt] ? imageConfig[fieldKey][opt] : '';
          html += `<div class="image-option">
            <span class="image-option-name">${opt}</span>
            <input type="text" class="image-option-input" id="img_select_${field.id}_${opt}" placeholder="URL immagine" value="${imgUrl}">
            <button type="button" class="image-option-btn" onclick="saveImageMappingForSelect(${field.id}, '${opt.replace(/'/g, "\\'")}')">💾</button>
          </div>`;
        });
        
        html += '</div></div>';
      });
      
      document.getElementById('imagesContainer').innerHTML = html;
    });
}

function saveImageMappingForSelect(fieldId, option) {
  const inputId = `img_select_${fieldId}_${option}`;
  const imageUrl = document.getElementById(inputId).value;
  
  if (!imageUrl) {
    showMessage('⚠️ Inserisci un URL', 'error');
    return;
  }
  
  const fieldKey = `select_${fieldId}`;
  
  fetch('/api/immagini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field: fieldKey, option: option, imageUrl })
  })
  .then(res => res.json())
  .then(() => {
    showMessage('✅ Immagine salvata!', 'success');
    loadImageConfig();
  })
  .catch(err => showMessage('❌ Errore', 'error'));
}

// ===== FILE MANAGEMENT =====

document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
});

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
