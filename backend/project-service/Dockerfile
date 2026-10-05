FROM node:22.22.0-alpine3.23@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34 AS development

RUN apk add --no-cache openssl
WORKDIR /app

# Sao chép file package.json
COPY package.json package-lock.json ./

# Sao chép thư mục prisma cấu hình để chạy generate client
COPY prisma ./prisma/

RUN npm ci

# Tạo Prisma client
RUN npx prisma generate

# Sao chép toàn bộ mã nguồn còn lại
COPY . .

EXPOSE 8082

CMD ["npm", "run", "start:dev"]

FROM development AS build

RUN npm run build

FROM node:22.22.0-alpine3.23@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34 AS production

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S nestjs && adduser -S nestjs -G nestjs

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

USER nestjs
EXPOSE 8082
CMD ["npm", "run", "start:prod"]
