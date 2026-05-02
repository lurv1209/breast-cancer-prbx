# Breast Cancer Detection App - Deployment Guide

## Overview
This app consists of:
- **Frontend**: React app deployed on Vercel
- **Backend**: FastAPI app deployed on Render

## Backend Deployment (Render)

### 1. Create a new Render Web Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `breast-cancer-backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`

### 2. Environment Variables
Set these in Render dashboard:
- `PYTHON_VERSION`: `3.11`

### 3. Deploy
Click "Create Web Service" - Render will build and deploy automatically.

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