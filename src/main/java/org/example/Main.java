package org.example;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
// App imports
import org.example.Models.Encuesta;
import org.example.controllers.AuthController;
import org.example.controllers.SurveyController;
import org.example.services.MongoService;
import org.example.services.WebSocketService;

import java.util.Map;

import org.example.SurveyGrpcServer;

public class Main {
    public static void main(String[] args) throws Exception {

        MongoService.getInstance();
        int httpPort = 7770;
        SurveyGrpcServer grpcServer = new SurveyGrpcServer(9090);
        grpcServer.start();
        Javalin app = Javalin.create(config -> {
            // Servir archivos estáticos del frontend desde el classpath
            config.staticFiles.add("/static", Location.CLASSPATH);
            // Habilitar CORS para clientes REST/gRPC externos
            config.bundledPlugins.enableCors(cors -> {
                cors.addRule(rule -> {
                    rule.reflectClientOrigin = true;
                    rule.allowCredentials = true;
                });
            });
            // Aumentar límites para payloads con imágenes en Base64
            config.http.maxRequestSize = 10_000_000L; // 10MB
            // Aumentar los límites de los mensajes de WebSockets (útil para Base64)
            config.jetty.modifyWebSocketServletFactory(wsFactory -> {
                wsFactory.setMaxTextMessageSize(10000000); // ~10MB
                wsFactory.setMaxBinaryMessageSize(10000000);
            });
        }).start(httpPort);

        app.get("/", ctx -> ctx.redirect("/login.html"));
        app.post("/api/auth/register", AuthController::register);
        app.post("/api/auth/login", AuthController::login);

        // Security middleware for protected routes
        app.before("/api/surveys*", AuthController::verificarJWT);
        app.before("/api/usuarios*", AuthController::verificarJWT);
        // Survey routes
        app.get("/api/surveys", SurveyController::listarTodas);
        app.get("/api/surveys/usuario/{usuario}", SurveyController::listarPorUsuario);
        app.post("/api/surveys", SurveyController::crear);
        app.put("/api/surveys/{id}", SurveyController::actualizar);
        app.delete("/api/surveys/{id}", SurveyController::eliminar);

        // websocket
        app.ws("/ws/sync", ws -> {
            ws.onConnect(WebSocketService::onConnect);
            ws.onMessage(WebSocketService::onMessage);
            ws.onClose(WebSocketService::onClose);
            ws.onError(WebSocketService::onError);
        });

        // Admin User management routes
        app.get("/api/usuarios", org.example.controllers.UsuarioController::listarUsuarios);
        app.put("/api/usuarios/{username}/rol", org.example.controllers.UsuarioController::actualizarRol);
        app.delete("/api/usuarios/{username}", org.example.controllers.UsuarioController::eliminarUsuario);

        app.get("/health", ctx -> ctx.json(Map.of("status", "ok", "mensaje", "Servidor activo")));

        app.get("/api/surveys-grpc-proxy/usuario/{usuario}", ctx -> {
            io.grpc.ManagedChannel ch = io.grpc.ManagedChannelBuilder.forAddress("localhost", 9090).usePlaintext().maxInboundMessageSize(10_000_000).build();
            com.survey.grpc.SurveyServiceGrpc.SurveyServiceBlockingStub stub = com.survey.grpc.SurveyServiceGrpc.newBlockingStub(ch);
            com.survey.grpc.SurveyListResponse res = stub.listarFormularios(com.survey.grpc.UserRequest.newBuilder().setUsuario(ctx.pathParam("usuario")).build());
            ch.shutdown();
            java.util.List<Map<String, Object>> out = new java.util.ArrayList<>();
            for (com.survey.grpc.SurveyResponse r : res.getEncuestasList()) {
                out.add(Map.of("id", r.getId(), "nombre", r.getNombre(), "sector", r.getSector(), "nivelEscolar", r.getNivelEscolar(), "usuario", r.getUsuario(), "latitud", r.getLatitud(), "longitud", r.getLongitud(), "fechaRegistro", r.getFecha(), "imagenBase64", r.getImagenBase64()));
            }
            ctx.json(out);
        });

        app.post("/api/surveys-grpc-proxy", ctx -> {
            Encuesta body = ctx.bodyAsClass(Encuesta.class);
            io.grpc.ManagedChannel ch = io.grpc.ManagedChannelBuilder.forAddress("localhost", 9090).usePlaintext().maxInboundMessageSize(10_000_000).build();
            com.survey.grpc.SurveyServiceGrpc.SurveyServiceBlockingStub stub = com.survey.grpc.SurveyServiceGrpc.newBlockingStub(ch);
            com.survey.grpc.SurveyRequest req = com.survey.grpc.SurveyRequest.newBuilder()
                    .setNombre(body.getNombre()).setSector(body.getSector()).setNivelEscolar(body.getNivelEscolar())
                    .setUsuario(body.getUsuario()).setLatitud(body.getLatitud()).setLongitud(body.getLongitud())
                    .setImagenBase64(body.getImagenBase64() != null ? body.getImagenBase64() : "")
                    .build();
            com.survey.grpc.SurveyResponse res = stub.crearFormulario(req);
            ch.shutdown();
            ctx.status(201).json(Map.of("id", res.getId(), "success", res.getSuccess(), "mensaje", res.getMensaje()));
        });

    }
}
