# 1. Base Node image choose karein
FROM node:20-alpine

# 2. Container ke andar app directory set karein
WORKDIR /usr/src/app

# 3. Package config files copy karein aur clean installation run karein
COPY package*.json ./
RUN npm install

# 4. Prisma Schema copy karke Prisma Client generate karein
COPY prisma ./prisma/
RUN npx prisma generate

# 5. Baaki ka saara code workspace mein copy karein
COPY . .

# 6. Backend port expose karein
EXPOSE 5000

# 7. App chalane ki startup command run karein
CMD ["npm", "start"]