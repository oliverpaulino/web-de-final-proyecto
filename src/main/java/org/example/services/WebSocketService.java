package org.example.services;





import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoCollection;
import org.example.services.MongoService;
import io.javalin.websocket.WsCloseContext;
import io.javalin.websocket.WsConnectContext;
import io.javalin.websocket.WsErrorContext;
import io.javalin.websocket.WsMessageContext;
import org.bson.Document;

import java.util.*;
        import java.util.concurrent.ConcurrentHashMap;

public class WebSocketService {

    // Mantener track de sesiones activas
    private static final Map<String, WsConnectContext> sesiones = new ConcurrentHashMap<>();
    private static final ObjectMapper mapper = new ObjectMapper();

    public static void onConnect(WsConnectContext ctx) {
        String sessionId = ctx.sessionId();
        sesiones.put(sessionId, ctx);
        System.out.println("[WebSocket] Cliente conectado: " + sessionId);

        // Confirmar conexión al cliente
        try {
            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("tipo", "conexion");
            respuesta.put("mensaje", "Conectado al servidor de sincronización");
            respuesta.put("sessionId", sessionId);
            ctx.send(mapper.writeValueAsString(respuesta));
        } catch (Exception e) {
            System.err.println("[WebSocket] Error al enviar confirmación: " + e.getMessage());
        }
    }

    public static void onMessage(WsMessageContext ctx) {
        try {
            String mensaje = ctx.message();
            Map<String, Object> data = mapper.readValue(mensaje, Map.class);
            String tipo = (String) data.get("tipo");

            System.out.println("[WebSocket] Mensaje recibido tipo: " + tipo);

            if ("sync".equals(tipo)) {
                // Sincronizar batch de encuestas pendientes
                List<Map<String, Object>> encuestas = (List<Map<String, Object>>) data.get("encuestas");
                int guardadas = 0;
                List<String> idsGuardados = new ArrayList<>();

                if (encuestas != null) {
                    MongoCollection<Document> col = MongoService.getInstance().getEncuestas();

                    for (Map<String, Object> encuesta : encuestas) {
                        Document doc = new Document()
                                .append("nombre",       (String) encuesta.get("nombre"))
                                .append("sector",       (String) encuesta.get("sector"))
                                .append("nivelEscolar", (String) encuesta.get("nivelEscolar"))
                                .append("usuario",      (String) encuesta.get("usuario"))
                                .append("latitud",      toDouble(encuesta.get("latitud")))
                                .append("longitud",     toDouble(encuesta.get("longitud")))
                                .append("imagenBase64", (String) encuesta.get("imagenBase64"))
                                .append("fechaRegistro", new Date())
                                .append("sincronizado", true);

                        col.insertOne(doc);
                        guardadas++;

                        // Retornar el localId para que el cliente marque como sincronizado
                        if (encuesta.get("localId") != null) {
                            idsGuardados.add((String) encuesta.get("localId").toString());
                        }
                    }
                }

                // Responder con resultado de sincronización
                Map<String, Object> respuesta = new HashMap<>();
                respuesta.put("tipo", "sync_resultado");
                respuesta.put("guardadas", guardadas);
                respuesta.put("idsGuardados", idsGuardados);
                respuesta.put("mensaje", guardadas + " encuesta(s) sincronizada(s) correctamente");
                ctx.send(mapper.writeValueAsString(respuesta));

            } else if ("ping".equals(tipo)) {
                Map<String, Object> pong = new HashMap<>();
                pong.put("tipo", "pong");
                pong.put("timestamp", System.currentTimeMillis());
                ctx.send(mapper.writeValueAsString(pong));
            }

        } catch (Exception e) {
            System.err.println("[WebSocket] Error procesando mensaje: " + e.getMessage());
            try {
                Map<String, Object> error = new HashMap<>();
                error.put("tipo", "error");
                error.put("mensaje", "Error procesando datos: " + e.getMessage());
                ctx.send(mapper.writeValueAsString(error));
            } catch (Exception ex) {
                // ignore
            }
        }
    }

    public static void onClose(WsCloseContext ctx) {
        sesiones.remove(ctx.sessionId());
        System.out.println("[WebSocket] Cliente desconectado: " + ctx.sessionId());
    }

    public static void onError(WsErrorContext ctx) {
        System.err.println("[WebSocket] Error en sesión " + ctx.sessionId() + ": " + ctx.error().getMessage());
        sesiones.remove(ctx.sessionId());
    }

    private static Double toDouble(Object val) {
        if (val == null) return null;
        if (val instanceof Double) return (Double) val;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return null; }
    }
}
