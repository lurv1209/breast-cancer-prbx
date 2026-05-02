# Deployment Troubleshooting Guide

## Issue: "Failed to fetch" on Vercel with Render backend

### Root Causes:
1. **Environment variable not set** - Frontend doesn't know the backend URL
2. **Backend still spinning up** - Models are downloading/loading
3. **CORS issues** - Backend needs to allow Vercel domain
4. **Models not deployed** - Model files missing on Render

---

## Quick Fixes

### 1. **Set Environment Variable on Vercel** ✅ DONE
- Your `.env.production` file is ready with: `https://breast-cancer-prbx.onrender.com`
- **Next step**: Push to GitHub → Vercel will automatically redeploy

### 2. **Check Render Deployment Status**
Go to https://dashboard.render.com and:
- Click your service: `breast-cancer-backend`
- Check **Logs** tab for errors
- Look for model loading messages
- Should see: "✅ Application startup complete"

### 3. **Test Backend Health**
Try this URL in browser:
```
https://breast-cancer-prbx.onrender.com/health
```

Should return:
```json
{"status": "ok", "models": ["YOLOv8", "Multiclass YOLO"]}
```

### 4. **If Backend is "Spinning"**
This usually means models are downloading. On first startup:
- YOLOv8 downloads (~100MB+)
- Can take 2-5 minutes
- Render might timeout

**Solution**: Redeploy the service:
1. Go to Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"
3. Check logs for: "Application startup complete"

### 5. **Verify Model Files**
Models must be in `backend/models/`:
- ✅ `yolov8_breast.pt` - Binary classification
- ✅ `yolov8_multiclass.pt` - Multiclass classification
- ❌ `ssd_breast.pth` - (This should be deleted, already done)

---

## Step-by-Step Fix

### Step 1: Push Latest Code to GitHub
```bash
git add .
git commit -m "Fix: Add production env and startup logging"
git push
```

### Step 2: Vercel Auto-Deploys
- Vercel sees new commit
- Uses `.env.production` for `REACT_APP_API_BASE_URL`
- Redeploys frontend automatically

### Step 3: Check Render Logs
1. Go to Render dashboard
2. Select `breast-cancer-backend` service
3. Click **Logs**
4. Scroll to bottom - look for startup messages
5. If stuck, click **Manual Deploy**

### Step 4: Test the Connection
1. Open Vercel frontend: `https://breast-cancer-prbx.vercel.app`
2. Upload an image
3. Should connect to Render backend
4. Click "Run Analysis"

---

## Common Errors & Solutions

### ❌ "Failed to fetch"
- **Cause**: Frontend can't reach backend
- **Fix**: Check `.env.production` is set correctly on Vercel dashboard
- **Verify**: Check health endpoint works

### ❌ Render service says "Running" but logs show errors
- **Cause**: Model loading failed
- **Fix**: Check if models are in `backend/models/`
- **Solution**: Manual redeploy, watch logs

### ❌ "Connection refused"
- **Cause**: CORS issue or backend down
- **Fix**: CORS is already set to allow all origins (`"*"`)
- **Solution**: Check Render health endpoint

### ❌ Timeout on analysis
- **Cause**: Backend taking too long
- **Fix**: Already has 30-second timeout on frontend
- **Solution**: Can increase timeout or check backend logs

---

## Deployment Checklist

- [ ] `.env.production` file created with Render URL
- [ ] Code pushed to GitHub
- [ ] Vercel redeploy triggered
- [ ] Backend logs show "Application startup complete"
- [ ] Health check URL returns OK
- [ ] Frontend connects to backend
- [ ] Can upload and analyze images

---

## Debugging Steps

### Get Render Service URL:
```
Go to https://dashboard.render.com → select service → copy URL
```

### Check Frontend Logs:
```
1. Open Vercel app
2. Press F12 → Console tab
3. Check for fetch errors
```

### Check Backend Logs:
```
1. Render dashboard
2. Click service
3. Logs tab
4. Search for errors
```

### Manual Health Check:
```
curl https://breast-cancer-prbx.onrender.com/health
```

---

**Questions?** Check that:
1. Services are running (not sleeping)
2. Environment variables are set
3. Model files exist
4. CORS is properly configured (already done)