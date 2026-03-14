# ===== STAGE 1: Build con Node 22 =====
FROM node:22-alpine AS build

WORKDIR /app

# Copia package files per cacheare le dipendenze (layer cached)
COPY package.json package-lock.json ./
RUN npm ci

# Copia il codice sorgente e builda
COPY . .
RUN npm run build

# ===== STAGE 2: Serve con Nginx =====
FROM nginx:alpine

# Copia gli asset statici buildati dallo stage precedente
COPY --from=build /app/dist /usr/share/nginx/html

# Copia la configurazione Nginx custom per SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
