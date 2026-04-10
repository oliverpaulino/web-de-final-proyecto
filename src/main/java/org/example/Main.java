package org.example;
import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import org.example.services.MongoService;

//TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.
public class Main {
    static void main() {
      
        MongoService.getInstance();
         int httpPort = 7770;
        Javalin app = Javalin.create(config -> {
            // Servir archivos estáticos del frontend desde el classpath
            config.staticFiles.add("/static", Location.CLASSPATH);

            // Habilitar CORS para clientes REST/gRPC externos
            config.bundledPlugins.enableCors(cors -> {
                cors.addRule(rule -> {
                    rule.anyHost();
                    rule.allowCredentials = true;
                });
            });
        }).start(httpPort);
    }
}
