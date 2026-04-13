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
   // Configurar UI según el rol
   configurarUIPorRol();

   // Mostrar datos del usuario en navbar
   document.getElementById('navUsuario').textContent = usuarioActual.nombre || usuarioActual.username;
   document.getElementById('navRol').textContent = 'Rol: ' + usuarioActual.rol;

   await initDB();
   iniciarWorker();
   actualizarEstadoConexion();
   escucharCambiosConexion();
   obtenerGeolocalizacion();
   actualizarContadorPendientes();

});

function logout() {
   ['survey_token', 'survey_username', 'survey_nombre', 'survey_rol']
      .forEach(k => localStorage.removeItem(k));
   window.location.replace('/login.html');
}

function mostrarSeccion(sec) {
   document.querySelectorAll('.seccion').forEach(s => s.classList.add('d-none'));
   document.querySelectorAll('#mainTabs .nav-link').forEach(b => b.classList.remove('active'));

   // validación de rol
   if (sec === 'servidor' || sec === 'mapa') {
      if (usuarioActual.rol === 'encuestador') {
         mostrarAlerta('No tienes permisos', 'danger'); return;
      }
   }
   if (sec === 'usuarios') {
      if (usuarioActual.rol !== 'admin') {
         mostrarAlerta('Solo administradores', 'danger'); return;
      }
   }

   const id = 'sec' + sec.charAt(0).toUpperCase() + sec.slice(1);
   document.getElementById(id)?.classList.remove('d-none');

   const tabL = document.getElementById('tab' + sec.charAt(0).toUpperCase() + sec.slice(1));
   if (tabL) tabL.classList.add('active');

   if (sec === 'pendientes') renderizarPendientes();
   if (sec === 'servidor') cargarDelServidor();
   if (sec === 'mapa') inicializarMapa();
   if (sec === 'usuarios') renderizarUsuarios();
}

function configurarUIPorRol() {
   const rol = usuarioActual.rol;
   // encuestador -> solo pendientes y nueva (pestañas liServidor y liMapa quedan en d-none por defecto)
   if (rol === 'supervisor' || rol === 'admin') {
      document.getElementById('liServidor').classList.remove('d-none');
      document.getElementById('liMapa').classList.remove('d-none');
   }
   if (rol === 'admin') {
      document.getElementById('liUsuarios').classList.remove('d-none');
   }
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


   // Marcadores rojos = locales
   const redIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
   });

   const locales = await obtenerEncuestasLocales();
   locales.forEach(enc => {
      if (enc.latitud && enc.longitud && enc.sincronizado === false) {
         L.marker([enc.latitud, enc.longitud], { icon: redIcon })
            .addTo(mapaLeaflet)
            .bindPopup(`
                    <b>${enc.nombre}</b><br>
                    ${enc.sector} · ${enc.nivelEscolar}<br>
                    <small class="${enc.sincronizado ? 'text-success' : 'text-warning'}">
                        ${enc.sincronizado ? 'Sincronizado' : 'Pendiente'}
                    </small>`);
      }
   });



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


// pendientes
async function renderizarPendientes() {
   try {
      const todasLasEncuestas = await obtenerEncuestasLocales();
      const encuestasPendientes = todasLasEncuestas.filter(e => !e.sincronizado);
      const contenedor = document.getElementById('listaPendientes');

      if (encuestasPendientes.length === 0) {
         contenedor.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-inbox fs-1"></i>
                <p>No hay registros locales</p>
            </div>`;
         return;
      }

      contenedor.innerHTML = encuestasPendientes.map(e => `
         <div class="card mb-2">
            <div class="card-body d-flex align-items-center">
               ${e.imagenBase64 ? `<img src="${e.imagenBase64}" alt="Foto" class="rounded me-3" style="width: 60px; height: 60px; object-fit: cover;">` : `<div class="bg-secondary rounded me-3 d-flex justify-content-center align-items-center text-white" style="width: 60px; height: 60px;"><i class="bi bi-camera"></i></div>`}
               <div>
                  <p class="mb-1"><strong>${e.nombre}</strong> - ${e.sector}</p>
                  <p class="text-muted small mb-0">${e.nivelEscolar}</p>
               </div>
            </div>
         </div>
      `).join('');

   } catch (e) {
      mostrarAlerta('Error cargando pendientes: ' + e.message, 'danger');
   }
}

async function actualizarContadorPendientes() {
   const p = await obtenerPendientes();
   const badge = document.getElementById('badgePendientes');
   document.getElementById('numPendientes').textContent = p.length;
   badge.classList.toggle('d-none', p.length === 0);
}

// mapa y servidor 
async function sincronizarManual() {
   if (!estaOnline) { mostrarAlerta('Sin conexión para sincronizar', 'warning'); return; }

   const pendientes = await obtenerPendientes();
   if (pendientes.length === 0) { mostrarAlerta('No hay encuestas pendientes', 'info'); return; }

   if (workerSync) {
      workerSync.postMessage({
         tipo: 'SINCRONIZAR',
         datos: { wsUrl: WS_URL, encuestas: pendientes }
      });
      mostrarAlerta(` Sincronizando ${pendientes.length} encuesta(s)...`, 'info');
   } else {
      // Fallback via REST si Worker no disponible
      let ok = 0;
      for (const enc of pendientes) {
         try {
            const res = await fetch('/api/surveys', {
               method: 'POST',
               headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + tokenJWT
               },
               body: JSON.stringify(enc)
            });
            if (res.ok) { await marcarSincronizada(enc.localId); ok++; }
         } catch { }
      }
      mostrarAlerta(`✅ ${ok}/${pendientes.length} sincronizadas`, 'success');
      actualizarContadorPendientes();
   }
}

async function cargarDelServidor() {
   const cont = document.getElementById('listaServidor');

   if (!estaOnline) {
      cont.innerHTML = '<div class="alert alert-warning">Sin conexión al servidor</div>';
      return;
   }

   cont.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div></div>';

   try {
      const res = await fetch('/api/surveys', {
         headers: { 'Authorization': 'Bearer ' + tokenJWT }
      });

      // Si el token expiró, redirigir a login
      if (res.status === 401) { logout(); return; }

      const encuestas = await res.json();

      if (!Array.isArray(encuestas) || encuestas.length === 0) {
         cont.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-cloud fs-1"></i>
                    <p>No hay encuestas en el servidor todavía</p>
                </div>`;
         return;
      }

      cont.innerHTML = encuestas.map(enc => `
            <div class="card mb-2 shadow-sm border-primary">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="fw-bold mb-1">${enc.nombre}</h6>
                            <p class="text-muted small mb-0">
                                <i class="bi bi-geo-alt"></i> ${enc.sector} &bull;
                                <i class="bi bi-mortarboard"></i> ${enc.nivelEscolar}
                            </p>
                            <p class="text-muted small mb-0">
                                <i class="bi bi-person"></i> ${enc.usuario} &bull;
                                <i class="bi bi-calendar"></i> ${formatFecha(enc.fechaRegistro)}
                            </p>
                        </div>
                        <span class="badge bg-primary">
                            <i class="bi bi-cloud-check"></i> Servidor
                        </span>
                    </div>
                    ${enc.imagenBase64
            ? `<img src="${enc.imagenBase64}" class="img-thumbnail mt-2" style="max-height:80px;">`
            : ''}
                    <div class="d-flex gap-2 mt-2">
                        <button onclick="abrirEditar('${enc.id}', 'servidor')"
                                class="btn btn-warning btn-sm">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button onclick="eliminarServidor('${enc.id}')"
                                class="btn btn-danger btn-sm">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>`).join('');

   } catch (e) {
      cont.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
   }
}

