const DB_NAME = 'encuestasDB';
const DB_VER = 1;
const ST_ENC = 'encuestas';

let db = null;

function initDB() {
   return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);

      req.onerror = () => reject(req.error);

      req.onsuccess = (e) => {
         db = e.target.result;
         console.log('[IndexedDB] Abierta correctamente.');
         resolve(db);
      };

      req.onupgradeneeded = (e) => {
         const database = e.target.result;
         if (!database.objectStoreNames.contains(ST_ENC)) {
            const store = database.createObjectStore(ST_ENC, {
               keyPath: 'localId',
               autoIncrement: true
            });
            store.createIndex('sincronizado', 'sincronizado', { unique: false });
            store.createIndex('usuario', 'usuario', { unique: false });
            console.log('[IndexedDB] Object store "encuestas" creado.');
         }
      };
   });
}

function guardarEncuestaLocal(encuesta) {
   return new Promise((resolve, reject) => {
      const tx = db.transaction(ST_ENC, 'readwrite');
      const req = tx.objectStore(ST_ENC).add({
         ...encuesta,
         sincronizado: false,
         fechaLocal: new Date().toISOString()
      });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
   });
}



function obtenerPendientes() {
   return new Promise((resolve, reject) => {
      const tx = db.transaction(ST_ENC, 'readonly');
      const req = tx.objectStore(ST_ENC).getAll();
      req.onsuccess = () => {
         const pendientes = req.result.filter(e => !e.sincronizado);
         resolve(pendientes);
      };
      req.onerror = () => reject(req.error);
   });
}

function obtenerEncuestasLocales() {
   return new Promise((resolve, reject) => {
      const tx = db.transaction(ST_ENC, 'readonly');
      const req = tx.objectStore(ST_ENC).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
   });
}

function marcarSincronizada(localId) {
   return actualizarEncuestaLocal(localId, { sincronizado: true });
}

function guardarSesionLocal(token, username, nombre, rol) {
   localStorage.setItem('survey_token', token);
   localStorage.setItem('survey_username', username);
   localStorage.setItem('survey_nombre', nombre);
   localStorage.setItem('survey_rol', rol);
}

function obtenerSesionLocal() {
   return {
      token: localStorage.getItem('survey_token'),
      username: localStorage.getItem('survey_username'),
      nombre: localStorage.getItem('survey_nombre'),
      rol: localStorage.getItem('survey_rol')
   };
}

function limpiarSesionLocal() {
   ['survey_token', 'survey_username', 'survey_nombre', 'survey_rol']
      .forEach(k => localStorage.removeItem(k));
}

function tieneSesionLocal() {
   return !!localStorage.getItem('survey_token');
}
