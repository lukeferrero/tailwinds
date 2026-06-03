const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Crea cartelle se non esistono
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurazione Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const apartmentName = req.body.apartmentName || 'unnamed';
    const apartmentFolder = path.join(uploadDir, apartmentName);
    
    if (!fs.existsSync(apartmentFolder)) {
      fs.mkdirSync(apartmentFolder, { recursive: true });
    }
    
    cb(null, apartmentFolder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Database SQLite
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Errore database:', err);
  } else {
    console.log('Database SQLite connesso');
    initDatabase();
  }
});

function initDatabase() {
  // Tabella Appartamenti
  db.run(`
    CREATE TABLE IF NOT EXISTS appartamenti (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      dimensione REAL,
      prezzo REAL,
      venduto TEXT DEFAULT 'No',
      dataCreazione DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella Immagini
  db.run(`
    CREATE TABLE IF NOT EXISTS immagini (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field TEXT NOT NULL,
      option TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      UNIQUE(field, option)
    )
  `);

  // Tabella File
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartmentName TEXT NOT NULL,
      fileName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // NUOVO: Tabella Campi Personalizzati
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fieldName TEXT NOT NULL,
      fieldType TEXT NOT NULL,
      fieldOptions TEXT,
      maxLength INTEGER,
      required INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // NUOVO: Tabella Valori Campi Personalizzati
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_field_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartmentId TEXT NOT NULL,
      fieldId INTEGER NOT NULL,
      fieldValue TEXT,
      FOREIGN KEY(apartmentId) REFERENCES appartamenti(id),
      FOREIGN KEY(fieldId) REFERENCES custom_fields(id),
      UNIQUE(apartmentId, fieldId)
    )
  `);
}

// ===== API APPARTAMENTI =====

app.get('/api/appartamenti', (req, res) => {
  db.all('SELECT * FROM appartamenti ORDER BY nome', (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows || []);
  });
});

app.post('/api/appartamenti', (req, res) => {
  const { nome, dimensione, prezzo, venduto } = req.body;
  const id = Math.random().toString(36).substring(7);

  db.run(
    'INSERT INTO appartamenti (id, nome, dimensione, prezzo, venduto) VALUES (?, ?, ?, ?, ?)',
    [id, nome, dimensione, prezzo, venduto || 'No'],
    (err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ id, nome, dimensione, prezzo, venduto });
    }
  );
});

// ===== API IMMAGINI =====

app.get('/api/immagini', (req, res) => {
  db.all('SELECT field, option, imageUrl FROM immagini', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      const config = {};
      rows.forEach(row => {
        if (!config[row.field]) config[row.field] = {};
        config[row.field][row.option] = row.imageUrl;
      });
      res.json(config);
    }
  });
});

app.post('/api/immagini', (req, res) => {
  const { field, option, imageUrl } = req.body;

  db.run(
    'INSERT OR REPLACE INTO immagini (field, option, imageUrl) VALUES (?, ?, ?)',
    [field, option, imageUrl],
    (err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ success: true });
    }
  );
});

// ===== API FILE =====

app.get('/api/files/:apartmentName', (req, res) => {
  db.all(
    'SELECT id, fileName, uploadDate FROM files WHERE apartmentName = ? ORDER BY uploadDate DESC',
    [req.params.apartmentName],
    (err, rows) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json(rows || []);
    }
  );
});

app.post('/api/files/upload', upload.single('file'), (req, res) => {
  const { apartmentName } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Nessun file' });
  }

  const filePath = path.join(req.file.destination, req.file.filename);

  db.run(
    'INSERT INTO files (apartmentName, fileName, filePath) VALUES (?, ?, ?)',
    [apartmentName, req.file.originalname, filePath],
    (err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({
        id: Date.now(),
        fileName: req.file.originalname,
        uploadDate: new Date().toLocaleDateString('it-IT'),
        filePath: filePath
      });
    }
  );
});

app.get('/api/files/download/:fileId', (req, res) => {
  db.get(
    'SELECT filePath, fileName FROM files WHERE id = ?',
    [req.params.fileId],
    (err, row) => {
      if (err || !row) {
        res.status(404).json({ error: 'File non trovato' });
      } else {
        res.download(row.filePath, row.fileName);
      }
    }
  );
});

