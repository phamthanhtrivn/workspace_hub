FROM node:20-alpine

WORKDIR /app

# Sao chép package.json trước để tối ưu hóa cache
COPY package.json ./

RUN npm install

# Sao chép toàn bộ mã nguồn
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
