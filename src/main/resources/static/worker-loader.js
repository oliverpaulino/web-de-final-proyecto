
let workerSync = null;

function iniciarWorker() {
    try {
        workerSync = new Worker('/worker.js');

        workerSync.onmessage = async (e) => {
            const { tipo, mensaje } = e.data;
            switch (tipo) {
                case 'SYNC_COMPLETADO':
                    mostrarAlerta(`${e.data.mensaje}`, 'success');
                    await marcarTodasSincronizadas();
                    await actualizarContadorPendientes();
                    break;
                case 'SYNC_ERROR':
                case 'WS_ERROR':
                    mostrarAlerta(`${mensaje}`, 'warning');
                    break;
                case 'WS_CONECTADO':
                    console.log('[App] Worker conectado al WebSocket');
                    break;
            }
        };

        workerSync.onerror = (e) => {
            console.warn('[App] Error en Worker:', e.message);
        };

        console.log('[App] Web Worker inicializado correctamente.');
    } catch (e) {
        console.warn('[App] Web Worker no disponible:', e.message);
    }
}

async function marcarTodasSincronizadas() {
    const todas = await obtenerEncuestasLocales();
    for (const enc of todas) {
        if (!enc.sincronizado) {
            await marcarSincronizada(enc.localId);
        }
    }
    renderizarPendientes();
}