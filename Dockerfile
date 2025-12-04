# Use official Node.js LTS
FROM node:18

# Create app working folder
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy entire project
COPY . .

# Expose app port
EXPOSE 3000

# Start the app
CMD ["node", "voting.js"]
