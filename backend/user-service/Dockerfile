FROM maven:3.9.6-eclipse-temurin-21@sha256:8d63d4c1902cb12d9e79a70671b18ebe26358cb592561af33ca1808f00d935cb

WORKDIR /app

# Tải dependencies trước để tận dụng cache
COPY pom.xml .
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN mvn dependency:go-offline -B

# Sao chép mã nguồn
COPY src ./src

EXPOSE 8081

CMD ["mvn", "spring-boot:run"]
