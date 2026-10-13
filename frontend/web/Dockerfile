FROM node:22.22.0-alpine3.23@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34

WORKDIR /app

# Sao chép package.json trước để tối ưu hóa cache
COPY package.json package-lock.json ./

RUN npm ci

# Sao chép toàn bộ mã nguồn
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
