FROM node:alpine

WORKDIR /app
COPY Package.json .
RUN npm install
COPY . .

CMD ["npm","start"]