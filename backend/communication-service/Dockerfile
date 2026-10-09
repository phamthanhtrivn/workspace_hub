FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

# Sao chép package.json
COPY package.json ./

# Sao chép cấu hình Prisma
COPY prisma ./prisma/

RUN npm install

# Sinh Prisma client
RUN npx prisma generate

# Sao chép mã nguồn còn lại
COPY . .

EXPOSE 8083

CMD ["npm", "run", "start:dev"]
