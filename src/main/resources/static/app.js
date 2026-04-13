const tokenJWT = localStorage.getItem('survey_token');
const usuarioActual = {
   username: localStorage.getItem('survey_username'),
   nombre: localStorage.getItem('survey_nombre'),
   rol: localStorage.getItem('survey_rol')
};

const WS_URL = (location.protocol === 'https:' ? 'wss' : 'ws')
   + '://' + location.host + '/ws/sync';

let mapaLeaflet = null;
let webcam = null;
let fotoBase64 = null;
let latActual = null;
let lonActual = null;

let estaOnline = navigator.onLine;



window.addEventListener('DOMContentLoaded', async () => {
   // Mostrar datos del usuario en navbar
   document.getElementById('navUsuario').textContent = usuarioActual.nombre || usuarioActual.username;
   document.getElementById('navRol').textContent = 'Rol: ' + usuarioActual.rol;

   await initDB();
   obtenerGeolocalizacion();
   actualizarEstadoConexion();
   escucharCambiosConexion();

});

function logout() {
   ['survey_token', 'survey_username', 'survey_nombre', 'survey_rol']
      .forEach(k => localStorage.removeItem(k));
   window.location.replace('/login.html');
}

function mostrarSeccion(sec) {
   document.querySelectorAll('.seccion').forEach(s => s.classList.add('d-none'));
   document.querySelectorAll('#mainTabs .nav-link').forEach(b => b.classList.remove('active'));

   const id = 'sec' + sec.charAt(0).toUpperCase() + sec.slice(1);
   document.getElementById(id)?.classList.remove('d-none');

   const idx = ['nueva', 'pendientes', 'servidor', 'mapa'].indexOf(sec);
   document.querySelectorAll('#mainTabs .nav-link')[idx]?.classList.add('active');

   if (sec === 'pendientes') renderizarPendientes();
   if (sec === 'servidor') cargarDelServidor();
   if (sec === 'mapa') inicializarMapa();
}
//mapa
async function inicializarMapa() {
   if (!mapaLeaflet) {
      // Santiago de los Caballeros por defecto
      mapaLeaflet = L.map('mapa').setView([19.4517, -70.6970], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: '© OpenStreetMap contributors'
      }).addTo(mapaLeaflet);
   }

}
//camara
function iniciarCamara() {
   const videoEl = document.getElementById('webcam');
   const canvasEl = document.getElementById('canvas');
   webcam = new Webcam(videoEl, 'user', canvasEl);
   webcam.start()
      .then(() => console.log('[Cam] Iniciada'))
      .catch(() => mostrarOpcionGaleria());
}

function mostrarOpcionGaleria() {
   document.getElementById('camContainer').innerHTML = `
        <div class="p-3 text-white text-center">
            <p class="small mb-2">📷 Cámara no disponible. Selecciona una foto:</p>
            <input type="file" accept="image/*" capture="environment"
                   class="form-control form-control-sm"
                   onchange="seleccionarFotoGaleria(event)">
        </div>`;
}


function seleccionarFotoGaleria(event) {
   const file = event.target.files[0];
   if (!file) return;
   const reader = new FileReader();
   reader.onload = (e) => { fotoBase64 = e.target.result; mostrarPreviewFoto(fotoBase64); };
   reader.readAsDataURL(file);
}

function tomarFoto() {
   if (!webcam) { mostrarAlerta('Primero activa la cámara', 'warning'); return; }
   try {
      fotoBase64 = webcam.snap();
      mostrarPreviewFoto(fotoBase64);
   } catch (e) {
      mostrarAlerta('Error al capturar: ' + e.message, 'danger');
   }
}

function mostrarPreviewFoto(b64) {
   document.getElementById('fotoImg').src = b64;
   document.getElementById('fotoPreview').classList.remove('d-none');
}

function limpiarFoto() {
   fotoBase64 = null;
   document.getElementById('fotoPreview').classList.add('d-none');
   if (webcam) { try { webcam.stop(); } catch (e) { } webcam = null; }
}


//alerta
function mostrarAlerta(msg, tipo = 'info') {
   const el = document.getElementById('alertGlobal');
   if (!el) return;
   el.className = `alert alert-${tipo} mt-2 mx-2`;
   el.textContent = msg;
   el.classList.remove('d-none');
   setTimeout(() => el.classList.add('d-none'), 5000);
}


