FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server/ ./server/

COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

EXPOSE 3000

VOLUME ["/app/recordings"]

CMD ["npm", "start"]
