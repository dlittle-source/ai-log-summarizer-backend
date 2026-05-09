# Deployment Notes — AI Log Summarizer Backend

## Overview

This project demonstrates a complete backend deployment workflow using AWS EC2, Docker, Nginx, and GitHub Actions CI/CD automation.

The backend application was containerized with Docker, deployed to an EC2 Ubuntu server, proxied through Nginx, and automated using GitHub Actions.

---

# Deployment Architecture

```txt
Developer Push
   ↓
GitHub Repository
   ↓
GitHub Actions Workflow
   ↓
SSH into AWS EC2
   ↓
Pull Latest Code
   ↓
Build Docker Image
   ↓
Remove Existing Container
   ↓
Start New Backend Container
   ↓
Nginx Reverse Proxy
   ↓
Health Check Validation
```

---

# Infrastructure Stack

* Cloud Provider

  * AWS EC2

* Operating System

  * Ubuntu Linux

* Containerization

  * Docker

* Reverse Proxy

  * Nginx

* CI/CD Platform

  * GitHub Actions

* Runtime

  * Node.js

---

# Backend Runtime Configuration

* Docker Image

  * `project2-backend`

* Docker Container

  * `project2-backend-container`

* Internal Backend Port

  * `5000`

* Public Access Port

  * `80`

---

# Docker Installation

## Install Docker

```bash
sudo apt update
sudo apt install docker.io -y
```

## Enable Docker

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

## Allow Ubuntu User to Run Docker

```bash
sudo usermod -aG docker ubuntu
```

---

# Nginx Installation

## Install Nginx

```bash
sudo apt install nginx -y
```

## Enable Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

# Dockerfile

```Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

---

# .dockerignore

```txt
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
```

---

# Nginx Reverse Proxy Configuration

File:

```txt
/etc/nginx/sites-available/default
```

Configuration:

```nginx
server {
    listen 80;

    server_name _;

    location / {
        proxy_pass http://localhost:5000;

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        proxy_set_header Host $host;

        proxy_cache_bypass $http_upgrade;
    }
}
```

---

# Docker Build and Run Commands

## Build Docker Image

```bash
docker build -t project2-backend .
```

## Run Backend Container

```bash
docker run -d \
  --name project2-backend-container \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  project2-backend
```

## Remove Existing Container

```bash
docker rm -f project2-backend-container || true
```

---

# Health Check Validation

## Internal Docker Health Check

```bash
curl http://localhost:5000/health
```

## Public Nginx Health Check

```bash
curl http://localhost/health
```

---

# GitHub Actions CI/CD Workflow

File:

```txt
.github/workflows/deploy.yml
```

Workflow:

```yaml
name: Deploy Backend to EC2

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1.0.3

        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}

          script: |
            cd /home/ubuntu/ai-log-summarizer-backend

            git pull origin main

            docker build -t project2-backend .

            docker rm -f project2-backend-container || true

            docker run -d --name project2-backend-container --restart unless-stopped -p 5000:5000 --env-file .env project2-backend

            sleep 5

            curl -f http://localhost:5000/health
```

---

# GitHub Secrets

* EC2 Host

  * `EC2_HOST`
  * Stores EC2 public IP address

* SSH Private Key

  * `EC2_SSH_KEY`
  * Stores PEM private key contents

---

# Security Best Practices

## .env File Protection

The `.env` file was excluded from GitHub using:

```txt
.env
node_modules
```

The `.env` file exists only on the EC2 server.

---

# Troubleshooting Notes

## Issue 1 — Missing OPENAI_API_KEY

### Problem

Docker container failed to start.

### Root Cause

`.env` file was not mounted into the container.

### Fix

```bash
--env-file .env
```

---

## Issue 2 — GitHub Actions Path Failure

### Problem

```txt
fatal: not a git repository
```

### Root Cause

The original project was copied using SCP and was not a real Git repository.

### Fix

Clone the GitHub repository directly onto EC2:

```bash
git clone <repo-url>
```

---

## Issue 3 — Health Check Failed Too Quickly

### Problem

```txt
curl: (56) Recv failure: Connection reset by peer
```

### Root Cause

The Node.js application had not fully started before the health check executed.

### Fix

Add:

```bash
sleep 5
```

before:

```bash
curl -f http://localhost:5000/health
```

---

# Lessons Learned

* CI/CD automates the same commands used during manual deployments.
* Docker containers simplify backend deployments.
* Nginx acts as a reverse proxy between public traffic and backend services.
* GitHub Actions can automate deployments to EC2 servers.
* Health checks validate successful deployments.
* Rebuilding infrastructure repeatedly improves troubleshooting confidence.
* Secrets should never be committed into GitHub repositories.

---

# Validation Results

The deployment was validated through:

* Successful Docker image build
* Running backend container
* Successful Nginx reverse proxy
* Successful GitHub Actions workflow
* Successful automated redeployment
* Browser-accessible `/health` endpoint
* Live version update confirmation through CI/CD

---

# Example Health Response

```json
{
  "success": true,
  "status": "healthy",
  "service": "ai-log-summarizer-api",
  "version": "1.0.1"
}
```
