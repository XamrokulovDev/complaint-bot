FROM node:20-alpine

# Ishchi direktoriyani yaratamiz
WORKDIR /app

# package.json fayllarini ko'chiramiz
COPY package*.json ./

# NPM paketlarini o'rnatamiz (--legacy-peer-deps bilan)
RUN npm install --legacy-peer-deps --no-audit

# Source code ni ko'chiramiz
COPY . .

# Xavfsizlik uchun node foydalanuvchisiga o'tamiz
RUN chown -R node:node /app

# node foydalanuvchisiga o'tish
USER node

# Botni ishga tushirish
CMD ["npm", "run", "dev"]