//gestion de usuarios 
async function renderizarUsuarios() {
   if (usuarioActual.rol !== 'admin') return;

   try {
      const req = await fetch('/api/usuarios', {
         headers: { 'Authorization': 'Bearer ' + tokenJWT }
      });
      if (!req.ok) throw new Error('No autorizado');
      const usuarios = await req.json();

      const contenedor = document.getElementById('listaUsuarios');
      if (usuarios.length === 0) {
         contenedor.innerHTML = '<p>No hay usuarios</p>';
         return;
      }

      contenedor.innerHTML = usuarios.map(u => `
      <div class="card-body p-3">
         <div class="d-flex justify-content-between align-items-start">
            <div>
               <h6 class="fw-bold mb-1">${u.nombre} <small>(${u.username})</small></h6>
               <p class="text-muted small mb-0">Rol actual: <b>${u.rol}</b></p>
            </div>
         </div>
         <div class="mt-3 d-flex gap-2">
            <select id="selRol_${u.username}" class="form-select form-select-sm" style="width: auto;" ${u.username === usuarioActual.username || u.username === 'admin' ? 'disabled' : ''}>
               <option value="encuestador" ${u.rol === 'encuestador' ? 'selected' : ''}>Encuestador</option>
               <option value="supervisor" ${u.rol === 'supervisor' ? 'selected' : ''}>Supervisor</option>
               <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Administrador</option>
            </select>
            <button onclick="cambiarRolUsuario('${u.username}')" class="btn btn-outline-success btn-sm" ${u.username === usuarioActual.username || u.username === 'admin' ? 'disabled' : ''}>
               <i class="bi bi-person-check"></i> Actualizar
            </button>
            ${u.username !== usuarioActual.username && u.rol !== 'admin' ?
            `<button onclick="eliminarUsuario('${u.username}')" class="btn btn-outline-danger btn-sm">
                           <i class="bi bi-trash"></i> Eliminar
                     </button>` : ''}
         </div>
      </div>
   `).join('');
   } catch (e) {
      mostrarAlerta('Error cargando usuarios: ' + e.message, 'danger');
   }
}

async function cambiarRolUsuario(username) {
   if (!confirm('¿Cambiar rol a ' + username + '?')) return;
   const nuevoRol = document.getElementById('selRol_' + username).value;

   try {
      const req = await fetch('/api/usuarios/' + username + '/rol', {
         method: 'PUT',
         headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tokenJWT
         },
         body: JSON.stringify({ rol: nuevoRol })
      });
      if (!req.ok) throw new Error('Error al actualizar');
      mostrarAlerta('Rol actualizado correctamente', 'success');
      renderizarUsuarios();
   } catch (e) {
      mostrarAlerta(e.message, 'danger');
   }
}

async function eliminarUsuario(username) {
   if (!confirm('¡ATENCIÓN! ¿Eliminar usuario ' + username + ' de forma definitiva?')) return;
   try {
      const req = await fetch('/api/usuarios/' + username, {
         method: 'DELETE',
         headers: { 'Authorization': 'Bearer ' + tokenJWT }
      });
      if (!req.ok) throw new Error('Error al eliminar');
      mostrarAlerta('Usuario eliminado', 'success');
      renderizarUsuarios();
   } catch (e) {
      mostrarAlerta(e.message, 'danger');
   }
}