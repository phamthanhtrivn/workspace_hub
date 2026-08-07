FROM maven:3.9.6-eclipse-temurin-21

WORKDIR /app

# Tải dependencies trước để tận dụng cache
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Sao chép mã nguồn
COPY src ./src

EXPOSE 8081

CMD ["mvn", "spring-boot:run"]
