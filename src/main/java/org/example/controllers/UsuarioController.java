package org.example.controllers;

import com.mongodb.client.MongoCollection;
import io.javalin.http.Context;
import org.bson.Document;
import org.example.Models.Usuario;
import org.example.services.MongoService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class UsuarioController {

   public static void listarUsuarios(Context ctx) {
      String rolActual = ctx.attribute("rol");
      if (!"admin".equals(rolActual)) {
         ctx.status(403).json(Map.of("error", "Acceso denegado. Solo administradores."));
         return;
      }

      MongoCollection<Document> col = MongoService.getInstance().getUsuarios();
      List<Usuario> usuarios = new ArrayList<>();

      for (Document doc : col.find()) {
         // Se usa el AuthController.documentToUsuario y se asegura limpiar password para
         // no enviarlo
         Usuario u = AuthController.documentToUsuario(doc);
         u.setPassword(null);
         usuarios.add(u);
      }

      ctx.json(usuarios);
   }

   public static void actualizarRol(Context ctx) {
      String rolActual = ctx.attribute("rol");
      if (!"admin".equals(rolActual)) {
         ctx.status(403).json(Map.of("error", "Acceso denegado. Solo administradores."));
         return;
      }

      String username = ctx.pathParam("username");
      Map<String, String> body = ctx.bodyAsClass(Map.class);
      String nuevoRol = body.get("rol");

      if (nuevoRol == null
            || (!nuevoRol.equals("admin") && !nuevoRol.equals("supervisor") && !nuevoRol.equals("encuestador"))) {
         ctx.status(400).json(Map.of("error", "Rol inválido"));
         return;
      }

      if (username.equals("admin") || username.equals(ctx.attribute("username"))) {
         ctx.status(403).json(Map.of("error", "No puedes editar este usuario"));
         return;
      }

      MongoCollection<Document> col = MongoService.getInstance().getUsuarios();
      Document updated = col.findOneAndUpdate(
            new Document("username", username),
            new Document("$set", new Document("rol", nuevoRol)));

      if (updated != null) {
         ctx.json(Map.of("mensaje", "Rol actualizado exitosamente"));
      } else {
         ctx.status(404).json(Map.of("error", "Usuario no encontrado"));
      }
   }

   public static void eliminarUsuario(Context ctx) {
      String rolActual = ctx.attribute("rol");
      if (!"admin".equals(rolActual)) {
         ctx.status(403).json(Map.of("error", "Acceso denegado. Solo administradores."));
         return;
      }

      String username = ctx.pathParam("username");

      // Evitar que el admin se elimine a sí mismo accidentalmente o al superadmin "admin"
      if (username.equals("admin") || username.equals(ctx.attribute("username"))) {
         ctx.status(403).json(Map.of("error", "No puedes eliminar este usuario"));
         return;
      }

      MongoCollection<Document> col = MongoService.getInstance().getUsuarios();
      Document deleted = col.findOneAndDelete(new Document("username", username));

      if (deleted != null) {
         ctx.json(Map.of("mensaje", "Usuario eliminado"));
      } else {
         ctx.status(404).json(Map.of("error", "Usuario no encontrado"));
      }
   }
}
