FROM node:22.19 AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the code
COPY . .

# Expose the port React runs on (if needed)
EXPOSE 3000

# Start app on container start
CMD ["npm", "start"]