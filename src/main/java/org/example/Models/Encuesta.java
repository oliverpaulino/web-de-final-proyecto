package org.example.Models;

import java.util.Date;

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

   public Encuesta(String nombre, String sector, String nivelEscolar,
         String usuario, Double latitud, Double longitud,
         String imagenBase64) {
      this.nombre = nombre;
      this.sector = sector;
      this.nivelEscolar = nivelEscolar;
      this.usuario = usuario;
      this.latitud = latitud;
      this.longitud = longitud;
      this.imagenBase64 = imagenBase64;
      this.fechaRegistro = new Date();
   }

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
      return this.sector;

   }

   public void setSector(String sector) {
      this.sector = sector;

   }

   public String getNivelEscolar() {
      return this.nivelEscolar;

   }

   public void setNivelEscolar(String nivelEscolar) {
      this.nivelEscolar = nivelEscolar;

   }

   public String getUsuario() {
      return this.usuario;

   }

   public void setUsuario(String usuario) {
      this.usuario = usuario;

   }

   public Double getLatitud() {
      return this.latitud;

   }

   public void setLatitud(Double latitud) {
      this.latitud = latitud;

   }

   public Double getLongitud() {
      return this.longitud;

   }

   public void setLongitud(Double longitud) {
      this.longitud = longitud;

   }

   public String getImagenBase64() {
      return this.imagenBase64;

   }

   public void setImagenBase64(String imagenBase64) {
      this.imagenBase64 = imagenBase64;

   }

   public Date getFechaRegistro() {
      return this.fechaRegistro;

   }

   public void setFechaRegistro(Date fechaRegistro) {
      this.fechaRegistro = fechaRegistro;

   }

}
