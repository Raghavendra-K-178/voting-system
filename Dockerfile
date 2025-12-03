# Use Node.js official image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the project
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "voting.js"]
