FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3001

# We will run migrations automatically in the compose file via a separate command
CMD ["npm", "start"]
