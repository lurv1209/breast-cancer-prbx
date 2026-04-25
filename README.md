# Breast Cancer Detection in Ultrasound Images

## Quick Start

From project root (`breast-cancer-prbx`), run once for setup:

```powershell
cd backend
python -m pip install -r requirements.txt
cd ..\frontend
& "C:\Program Files\nodejs\npm.cmd" install
```

Then, each time you want to run the app, open two terminals:

```powershell
# Terminal 1 (backend)
cd C:\Users\Lurvish\Documents\GitHub\breast-cancer-prbx\backend
python -m uvicorn app:app --reload --port 8000

# Terminal 2 (frontend)
cd C:\Users\Lurvish\Documents\GitHub\breast-cancer-prbx\frontend
npm start
```

Open:
- Frontend: <http://localhost:3000>
- Backend docs: <http://localhost:8000/docs>

## Overview

Deep learning system for detecting and classifying breast tumours from ultrasound images.

## Models

- YOLOv8
- SSD
- Faster R-CNN

## Features

- Image upload web interface
- Real-time prediction
- Grad-CAM explainability

## Tech Stack

- PyTorch
- FastAPI
- React

## Demo

Coming soon

## Local Setup (Windows / PowerShell)

### One-time setup

From the project root:

#### Backend dependencies

```powershell
cd backend
python -m pip install -r requirements.txt
```

#### Frontend dependencies

```powershell
cd ..\frontend
& "C:\Program Files\nodejs\npm.cmd" install
```

If PowerShell execution policy is already configured for npm scripts, you can use:

```powershell
npm install
```

### Run the project (next time and daily workflow)

Open two terminals.

#### Terminal 1: Backend

```powershell
cd C:\Users\Lurvish\Documents\GitHub\breast-cancer-prbx\backend
python -m uvicorn app:app --reload --port 8000
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

#### Terminal 2: Frontend

```powershell
cd C:\Users\Lurvish\Documents\GitHub\breast-cancer-prbx\frontend
& "C:\Program Files\nodejs\npm.cmd" start
```

If npm is available directly in your terminal:

```powershell
npm start
```

### App URLs

- Frontend: <http://localhost:3000>
- Backend docs: <http://localhost:8000/docs>
- Backend health: <http://localhost:8000/health>

### Model selection in UI

- Use the model dropdown in the frontend before running analysis.
- Current supported models:
  - `YOLOv8`
  - `SSD`
  - `FasterRCNN`
- The frontend sends the selected model to `POST /predict` as a form field named `model`.
- If an unsupported model is sent, backend returns `400` with supported options.
- Note: current backend inference is scaffold/stub logic until trained model weights are wired in.

### Frontend environment config

Make sure `frontend/.env.local` exists with:

```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

If you create or update this file, restart the frontend dev server.

### Troubleshooting

- `Error loading ASGI app. Could not import module "app"`:
  - Start backend from the `backend` folder, or run `python -m uvicorn backend.app:app --reload --port 8000` from root.
- `npm` not recognized:
  - Open a new terminal, or use `& "C:\Program Files\nodejs\npm.cmd" ...`.
- `npm.ps1 cannot be loaded because running scripts is disabled`:
  - Use `npm.cmd` as above, or set PowerShell execution policy for your user.
- Upload works but predictions are generic:
  - Backend currently uses scaffold inference until trained model loading/inference is wired in `backend/app.py`.
