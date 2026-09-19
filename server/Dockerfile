# FROM mcr.microsoft.com/playwright:v1.47.0-jammy

# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .

# EXPOSE 4000
# CMD ["npm", "start"]


FROM node:22-jammy

WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npx playwright install --with-deps chromium
COPY . .

EXPOSE 4000
CMD ["npm", "start"]
