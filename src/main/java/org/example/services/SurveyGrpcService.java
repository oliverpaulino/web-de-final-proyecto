package org.example.services;


import com.mongodb.client.model.Filters;
import com.survey.grpc.*;
import org.example.controllers.SurveyController;
import org.example.Models.Encuesta;
import org.example.services.MongoService;
import io.grpc.stub.StreamObserver;
import org.bson.Document;

import java.util.Date;
import java.util.Optional;

public class SurveyGrpcService extends SurveyServiceGrpc.SurveyServiceImplBase {

    @Override
    public void listarFormularios(UserRequest request, StreamObserver<SurveyListResponse> responseObserver) {
        try {
            SurveyListResponse.Builder builder = SurveyListResponse.newBuilder();

            for (Document doc : MongoService.getInstance().getEncuestas()
                    .find(Filters.eq("usuario", request.getUsuario()))) {

                Encuesta e = SurveyController.documentToEncuesta(doc);

                builder.addEncuestas(SurveyResponse.newBuilder()
                        .setId(e.getId())
                        .setNombre(nullSafe(e.getNombre()))
                        .setSector(nullSafe(e.getSector()))
                        .setNivelEscolar(nullSafe(e.getNivelEscolar()))
                        .setUsuario(nullSafe(e.getUsuario()))
                        .setLatitud(e.getLatitud()  != null ? e.getLatitud()  : 0.0)
                        .setLongitud(e.getLongitud() != null ? e.getLongitud() : 0.0)
                        .setFecha(e.getFechaRegistro() != null ? e.getFechaRegistro().toString() : "")
                        .setSuccess(true)
                        .build());
            }

            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();

        } catch (Exception e) {
            responseObserver.onError(e);
        }
    }

    @Override
    public void crearFormulario(SurveyRequest request, StreamObserver<SurveyResponse> responseObserver) {
        try {
            Encuesta encuesta = new Encuesta(
                    request.getNombre(),
                    request.getSector(),
                    request.getNivelEscolar(),
                    request.getUsuario(),
                    request.getLatitud(),
                    request.getLongitud(),
                    request.getImagenBase64(),
                    Optional.of(new Date())
            );

            Document doc = SurveyController.encuestaToDocument(encuesta);
            MongoService.getInstance().getEncuestas().insertOne(doc);

            responseObserver.onNext(SurveyResponse.newBuilder()
                    .setId(doc.getObjectId("_id").toHexString())
                    .setSuccess(true)
                    .setMensaje("Formulario creado via gRPC")
                    .setNombre(encuesta.getNombre())
                    .setSector(encuesta.getSector())
                    .setNivelEscolar(encuesta.getNivelEscolar())
                    .setUsuario(encuesta.getUsuario())
                    .build());

            responseObserver.onCompleted();

        } catch (Exception e) {
            responseObserver.onError(e);
        }
    }

    private String nullSafe(String s) { return s != null ? s : ""; }
}
