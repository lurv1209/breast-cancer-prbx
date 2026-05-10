# Breast Cancer Detection in Ultrasound Images

## About

This repository is a reproducible research prototype for breast ultrasound cancer detection.

It includes:
- a **React** frontend for uploading ultrasound images and selecting a model,
- a **FastAPI** backend that runs YOLO inference and returns predictions,
- a visualization endpoint that returns the uploaded image with bounding boxes and label text.

The platform currently supports the following model modes:
- `YOLOv8`
- `Multiclass YOLO`

If you have your own trained YOLO weights, place them in `backend/models/` and update the backend model filenames accordingly.

## Reproducibility and replication

To reproduce this platform, follow these steps from the repository root.

### 1. Install Python dependencies

It is recommended to use a virtual environment.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 2. Install frontend dependencies

```powershell
cd ..\frontend
npm install
```

### 3. Configure frontend API URL (optional)

The frontend defaults to `http://localhost:8000`.
If you need to override it, create `frontend/.env.local` with:

```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

### 4. Start the backend server

Open a terminal and run:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app:app --reload --port 8000
```

### 5. Start the frontend server

Open a second terminal and run:

```powershell
cd frontend
npm start
```

### 6. Open the application

- Frontend interface: <http://localhost:3000>
- Backend API docs: <http://localhost:8000/docs>
- Health check endpoint: <http://localhost:8000/health>

## How the platform works

- The frontend uploads an image file and a selected model name to the backend.
- The backend loads the corresponding YOLO model from `backend/models/` and performs inference.
- The `/predict` endpoint returns a JSON payload with:
  - `result` (classification label),
  - `confidence` (percentage),
  - `model` (selected model name),
  - `inference_ms`.
- The `/predict/visualize` endpoint returns a PNG image with bounding boxes and label text drawn directly on the image.

## Current implementation details

- Backend: `backend/app.py`
- Frontend: `frontend/src/components/ImageUpload.js`
- Supported models are defined in `backend/app.py` as `YOLOv8` and `Multiclass YOLO`.
- The frontend supports model selection via a dropdown and sends the selected value in form data.
- When a user uploads an image, the card view can open the original or annotated image. The table view includes an eye icon to open the full result overlay.

## Model files

Place your trained YOLO model weights in `backend/models/`.
The current backend expects:
- `yolov8_breast.pt` for the binary YOLOv8 model
- `yolov8_multiclass.pt` for the multiclass YOLO model

If you have alternate filenames, update `backend/app.py` in the `_load_model` method.

## Test images

Sample ultrasound images can be placed in the `test_images/` directory.
These will be served by the backend and accessible via the frontend's "Show Sample Images" section.
Supported formats: PNG, JPG, JPEG, GIF, BMP.

The frontend will display thumbnails of available test images, allowing users to load them for testing without uploading their own files.

## Notes for dissertation reproducibility

- Include the full repository on GitHub with this README and the `backend/models/` filenames.
- Document the exact Python and Node versions used.
- Provide any trained model weights or links to them if they cannot be included directly.
- Point reviewers to `backend/app.py` for backend inference flow and `frontend/src/components/ImageUpload.js` for UI behavior.

## Troubleshooting

- If the backend fails to start because the module cannot be found, ensure you are in the `backend` folder and that the virtual environment is activated.
- If `npm` is not recognized, make sure Node.js is installed and available in your terminal.
- If uploads succeed but no annotated image appears, confirm the backend can load the model file from `backend/models/`.
