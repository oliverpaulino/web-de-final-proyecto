package org.example.Models;

import java.util.Date;

public class Usuario {

    private String id;
    private String username;
    private String password; // BCrypt hash no se expone en JSON
    private String nombre;
    private String rol; // admin, supervisor, encuestador
    private Date fechaCreacion;


    public Usuario(String username, String password, String nombre, String rol) {
        this.username = username;
        this.password = password;
        this.nombre = nombre;
        this.rol = rol;
        this.fechaCreacion = new Date();
    }

    public String getId() {
        return this.id;

    }

    public void setId(String id) {
        this.id = id;

    }

    public String getUsername() {
        return username;

    }

    public void setUsername(String username) {
        this.username = username;

    }

    public String getPassword() {
        return password;

    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getRol() {
        return this.rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public Date getFechaCreacion() {
        return this.fechaCreacion;
    }

    public void setFechaCreacion(Date fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

}
