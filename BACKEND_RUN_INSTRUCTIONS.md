# Backend Run & Local Development Instructions
## Project: MarketMaster Academy
**Prerequisites**: JDK 21+, Maven 3.9+ or Gradle 8.8+, Docker (optional, for local Postgres/Redis)  

---

### 1. Prerequisites Installation (Windows / Linux / macOS)
* **Java 21**: Ensure `java -version` returns Java 21 LTS (OpenJDK, Eclipse Temurin, or Amazon Corretto).
* **Maven**: Ensure `mvn -v` is installed and on system PATH.
* **Database**: Local PostgreSQL 16 or free-tier cloud PostgreSQL connection URI (e.g. Neon.tech / Supabase).

---

### 2. Local Environment Configuration (`application-local.yml`)

Create or update `src/main/resources/application-local.yml`:

```yaml
server:
  port: 8080
  compression:
    enabled: true

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/marketmaster_db
    username: postgres
    password: postgres_password
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  flyway:
    enabled: true
    baseline-on-migrate: true
  data:
    redis:
      host: localhost
      port: 6379

app:
  jwt:
    secret: "super-secret-jwt-key-minimum-256-bits-length-for-hmac-sha-marketmaster"
    access-token-expiration-ms: 900000 # 15 minutes
    refresh-token-expiration-ms: 604800000 # 7 days
  security:
    cors:
      allowed-origins: "http://localhost:3000,http://127.0.0.1:3000"
```

---

### 3. Running with Maven

```bash
# 1. Clean and compile
mvn clean compile

# 2. Run database migrations
mvn flyway:migrate

# 3. Run application locally with 'local' profile
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### 4. Running with Docker Compose (₹0 Local Infrastructure)

```bash
# Start PostgreSQL & Redis services locally
docker compose up -d postgres redis

# Verify services
docker ps
```

Health check endpoint: `http://localhost:8080/actuator/health`  
API Swagger UI (Local Dev Only): `http://localhost:8080/swagger-ui.html`

