package org.example.controllers;

import com.mongodb.client.MongoCollection;
import org.example.Models.Usuario;
import org.example.services.JwtService;
import org.example.services.MongoService;
import io.javalin.http.Context;
import io.jsonwebtoken.JwtException;
import org.bson.Document;
import org.mindrot.jbcrypt.BCrypt;

import java.util.Date;
import java.util.Map;

public class AuthController {

    // metodo para register usuairo
    public static void register(Context ctx) {
        try {
            Usuario body = ctx.bodyAsClass(Usuario.class);

            if (body.getUsername() == null || body.getUsername().isBlank()) {
                ctx.status(400).json(Map.of("error", "El username es requerido"));
                return;
            }
            if (body.getPassword() == null || body.getPassword().length() < 6) {
                ctx.status(400).json(Map.of("error", "La contraseña debe tener al menos 6 caracteres"));
                return;
            }

            MongoCollection<Document> col = MongoService.getInstance().getUsuarios();

            if (col.find(new Document("username", body.getUsername())).first() != null) {
                ctx.status(409).json(Map.of("error", "El usuario ya existe"));
                return;
            }

            Usuario nuevo = new Usuario(body.getUsername(), BCrypt.hashpw(body.getPassword(), BCrypt.gensalt()), body.getNombre() != null ? body.getNombre() : body.getUsername(), body.getRol() != null ? body.getRol() : "encuestador");

            Document doc = usuarioToDocument(nuevo);
            col.insertOne(doc);
            nuevo.setId(doc.getObjectId("_id").toHexString());

            String token = JwtService.generarToken(nuevo.getUsername(), nuevo.getRol());

            ctx.status(201).json(Map.of("mensaje", "Usuario registrado exitosamente", "token", token, "username", nuevo.getUsername(), "nombre", nuevo.getNombre(), "rol", nuevo.getRol()));

        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", "Error interno del servidor"));
        }
    }

    //metodo de login
    public static void login(Context ctx) {
        try {
            Usuario body = ctx.bodyAsClass(Usuario.class);

            if (body.getUsername() == null || body.getPassword() == null) {
                ctx.status(400).json(Map.of("error", "Username y password son requeridos"));
                return;
            }

            Document doc = MongoService.getInstance().getUsuarios().find(new Document("username", body.getUsername())).first();

            if (doc == null || !BCrypt.checkpw(body.getPassword(), doc.getString("password"))) {
                ctx.status(401).json(Map.of("error", "Credenciales incorrectas"));
                return;
            }

            Usuario usuario = documentToUsuario(doc);
            String token = JwtService.generarToken(usuario.getUsername(), usuario.getRol());

            ctx.json(Map.of("token", token, "username", usuario.getUsername(), "nombre", usuario.getNombre(), "rol", usuario.getRol(), "mensaje", "Login exitoso"));

        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", "Error interno del servidor"));
        }
    }
    // verificar jwts
    public static void verificarJWT(Context ctx) {
        String header = ctx.header("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            ctx.status(401).json(Map.of("error", "Token no proporcionado"));
            ctx.skipRemainingHandlers();
            return;
        }
        try {
            String token = header.substring(7);
            ctx.attribute("username", JwtService.getUsername(token));
            ctx.attribute("rol", JwtService.getRol(token));
        } catch (JwtException e) {
            ctx.status(401).json(Map.of("error", "Token inválido o expirado"));
            ctx.skipRemainingHandlers();
        }
    }

    // helpers para convertir las clases a json y viceversa
    public static Document usuarioToDocument(Usuario u) {
        return new Document().append("username", u.getUsername()).append("password", u.getPassword()).append("nombre", u.getNombre()).append("rol", u.getRol()).append("fechaCreacion", u.getFechaCreacion() != null ? u.getFechaCreacion() : new Date());
    }

    public static Usuario documentToUsuario(Document doc) {

        Usuario user = new Usuario( doc.getString("username"), doc.getString("password"), doc.getString("nombre"), doc.getString("rol"));
        user.setId(doc.getObjectId("_id").toHexString());
        user.setFechaCreacion(doc.getDate("fechaCreacion"));
        return  user;

    }
}