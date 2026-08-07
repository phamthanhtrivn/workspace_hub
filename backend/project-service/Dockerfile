FROM node:20-alpine

WORKDIR /app

# Sao chép file package.json
COPY package.json ./

# Sao chép thư mục prisma cấu hình để chạy generate client
COPY prisma ./prisma/

RUN npm install

# Tạo Prisma client
RUN npx prisma generate

# Sao chép toàn bộ mã nguồn còn lại
COPY . .

EXPOSE 8082

CMD ["npm", "run", "start:dev"]
