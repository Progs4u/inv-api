FROM debian:latest

# Install necessary packages (example: curl, git)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install NVM and Node.js
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash \
    && export NVM_DIR="$HOME/.nvm" \
    && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" \
    && nvm install node \
    && nvm use node

# Set the working directory
WORKDIR /app

# Copy your application code to the container
COPY . /app

# Expose any necessary ports (example: 8080)
EXPOSE 3000

# Command to run your application (example: bash)
CMD ["bash"]
