# 1. Imagen base de Node.js
FROM node:18-slim

# 2. Directorio de trabajo
WORKDIR /usr/src/app

# 3. Copia package.json y lock, e instala dependencias
COPY package*.json ./
RUN npm install --production

# 4. Copia el resto de tu código
COPY . .

# 5. Instala utilidades de shell que usa tu API
RUN apt-get update \
    && apt-get install -y zip screen \
    && rm -rf /var/lib/apt/lists/*

# 6. Da permisos a tus scripts .sh
RUN chmod +x src/config/scripts/*.sh

# 7. Expone el puerto 3000 (ajústalo si usas otro)
EXPOSE 19130

# 8. Arranca tu aplicación
CMD ["node", "index.js"]
