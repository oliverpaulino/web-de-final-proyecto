package org.example.controllers;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import org.example.Models.Encuesta;
import org.example.services.MongoService;
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
//                .append("sincronizado", e.isSincronizado());
    }

    public static Encuesta documentToEncuesta(Document doc) {
        Encuesta e = new Encuesta(doc.getString("nombre"), doc.getString("sector"), doc.getString("nivelEscolar"), doc.getString("usuario"), doc.getDouble("latitud"), doc.getDouble("longitud"), doc.getString("imagenBase64"), Optional.ofNullable(doc.getDate("fechaRegistro")));
        e.setId(doc.getObjectId("_id").toHexString());

        return e;
    }

}
