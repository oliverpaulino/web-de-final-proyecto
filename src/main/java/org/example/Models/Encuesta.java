package org.example.Models;

import java.util.Date;
import java.util.Optional;

public class Encuesta {

   private String id;
   private String nombre;
   private String sector;
   private String nivelEscolar; // Básico, Medio, Grado Universitario, Postgrado, Doctorado
   private String usuario;
   private Double latitud;
   private Double longitud;
   private String imagenBase64;
   private Date fechaRegistro;
   private boolean sincronizado;

   public Encuesta() {
      // Constructor vacío requerido para deserialización JSON (Jackson)
   }

   public Encuesta(String nombre, String sector, String nivelEscolar,
         String usuario, Double latitud, Double longitud,
         String imagenBase64, Optional<Date> fechaRegistro) {
      this.nombre = nombre;
      this.sector = sector;
      this.nivelEscolar = nivelEscolar;
      this.usuario = usuario;
      this.latitud = latitud;
      this.longitud = longitud;
      this.imagenBase64 = imagenBase64;
      this.fechaRegistro = fechaRegistro.orElse(new Date());
   }

   // ── Getters y Setters ─────────────────────────────────────────────

   public String getId() {
      return id;
   }

   public void setId(String id) {
      this.id = id;
   }

   public String getNombre() {
      return nombre;
   }

   public void setNombre(String nombre) {
      this.nombre = nombre;
   }

   public String getSector() {
      return sector;
   }

   public void setSector(String sector) {
      this.sector = sector;
   }

   public String getNivelEscolar() {
      return nivelEscolar;
   }

   public void setNivelEscolar(String nivelEscolar) {
      this.nivelEscolar = nivelEscolar;
   }

   public String getUsuario() {
      return usuario;
   }

   public void setUsuario(String usuario) {
      this.usuario = usuario;
   }

   public Double getLatitud() {
      return latitud;
   }

   public void setLatitud(Double latitud) {
      this.latitud = latitud;
   }

   public Double getLongitud() {
      return longitud;
   }

   public void setLongitud(Double longitud) {
      this.longitud = longitud;
   }

   public String getImagenBase64() {
      return imagenBase64;
   }

   public void setImagenBase64(String imagenBase64) {
      this.imagenBase64 = imagenBase64;
   }

   public Date getFechaRegistro() {
      return fechaRegistro;
   }

   public void setFechaRegistro(Date fechaRegistro) {
      this.fechaRegistro = fechaRegistro;
   }

   public boolean isSincronizado() {
      return sincronizado;
   }

   public void setSincronizado(boolean sincronizado) {
      this.sincronizado = sincronizado;
   }

}
