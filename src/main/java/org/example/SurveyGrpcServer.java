package org.example;


import io.grpc.Server;
import io.grpc.ServerBuilder;
import org.example.services.SurveyGrpcService;

/**
 * Servidor gRPC que corre en paralelo al servidor Javalin (HTTP).
 * Escucha en el puerto 9090.
 */
public class SurveyGrpcServer {

    private final int puerto;
    private Server server;

    public SurveyGrpcServer(int puerto) {
        this.puerto = puerto;
    }

    public void start() throws Exception {
        server = ServerBuilder.forPort(puerto)
                .maxInboundMessageSize(10_000_000)
                .addService(new SurveyGrpcService())
                .build()
                .start();

        System.out.println("[gRPC] Servidor gRPC iniciado en puerto " + puerto);

        // Hook para cerrar el servidor limpiamente
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("[gRPC] Apagando servidor gRPC...");
            stop();
        }));
    }

    public void stop() {
        if (server != null) {
            server.shutdown();
        }
    }

    public void awaitTermination() throws InterruptedException {
        if (server != null) {
            server.awaitTermination();
        }
    }
}
