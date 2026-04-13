
let socket = null;

self.onmessage = function (event) {
    const { tipo, datos } = event.data;

    switch (tipo) {
        case 'SINCRONIZAR':
            sincronizar(datos.wsUrl, datos.encuestas);
            break;
        case 'DETENER':
            if (socket) socket.close();
            break;
    }
};

function sincronizar(wsUrl, encuestas) {
    if (!encuestas || encuestas.length === 0) {
        self.postMessage({ tipo: 'SIN_PENDIENTES' });
        return;
    }

    console.log('[Worker] Conectando a', wsUrl, 'para sincronizar', encuestas.length, 'encuesta(s)');

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            self.postMessage({ tipo: 'WS_CONECTADO' });
            socket.send(JSON.stringify({ tipo: 'sync', encuestas }));
        };

        socket.onmessage = (e) => {
            try {
                const res = JSON.parse(e.data);
                if (res.tipo === 'sync_resultado') {
                    self.postMessage({
                        tipo: 'SYNC_COMPLETADO',
                        guardadas: res.guardadas,
                        idsGuardados: res.idsGuardados,
                        mensaje: res.mensaje
                    });
                    socket.close();
                } else if (res.tipo === 'error') {
                    self.postMessage({ tipo: 'SYNC_ERROR', mensaje: res.mensaje });
                }
            } catch (err) {
                console.error('[Worker] Error parseando respuesta:', err);
            }
        };

        socket.onerror = () => {
            self.postMessage({ tipo: 'WS_ERROR', mensaje: 'No se pudo conectar al servidor' });
        };

        socket.onclose = () => {
            self.postMessage({ tipo: 'WS_DESCONECTADO' });
        };

    } catch (err) {
        self.postMessage({ tipo: 'WS_ERROR', mensaje: err.message });
    }
}