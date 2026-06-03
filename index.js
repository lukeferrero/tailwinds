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

  db.run(`
    CREATE TABLE IF NOT EXISTS personalizzazioni (
      id TEXT PRIMARY KEY,
      apartmentId TEXT NOT NULL,
      pavimento TEXT,
      sanitari TEXT,
      rubinetteria TEXT,
      ac TEXT,
      infissiEsterni TEXT,
      infissiInterni TEXT,
      FOREIGN KEY(apartmentId) REFERENCES appartamenti(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS immagini (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field TEXT NOT NULL,
      option TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      UNIQUE(field, option)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartmentName TEXT NOT NULL,
      fileName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP
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

// ===== API PERSONALIZZAZIONI =====

app.get('/api/personalizzazioni/:apartmentId', (req, res) => {
  db.get(
    'SELECT * FROM personalizzazioni WHERE apartmentId = ?',
    [req.params.apartmentId],
    (err, row) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json(row || null);
    }
  );
});

app.post('/api/personalizzazioni', (req, res) => {
  const { id, apartmentId, pavimento, sanitari, rubinetteria, ac, infissiEsterni, infissiInterni } = req.body;

  db.run(
    'INSERT OR REPLACE INTO personalizzazioni (id, apartmentId, pavimento, sanitari, rubinetteria, ac, infissiEsterni, infissiInterni) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, apartmentId, pavimento, sanitari, rubinetteria, ac, infissiEsterni, infissiInterni],
    (err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ success: true });
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

// ===== ROUTE PRINCIPALE =====

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== AVVIA SERVER =====

app.listen(PORT, () => {
  console.log(`Server Node.js in esecuzione su porta ${PORT}`);
});
