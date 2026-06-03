let customFields = [];

// ===== CARICA CAMPI PERSONALIZZATI =====

function loadCustomFields() {
  fetch('/api/custom-fields')
    .then(res => res.json())
    .then(data => {
      customFields = data;
      renderCustomFieldsTable();
    });
}

function renderCustomFieldsTable() {
  const tbody = document.getElementById('fieldsTableBody');
  tbody.innerHTML = '';

  if (customFields.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">Nessun campo personalizzato</td></tr>';
    return;
  }

  customFields.forEach(field => {
    const row = document.createElement('tr');
    const typeLabel = getTypeLabel(field.fieldType);
    
    row.innerHTML = `
      <td><strong>${field.fieldName}</strong></td>
      <td>${typeLabel}</td>
      <td>${field.required ? '✅ Sì' : '❌ No'}</td>
      <td>
        <button class="btn-edit-field" onclick="editField(${field.id})">✏️ Modifica</button>
        <button class="btn-delete-field" onclick="deleteField(${field.id})">🗑️ Cancella</button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

function getTypeLabel(type) {
  const labels = {
    'text': '📝 Testo libero',
    'number': '🔢 Numero',
    'boolean': '✓ Si/No',
    'select': '📋 Menu a tendina',
    'file': '📤 File'
  };
  return labels[type] || type;
}

// ===== AGGIUNGI CAMPO =====

function openAddFieldForm() {
  document.getElementById('fieldFormModal').classList.add('show');
  document.getElementById('fieldFormTitle').textContent = 'Aggiungi Campo Personalizzato';
  document.getElementById('fieldForm').reset();
  document.getElementById('fieldId').value = '';
  document.getElementById('fieldOptionsGroup').style.display = 'none';
}

function closeFieldForm() {
  document.getElementById('fieldFormModal').classList.remove('show');
}

function updateFieldTypeOptions() {
  const type = document.getElementById('fieldType').value;
  const optionsGroup = document.getElementById('fieldOptionsGroup');
  const maxLengthGroup = document.getElementById('fieldMaxLengthGroup');

  optionsGroup.style.display = type === 'select' ? 'block' : 'none';
  maxLengthGroup.style.display = type === 'text' ? 'block' : 'none';
}

function saveField() {
  const id = document.getElementById('fieldId').value;
  const fieldName = document.getElementById('fieldName').value;
  const fieldType = document.getElementById('fieldType').value;
  const required = document.getElementById('fieldRequired').checked;
  const maxLength = document.getElementById('fieldMaxLength').value;
  
  let fieldOptions = [];
  if (fieldType === 'select') {
    const optionsText = document.getElementById('fieldOptions').value;
    fieldOptions = optionsText.split('\n').map(o => o.trim()).filter(o => o);
  }

  if (!fieldName) {
    showAdminMessage('⚠️ Inserisci il nome del campo', 'error');
    return;
  }

  const data = {
    fieldName,
    fieldType,
    fieldOptions,
    maxLength: maxLength ? parseInt(maxLength) : null,
    required,
    position: customFields.length
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/custom-fields/${id}` : '/api/custom-fields';

  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(() => {
    showAdminMessage('✅ Campo salvato!', 'success');
    closeFieldForm();
    loadCustomFields();
  })
  .catch(err => showAdminMessage('❌ Errore', 'error'));
}

function editField(fieldId) {
  const field = customFields.find(f => f.id === fieldId);
  if (!field) return;

  document.getElementById('fieldFormTitle').textContent = 'Modifica Campo Personalizzato';
  document.getElementById('fieldId').value = field.id;
  document.getElementById('fieldName').value = field.fieldName;
  document.getElementById('fieldType').value = field.fieldType;
  document.getElementById('fieldRequired').checked = field.required;
  document.getElementById('fieldMaxLength').value = field.maxLength || '';
  
  if (field.fieldType === 'select') {
    document.getElementById('fieldOptions').value = field.fieldOptions.join('\n');
    document.getElementById('fieldOptionsGroup').style.display = 'block';
  } else {
    document.getElementById('fieldOptionsGroup').style.display = 'none';
  }

  updateFieldTypeOptions();
  document.getElementById('fieldFormModal').classList.add('show');
}

function deleteField(fieldId) {
  if (!confirm('Eliminare questo campo? I dati verranno cancellati.')) return;

  fetch(`/api/custom-fields/${fieldId}`, {
    method: 'DELETE'
  })
  .then(res => res.json())
  .then(() => {
    showAdminMessage('✅ Campo eliminato!', 'success');
    loadCustomFields();
  })
  .catch(err => showAdminMessage('❌ Errore', 'error'));
}

function showAdminMessage(text, type) {
  const msg = document.getElementById('adminMessage');
  msg.textContent = text;
  msg.className = 'message show ' + type;
  setTimeout(() => msg.classList.remove('show'), 3000);
}

// Carica al load
window.addEventListener('load', () => {
  if (document.getElementById('fieldsTableBody')) {
    loadCustomFields();
  }
});
