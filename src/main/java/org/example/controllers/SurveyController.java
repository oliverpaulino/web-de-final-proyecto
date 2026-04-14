package org.example.controllers;

import org.example.Models.Encuesta;
import org.example.services.MongoService;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;

import io.javalin.http.Context;
import org.bson.Document;
import org.bson.types.ObjectId;

import java.util.*;

public class SurveyController {
    public static void listarTodas(Context ctx) {
        try {
            List<Encuesta> lista = new ArrayList<>();
            for (Document doc : MongoService.getInstance().getEncuestas().find()) {
                lista.add(documentToEncuesta(doc));
            }
            ctx.json(lista);
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", "Error al listar encuestas"));
        }
    }

    public static void listarPorUsuario(Context ctx) {
        try {
            String usuario = ctx.pathParam("usuario");
            List<Encuesta> lista = new ArrayList<>();
            for (Document doc : MongoService.getInstance().getEncuestas()
                    .find(Filters.eq("usuario", usuario))) {
                lista.add(documentToEncuesta(doc));
            }
            ctx.json(lista);
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", "Error al listar encuestas del usuario"));
        }
    }

    public static void crear(Context ctx) {
        try {
            Encuesta encuesta = ctx.bodyAsClass(Encuesta.class);

            if (encuesta.getNombre() == null || encuesta.getNombre().isBlank()) {
                ctx.status(400).json(Map.of("error", "El nombre es requerido"));
                return;
            }
            if (encuesta.getSector() == null || encuesta.getSector().isBlank()) {
                ctx.status(400).json(Map.of("error", "El sector es requerido"));
                return;
            }
            if (encuesta.getNivelEscolar() == null || encuesta.getNivelEscolar().isBlank()) {
                ctx.status(400).json(Map.of("error", "El nivel escolar es requerido"));
                return;
            }

            // El usuario siempre viene del JWT, no del body
            encuesta.setUsuario(ctx.attribute("username"));
            encuesta.setFechaRegistro(new Date());
            encuesta.setSincronizado(true);

            Document doc = encuestaToDocument(encuesta);
            MongoService.getInstance().getEncuestas().insertOne(doc);

            ctx.status(201).json(Map.of(
                    "mensaje", "Encuesta guardada exitosamente",
                    "id", doc.getObjectId("_id").toHexString()));

        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", "Error al guardar la encuesta"));
        }
    }

    public static void actualizar(Context ctx) {
        try {
            String id = ctx.pathParam("id");
            String username = ctx.attribute("username");
            String rol = ctx.attribute("rol");
            Encuesta body = ctx.bodyAsClass(Encuesta.class);

            MongoCollection<Document> col = MongoService.getInstance().getEncuestas();
            Document existente = col.find(Filters.eq("_id", new ObjectId(id))).first();

            if (existente == null) {
                ctx.status(404).json(Map.of("error", "Encuesta no encontrada"));
                return;
            }
            if (!existente.getString("usuario").equals(username) && !"admin".equals(rol)) {
                ctx.status(403).json(Map.of("error", "Sin permiso para modificar este registro"));
                return;
            }

            col.updateOne(Filters.eq("_id", new ObjectId(id)), new Document("$set", new Document()
                    .append("nombre", body.getNombre())
                    .append("sector", body.getSector())
                    .append("nivelEscolar", body.getNivelEscolar())
                    .append("fechaActualizacion", new Date())));

            ctx.json(Map.of("mensaje", "Encuesta actualizada correctamente"));

        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", "Error al actualizar"));
        }
    }

    public static void eliminar(Context ctx) {
        try {
            String id = ctx.pathParam("id");
            String username = ctx.attribute("username");
            String rol = ctx.attribute("rol");

            MongoCollection<Document> col = MongoService.getInstance().getEncuestas();
            Document existente = col.find(Filters.eq("_id", new ObjectId(id))).first();

            if (existente == null) {
                ctx.status(404).json(Map.of("error", "Encuesta no encontrada"));
                return;
            }
            if (!existente.getString("usuario").equals(username) && !"admin".equals(rol)) {
                ctx.status(403).json(Map.of("error", "Sin permiso para eliminar"));
                return;
            }

            col.deleteOne(Filters.eq("_id", new ObjectId(id)));
            ctx.json(Map.of("mensaje", "Encuesta eliminada correctamente"));

        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", "Error al eliminar"));
        }
    }

    public static Document encuestaToDocument(Encuesta e) {
        return new Document()
                .append("nombre", e.getNombre())
                .append("sector", e.getSector())
                .append("nivelEscolar", e.getNivelEscolar())
                .append("usuario", e.getUsuario())
                .append("latitud", e.getLatitud())
                .append("longitud", e.getLongitud())
                .append("imagenBase64", e.getImagenBase64())
                .append("fechaRegistro", e.getFechaRegistro() != null ? e.getFechaRegistro() : new Date());
        // .append("sincronizado", e.isSincronizado());
    }

    public static Encuesta documentToEncuesta(Document doc) {
        Encuesta e = new Encuesta(doc.getString("nombre"), doc.getString("sector"), doc.getString("nivelEscolar"),
                doc.getString("usuario"), doc.getDouble("latitud"), doc.getDouble("longitud"),
                doc.getString("imagenBase64"), Optional.ofNullable(doc.getDate("fechaRegistro")));
        e.setId(doc.getObjectId("_id").toHexString());

        return e;
    }

}
