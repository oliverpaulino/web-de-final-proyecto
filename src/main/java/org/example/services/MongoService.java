package org.example.services;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import java.lang.String;


public class MongoService {

    private static MongoService instance;
    private final MongoClient client;
    private final MongoDatabase database;

    // URI de MongoDB Atlas
    private static final String MONGO_URI = "mongodb+srv://myAtlasDBUser:bMDP7KahdMesijHh@cluster0.tbur6e8.mongodb.net/";
    private static final String DB_NAME = "encuestasdb";

    private MongoService() {
        System.out.println("[MongoDB] Conectando a: " + MONGO_URI.replaceAll(":.*@", ":***@"));
        this.client = MongoClients.create(MONGO_URI);
        this.database = client.getDatabase(DB_NAME);
        inicializarColecciones();
        System.out.println("[MongoDB] Conexión establecida con éxito.");
    }

    public static synchronized MongoService getInstance() {
        if (instance == null) {
            instance = new MongoService();
        }
        return instance;
    }

    private void inicializarColecciones() {
        getUsuarios().createIndex(new Document("username", 1));
        System.out.println("[MongoDB] Colecciones inicializadas.");
    }

    public MongoCollection<Document> getUsuarios() {
        return database.getCollection("usuarios");
    }

    public MongoCollection<Document> getEncuestas() {
        return database.getCollection("encuestas");
    }

    public void cerrar() {
        if (client != null) {
            client.close();
        }
    }
}
