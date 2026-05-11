# Breast Cancer Detection App - Deployment Guide

## Overview
This app consists of:
- **Frontend**: React app deployed on Vercel
- **Backend**: FastAPI app deployed on Render (with Docker optimization)

## Backend Deployment (Render with Docker)

### 1. Prerequisites
- GitHub repository connected to Render
- Docker support enabled on Render

### 2. Create a new Render Web Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `breast-cancer-backend`
   - **Runtime**: `Docker`
   - **Build Command**: Leave empty (Dockerfile handles it)
   - **Start Command**: Leave empty (Dockerfile handles it)
   - **Docker Path**: `./backend/Dockerfile`

### 3. Environment Variables
Set these in Render dashboard:
- `PYTHON_VERSION`: `3.11`

### 4. Deploy
Click "Create Web Service" - Render will build the Docker image and deploy automatically.

## What's Optimized

### Docker Setup
- **Multi-stage builds** reduce image size
- **Slim Python 3.11 base image** (smaller than default)
- **System-level dependencies** installed in one layer
- **Health checks** built in
- **Build cache** for faster redeploys
- **.dockerignore** excludes unnecessary files

### Requirements
- **Pinned versions** for reproducibility and faster installs
- **Optimized dependencies** reduce build time

### Why Docker on Render is Better
1. **Faster builds** - Docker caching speeds up redeploys
2. **Smaller footprint** - Slim image uses less disk space
3. **Predictable environment** - Exact same setup locally and on Render
4. **Better cold starts** - Pre-built image avoids runtime package installs
5. **Easier debugging** - Same Dockerfile runs everywhere

## Frontend Deployment (Vercel)

### 1. Your frontend is already connected to Vercel
Since you mentioned it's already uploaded via GitHub repo.

### 2. Set Environment Variable
In Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - **Name**: `REACT_APP_API_BASE_URL`
   - **Value**: `https://your-render-service-name.onrender.com`
   - **Environment**: `Production`

### 3. Redeploy
Push to main branch or trigger redeploy in Vercel dashboard.

## Post-Deployment Steps

### 1. Update CORS (if needed)
Once you have the Render URL, update the `allow_origins` in `backend/app.py`:
```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    "https://breast-cancer-prbx.onrender.com",
],
```

### 2. Test the deployment
- Frontend: `https://breast-cancer-prbx.vercel.app/`
- Backend health check: `hhttps://breast-cancer-prbx.onrender.com/health`

## Troubleshooting

### Backend Issues:
- Check Render logs for build/startup errors
- Ensure model files are included in deployment
- Verify PORT environment variable usage

### Frontend Issues:
- Check browser console for CORS errors
- Verify REACT_APP_API_BASE_URL is set correctly
- Ensure API calls use HTTPS in production

### Model Loading:
- YOLO models are loaded on first request (lazy loading)
- Check Render logs for model loading messages