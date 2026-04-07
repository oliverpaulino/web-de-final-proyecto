package com.survey.services;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Servicio para el manejo de JWTs
 */
public class JwtService {
    private static final String SECRET = System.getenv("JWT_SECRET") != null
            ? System.getenv("JWT_SECRET")
            : "secretosupersecretoyseguroparaelproyectofinal_pucmm";

    private static final long EXPIRACION_MS = 24 * 60 * 60 * 1000; // 24 horas

    private static final SecretKey CLAVE = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    /**
     * Genera un token JWT para el usuario dado.
     */
    public static String generarToken(String username, String rol) {
        Date ahora = new Date();
        Date expiracion = new Date(ahora.getTime() + EXPIRACION_MS);

        return Jwts.builder()
                .subject(username)
                .claim("rol", rol)
                .claim("username", username)
                .issuedAt(ahora)
                .expiration(expiracion)
                .signWith(CLAVE)
                .compact();
    }

    public static Claims verificarToken(String token) throws JwtException {
        try {
            return Jwts.parser()
                    .verifyWith(CLAVE)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (SignatureException e) {
            throw e;
        }
    }

    public static String getUsername(String token) {
        Claims claims = verificarToken(token);
        return claims.get("username", String.class);
    }

    public static String getRol(String token) {
        Claims claims = verificarToken(token);
        return claims.get("rol", String.class);
    }
}
