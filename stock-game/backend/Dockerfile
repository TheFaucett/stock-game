# Use official Node.js LTS image
FROM node:22.19

# Create app directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Set environment variables (if needed here)
ENV PORT=5000

# Expose the port your backend runs on
EXPOSE 5000

# Start the app
CMD ["node", "--max_old_space_size=4096","server.js"]
