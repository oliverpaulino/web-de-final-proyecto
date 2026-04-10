package org.example;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import org.example.controllers.AuthController;
import org.example.services.MongoService;

public class Main {
    public static void main(String[] args) {

        MongoService.getInstance();
        int httpPort = 7770;
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
        }).start(httpPort);

        app.get("/", ctx -> ctx.redirect("/login.html"));
        app.post("/api/auth/register", AuthController::register);
        app.post("/api/auth/login", AuthController::login);


        app.before("/api/surveys/*", AuthController::verificarJWT);

    }
}
