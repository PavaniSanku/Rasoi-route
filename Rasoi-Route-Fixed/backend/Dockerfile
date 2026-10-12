FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B clean verify
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S rasoi && adduser -S rasoi -G rasoi
COPY --from=build /app/target/rasoi-backend-1.0.0.jar app.jar
USER rasoi
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
