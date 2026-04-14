# ============================================================
# Stage 1: Build
# ============================================================
FROM gradle:8.11-jdk21 AS builder

WORKDIR /app

COPY build.gradle settings.gradle ./
RUN gradle dependencies --no-daemon || true

COPY src ./src
RUN gradle shadowJar --no-daemon -x test


FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

# HTTP + gRPC
EXPOSE 7770
EXPOSE 9090

ENV MONGO_URI=mongodb://localhost:27017/surveydb

ENTRYPOINT ["java", "-jar", "app.jar"]