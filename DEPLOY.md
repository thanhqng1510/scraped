# Deployment Guide

---

## Prerequisites

-   **A Linux Server**: A virtual machine (e.g., from DigitalOcean, AWS, or GCP) running a modern Linux distribution like Ubuntu 22.04.
-   **A Domain Name**: A domain pointing to a server's public IP address. For demo purposes, you can get a free one from a service like [DuckDNS](https://www.duckdns.org/). This is required for HTTPS.
-   **External PostgreSQL Database**: The connection URL for production database.
-   **Firebase Service Account**: The `firebase-service-account.json` file for the project.

---

## 1. Install System Dependencies

Connect to server via SSH and run the following commands.

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Nginx, Redis, and build tools
sudo apt install -y nginx redis-server build-essential

# Install Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Chromium for Puppeteer
sudo apt install -y chromium-browser

# Install PM2 Process Manager
sudo npm install pm2 -g

# Configure Firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 2. Deploy Backend and Worker

1.  **Clone the Repository**

2.  **Install Dependencies and Build**:

    ```bash
    cd server
    npm install
    npm run build
    ```

3.  **Copy Firebase Credentials**: 

    Copy the service account file into the `dist` directory.
    
    ```bash
    # Run from local machine
    scp /path/to/local/firebase-service-account.json user@SERVER_IP:/path/to/repo/server/dist/
    ```

4.  **Configure and Start with PM2**: 

    Create an `ecosystem.config.js` file in the `server` directory to manage apps and environment variables.

    ```javascript
    // server/ecosystem.config.js
    module.exports = {
      apps: [
        {
          name: 'backend',
          script: 'dist/index.js',
          env: {
            NODE_ENV: 'production',
            REDIS_HOST: '127.0.0.1',
            DATABASE_URL: 'EXTERNAL_DATABASE_URL',
            JWT_SECRET: 'PRODUCTION_JWT_SECRET',
            PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium-browser',
          },
        },
        {
          name: 'worker',
          script: 'npm',
          args: 'run worker:start',
          instances: 3,
          env: { /* ... same as backend ... */ },
        },
      ],
    };
    ```

5.  **Run Migrations and Start**:

    ```bash
    npx prisma migrate deploy
    pm2 start ecosystem.config.js
    pm2 startup # Follow instructions to enable on reboot
    pm2 save
    ```

### 3. Deploy Frontend and Configure Nginx

1.  **Build Frontend Locally**: 

    On local machine, build the Angular assets.
    ```bash
    cd client && npm run build -- --configuration production
    ```

2.  **Copy Files to Server**:

    ```bash
    # On server:
    sudo mkdir -p /var/www/domain-app.com
    sudo chown -R $USER:$USER /var/www/domain-app.com

    # From local machine:
    scp -r client/dist/client/browser/* user@SERVER_IP:/var/www/domain-app.com/
    ```

3.  **Create Nginx Server Block**:

    ```bash
    sudo nano /etc/nginx/sites-available/domain-app.com
    ```
    Paste the following configuration:
    ```nginx
    server {
        listen 80;
        server_name domain-app.com; # <-- Replace with real domain

        root /var/www/domain-app.com;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /login {
          proxy_pass http://localhost:3000;
        }

        location /api {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

4.  **Enable Nginx Site and Get SSL Certificate**:

    ```bash
    # Enable the site
    sudo ln -s /etc/nginx/sites-available/domain-app.com /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx

    # Install Certbot and get certificate
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d domain-app.com # Follow prompts
    ```