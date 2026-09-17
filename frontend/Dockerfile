# Stage 1: React application ko build karna
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Vercel env variable logic handles this, but for docker fallback we can pass build-args
RUN npm run build

# Stage 2: Nginx sever ke sath distribution build serve karna
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Custom nginx route handle variables agar zaroori ho, default is ok
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]