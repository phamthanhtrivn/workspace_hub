FROM node:20-alpine AS development

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

FROM node:20-alpine AS production

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