//geolocalizacion
function obtenerGeolocalizacion() {
   if (!navigator.geolocation) {
      document.getElementById('geoTexto').textContent = 'Geolocalización no disponible';
      return;
   }
   navigator.geolocation.getCurrentPosition(
      (pos) => {
         latActual = pos.coords.latitude;
         lonActual = pos.coords.longitude;
         document.getElementById('geoTexto').innerHTML =
            `<i class="bi bi-geo-alt-fill"></i> ` +
            `Lat: ${latActual.toFixed(5)}, Long: ${lonActual.toFixed(5)} ` +
            `<span class="text-success fw-bold">✓</span>`;
      },
      (err) => {
         document.getElementById('geoTexto').textContent =
            'No se pudo obtener ubicación: ' + err.message;
      },
      { enableHighAccuracy: true, timeout: 10000 }
   );
}


// conexion
function escucharCambiosConexion() {
   window.addEventListener('online', () => {
      estaOnline = true;
      actualizarEstadoConexion();
      mostrarAlerta('Conexión restaurada. Sincronizando...', 'info');
      setTimeout(sincronizarManual, 1500);
   });
   window.addEventListener('offline', () => {
      estaOnline = false;
      actualizarEstadoConexion();
      mostrarAlerta('Sin conexión. Los registros se guardan localmente.', 'warning');
   });
}

function actualizarEstadoConexion() {
   const badge = document.getElementById('estadoConexion');
   if (!badge) return;
   badge.className = estaOnline ? 'badge bg-success' : 'badge bg-danger';
   badge.innerHTML = estaOnline
      ? '<i class="bi bi-wifi"></i> Online'
      : '<i class="bi bi-wifi-off"></i> Offline';
}

async function guardarEncuesta() {
   const nombre = document.getElementById('fNombre').value.trim();
   const sector = document.getElementById('fSector').value.trim();
   const nivelEscolar = document.getElementById('fNivelEscolar').value;

   if (!nombre) { mostrarAlerta('El nombre es requerido', 'danger'); return; }
   if (!sector) { mostrarAlerta('El sector es requerido', 'danger'); return; }
   if (!nivelEscolar) { mostrarAlerta('Selecciona el nivel escolar', 'danger'); return; }

   const encuesta = {
      nombre, sector, nivelEscolar,
      usuario: usuarioActual.username,
      latitud: latActual,
      longitud: lonActual,
      imagenBase64: fotoBase64 || null
   };

   try {
      await guardarEncuestaLocal(encuesta);
      mostrarAlerta(' Guardado localmente', 'success');
      limpiarFormulario();
   } catch (e) {
      mostrarAlerta('Error al guardar: ' + e.message, 'danger');
   }
}

function limpiarFormulario() {
   document.getElementById('fNombre').value = '';
   document.getElementById('fSector').value = '';
   document.getElementById('fNivelEscolar').value = '';
   limpiarFoto();
}


async function renderizarPendientes() {
   const todasLasEncuentas = await obtenerEncuestasLocales();
   const encuentasPendientes = todasLasEncuentas.filter(e => !e.sincronizado);
   const contenedor = document.getElementById('listaPendientes');

   if (encuentasPendientes.length === 0) {
      contenedor.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-inbox fs-1"></i><p>No hay registros locales</p>
            </div>`;
      return;
   }

   contenedor.innerHTML = encuentasPendientes.map(enc => `
        <div class="card mb-2 shadow-sm ${enc.sincronizado ? 'border-success' : 'border-warning'}">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="fw-bold mb-1">${enc.nombre}</h6>
                        <p class="text-muted small mb-0">
                            <i class="bi bi-geo-alt"></i> ${enc.sector} &bull;
                            <i class="bi bi-mortarboard"></i> ${enc.nivelEscolar}
                        </p>
                        ${enc.latitud ? `<p class="text-muted small mb-0">
                            📍 ${enc.latitud.toFixed(4)}, ${enc.longitud.toFixed(4)}</p>` : ''}
                    </div>
                    <span class="badge ${enc.sincronizado ? 'bg-success' : 'bg-warning text-dark'}">
                        ${enc.sincronizado ? '✓ Sync' : '⏳ Pendiente'}
                    </span>
                </div>
                ${enc.imagenBase64
         ? `<img src="${enc.imagenBase64}" class="img-thumbnail mt-2" style="max-height:80px;">`
         : ''}
                <div class="d-flex gap-2 mt-2">
                    <button onclick="abrirEditar(${enc.localId}, 'local')"
                            class="btn btn-warning btn-sm">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button onclick="eliminarLocal(${enc.localId})"
                            class="btn btn-danger btn-sm">
                        <i class="bi bi-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>`).join('');
}