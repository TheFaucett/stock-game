# Use official Node.js LTS image
FROM node:22.19

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Set the port environment variable (optional override)
ENV PORT=5000

# Expose backend port
EXPOSE 5000


# Run the server with memory limit
CMD ["node", "--max_old_space_size=4096", "server.js"]
