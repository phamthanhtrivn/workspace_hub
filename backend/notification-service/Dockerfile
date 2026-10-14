FROM node:22.22.0-alpine3.23@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34

RUN apk add --no-cache openssl
WORKDIR /app

# Sao chép package.json
COPY package.json package-lock.json ./

# Sao chép cấu hình Prisma
COPY prisma ./prisma/

RUN npm ci

# Sinh Prisma client
RUN npx prisma generate

# Sao chép mã nguồn còn lại
COPY . .

EXPOSE 8084

CMD ["npm", "run", "start:dev"]
