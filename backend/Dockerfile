FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN yarn install

COPY . .

EXPOSE 3000

VOLUME ["/app/recordings"]

CMD ["npm", "start"]
