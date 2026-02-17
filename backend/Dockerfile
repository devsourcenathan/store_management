FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate  
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --skipLibCheck --module commonjs --target es2021 --esModuleInterop
RUN npx tsc prisma/seed-permissions.ts --outDir dist/prisma --skipLibCheck --module commonjs --target es2021 --esModuleInterop

FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/i18n ./dist/i18n
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
