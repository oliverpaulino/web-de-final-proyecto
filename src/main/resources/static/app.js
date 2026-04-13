let mapaLeaflet = null;
let webcam = null;
let fotoBase64 = null;



window.addEventListener('DOMContentLoaded', async () => {
   await obtenerGeolocalizacion();
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

async function inicializarMapa() {
   if (!mapaLeaflet) {
      // Santiago de los Caballeros por defecto
      mapaLeaflet = L.map('mapa').setView([19.4517, -70.6970], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: '© OpenStreetMap contributors'
      }).addTo(mapaLeaflet);
   }

}

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



function mostrarAlerta(msg, tipo = 'info') {
   const el = document.getElementById('alertGlobal');
   if (!el) return;
   el.className = `alert alert-${tipo} mt-2 mx-2`;
   el.textContent = msg;
   el.classList.remove('d-none');
   setTimeout(() => el.classList.add('d-none'), 5000);
}



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