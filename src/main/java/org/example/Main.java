package org.example;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
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

    }
}