app.delete('/api/files/:fileId', (req, res) => {
  db.get(
    'SELECT filePath FROM files WHERE id = ?',
    [req.params.fileId],
    (err, row) => {
      if (err || !row) {
        res.status(404).json({ error: 'File non trovato' });
      } else {
        fs.unlink(row.filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Errore cancellazione:', unlinkErr);

          db.run('DELETE FROM files WHERE id = ?', [req.params.fileId], (delErr) => {
            if (delErr) res.status(500).json({ error: delErr.message });
            else res.json({ success: true });
          });
        });
      }
    }
  );
});

// ===== API CAMPI PERSONALIZZATI (NUOVO) =====

app.get('/api/custom-fields', (req, res) => {
  db.all('SELECT * FROM custom_fields ORDER BY position', (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else {
      const fields = rows.map(row => ({
        ...row,
        fieldOptions: row.fieldOptions ? row.fieldOptions.split('|') : []
      }));
      res.json(fields || []);
    }
  });
});

app.post('/api/custom-fields', (req, res) => {
  const { fieldName, fieldType, fieldOptions, maxLength, required, position } = req.body;
  const optionsStr = fieldOptions && fieldOptions.length ? fieldOptions.join('|') : null;

  db.run(
    'INSERT INTO custom_fields (fieldName, fieldType, fieldOptions, maxLength, required, position) VALUES (?, ?, ?, ?, ?, ?)',
    [fieldName, fieldType, optionsStr, maxLength || null, required ? 1 : 0, position || 0],
    function(err) {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ id: this.lastID, fieldName, fieldType });
    }
  );
});

app.put('/api/custom-fields/:id', (req, res) => {
  const { fieldName, fieldType, fieldOptions, maxLength, required, position } = req.body;
  const optionsStr = fieldOptions && fieldOptions.length ? fieldOptions.join('|') : null;

  db.run(
    'UPDATE custom_fields SET fieldName=?, fieldType=?, fieldOptions=?, maxLength=?, required=?, position=? WHERE id=?',
    [fieldName, fieldType, optionsStr, maxLength || null, required ? 1 : 0, position, req.params.id],
    (err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ success: true });
    }
  );
});

app.delete('/api/custom-fields/:id', (req, res) => {
  db.run('DELETE FROM custom_fields WHERE id=?', [req.params.id], (err) => {
    if (err) res.status(500).json({ error: err.message });
    else {
      db.run('DELETE FROM custom_field_values WHERE fieldId=?', [req.params.id], () => {
        res.json({ success: true });
      });
    }
  });
});

// ===== API VALORI CAMPI PERSONALIZZATI (NUOVO) =====

app.get('/api/custom-field-values/:apartmentId', (req, res) => {
  db.all(
    'SELECT fieldId, fieldValue FROM custom_field_values WHERE apartmentId=?',
    [req.params.apartmentId],
    (err, rows) => {
      if (err) res.status(500).json({ error: err.message });
      else {
        const values = {};
        rows.forEach(row => {
          values[row.fieldId] = row.fieldValue;
        });
        res.json(values);
      }
    }
  );
});

app.post('/api/custom-field-values', (req, res) => {
  const { apartmentId, fieldId, fieldValue } = req.body;

  db.run(
    'INSERT OR REPLACE INTO custom_field_values (apartmentId, fieldId, fieldValue) VALUES (?, ?, ?)',
    [apartmentId, fieldId, fieldValue],
    (err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ success: true });
    }
  );
});

app.post('/api/custom-field-values/bulk', (req, res) => {
  const { apartmentId, values } = req.body;
  
  let completed = 0;
  const total = Object.keys(values).length;

  Object.entries(values).forEach(([fieldId, fieldValue]) => {
    db.run(
      'INSERT OR REPLACE INTO custom_field_values (apartmentId, fieldId, fieldValue) VALUES (?, ?, ?)',
      [apartmentId, fieldId, fieldValue],
      (err) => {
        completed++;
        if (completed === total) {
          res.json({ success: true });
        }
      }
    );
  });
});

// ===== ROUTE PRINCIPALE =====

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== AVVIA SERVER =====

app.listen(PORT, () => {
  console.log(`Server Node.js in esecuzione su porta ${PORT}`);
});
