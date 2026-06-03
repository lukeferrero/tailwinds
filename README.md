# 🏠 Gestione Appartamenti - Node.js + Express

Applicazione web per gestire appartamenti con personalizzazioni, upload file, e configurazione immagini.

## 📋 CONTENUTO PROGETTO

```
progetto-appartamenti/
├── server.js              # Backend Node.js + Express
├── package.json           # Dipendenze e configurazione
├── database.db            # Database SQLite (auto-creato)
├── public/
│   ├── index.html         # Frontend HTML
│   ├── style.css          # Stili CSS
│   └── script.js          # Logica JavaScript
├── uploads/               # Cartella file caricati (auto-creata)
└── README.md              # Questo file
```

---

## 🚀 INSTALLAZIONE LOCALE (per test)

### 1. Installa Node.js
Scarica da: https://nodejs.org/

### 2. Crea cartella progetto
```bash
mkdir gestione-appartamenti
cd gestione-appartamenti
```

### 3. Copia i file
Copia tutti i file in questa cartella:
- `server.js`
- `package.json`
- `public/` (cartella con html, css, js)

### 4. Installa dipendenze
```bash
npm install
```

### 5. Avvia il server
```bash
npm start
```

### 6. Apri nel browser
```
http://localhost:3000
```

---

## 📤 DEPLOY SU HOSTINGER VPS

### PASSO 1: Accedi al VPS via SSH

```bash
ssh root@<TUO_IP_VPS>
```

(Inserisci la password Hostinger)

### PASSO 2: Installa Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verifica:
```bash
node --version
npm --version
```

### PASSO 3: Carica i file

**Opzione A: Via FTP (più facile)**
1. Apri FileZilla (o un client FTP)
2. Connettiti al tuo VPS Hostinger
3. Crea cartella: `/home/username/gestione-appartamenti/`
4. Carica i file:
   - `server.js`
   - `package.json`
   - Cartella `public/` completa

**Opzione B: Via SSH/Git**
```bash
cd /home/username
git clone <link-repo>
cd gestione-appartamenti
```

### PASSO 4: Installa dipendenze

```bash
cd /home/username/gestione-appartamenti
npm install
```

### PASSO 5: Installa PM2 (per mantenere il server attivo)

```bash
sudo npm install -g pm2
```

### PASSO 6: Avvia il server con PM2

```bash
pm2 start server.js --name "appartamenti"
pm2 startup
pm2 save
```

Verifica che sia attivo:
```bash
pm2 list
```

### PASSO 7: Configura Nginx (reverse proxy)

```bash
sudo apt-get install -y nginx
```

Crea il file di configurazione:
```bash
sudo nano /etc/nginx/sites-available/appartamenti
```

Incolla questo contenuto:
```nginx
server {
    listen 80;
    server_name <TUO_DOMINIO>;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

(Sostituisci `<TUO_DOMINIO>` con il tuo dominio Hostinger)

Abilita il sito:
```bash
sudo ln -s /etc/nginx/sites-available/appartamenti /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### PASSO 8: Configura SSL (HTTPS)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <TUO_DOMINIO>
```

Scegli di reindirizzare il traffico a HTTPS quando richiesto.

---

## 🎯 USO DELL'APPLICAZIONE

### Schermata Principale
- **Tab Appartamenti**: Lista di tutti gli appartamenti
- **➕ Nuovo**: Aggiungi un appartamento
- **👁️ Visualizza**: Vai al dettaglio

### Dettaglio Appartamento
- **6 campi di personalizzazione**:
  - Pavimento
  - Sanitari
  - Rubinetteria
  - A/C
  - Infissi Esterni
  - Infissi Interni
- **✏️ Edita**: Modifica i dati
- **💾 Salva**: Salva le modifiche
- **📎 File**: Carica e scarica file

### Configura Immagini
- **Tab "🖼️ Configura Immagini"**
- Per ogni opzione, incolla il link dell'immagine da Google Drive
- **Come ottenere il link**:
  1. Google Drive → clicca destro sulla foto
  2. "Ottieni link"
  3. Imposta "Chiunque" abbia accesso
  4. Copia il link
  5. Incolla nel campo di testo

---

## 🐛 RISOLUZIONE PROBLEMI

### Il server non si avvia
```bash
cd /home/username/gestione-appartamenti
npm install
npm start
```

### PM2 non funziona
```bash
pm2 delete all
pm2 start server.js --name "appartamenti"
```

### Nginx non funziona
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Il sito non è raggiungibile
1. Verifica che il dominio punti al VPS (DNS record)
2. Verifica che la porta 80 e 443 siano aperte
3. Controlla: `pm2 list` (il server deve essere attivo)

---

## 📱 CARATTERISTICHE

✅ **Zero limiti di upload** (file illimitati)
✅ **Database SQLite** integrato
✅ **Immagini da URL** (Google Drive, ecc)
✅ **Responsive design** (mobile, tablet, desktop)
✅ **Gestione appartamenti** completa
✅ **Personalizzazioni** per ogni appartamento
✅ **Upload file** illimitato

---

## 🔧 VARIABILI AMBIENTE (opzionale)

Crea un file `.env` se vuoi personalizzare la porta:

```
PORT=3000
```

Poi carica in `server.js`:
```javascript
require('dotenv').config();
const PORT = process.env.PORT || 3000;
```

---

## 📞 SUPPORTO

Se hai problemi:
1. Controlla i log: `pm2 logs appartamenti`
2. Verifica che Node.js sia installato: `node --version`
3. Controlla i permessi: `chmod -R 755 /home/username/gestione-appartamenti`

---

## 📝 NOTE IMPORTANTI

- Il database SQLite si crea automaticamente al primo avvio
- I file caricati sono salvati in `/uploads/[nome-appartamento]/`
- Le immagini devono avere URL pubblici (non file locali)
- Backuppa il file `database.db` regolarmente

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: 2026-06-02
