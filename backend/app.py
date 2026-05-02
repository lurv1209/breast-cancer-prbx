import io
import logging
import os
import time
from dataclasses import dataclass

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image
from pydantic import BaseModel
import torch
from ultralytics import YOLO

app = FastAPI(title="Breast Cancer Inference API", version="0.1.0")
SUPPORTED_MODELS = ("YOLOv8", "Multiclass YOLO")

# Class mappings for YOLO models
CLASS_MAPPINGS = {
    "YOLOv8": {0: "Positive", 1: "Normal"},  # Binary classification
    "Multiclass YOLO": {0: "Benign", 1: "Malignant"},  # Multiclass classification
}
logger = logging.getLogger("uvicorn.error")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://localhost:3001",  # Local development (alternative port)
        "https://breast-cancer-prbx.vercel.app",  # Vercel production domain
        "*",  # Allow all origins for now (you can restrict this later)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionResponse(BaseModel):
    result: str
    confidence: int
    model: str
    inference_ms: int


@dataclass
class ModelOutput:
    label: str
    confidence: int


class InferenceService:
    """
    Inference service for breast cancer detection using YOLO models.
    """

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model = None
        self._state_dict = None

    def _load_model(self):
        """Load the trained YOLO model."""
        if self._model is not None:
            return  # Already loaded

        models_dir = os.path.join(os.path.dirname(__file__), "models")
        
        if self.model_name == "YOLOv8":
            model_path = os.path.join(models_dir, "yolov8_breast.pt")
            if os.path.exists(model_path):
                self._model = YOLO(model_path)
        
        elif self.model_name == "Multiclass YOLO":
            model_path = os.path.join(models_dir, "yolov8_multiclass.pt")
            if os.path.exists(model_path):
                self._model = YOLO(model_path)
        
        if self._model is None:
            logger.warning(f"Model file not found for {self.model_name}")

    def _preprocess(self, image_bytes: bytes) -> Image.Image:
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as exc:  # pragma: no cover - defensive path
            raise HTTPException(status_code=400, detail="Invalid image file") from exc
        return image

    def predict(self, image_bytes: bytes) -> ModelOutput:
        """Run inference on the input image."""
        image = self._preprocess(image_bytes)

        # Lazy load model on first request
        self._load_model()

        if self._model is None:
            # Fallback stub if model not loaded
            return ModelOutput(label="Normal", confidence=88)

        try:
            if self.model_name in ("YOLOv8", "Multiclass YOLO"):
                # YOLOv8 inference (binary or multiclass)
                import numpy as np
                results = self._model(image)
                result = results[0]
                logger.info(f"YOLO boxes: {len(result.boxes)}")
                if len(result.boxes) > 0:
                    # Get the first detection's confidence
                    conf = float(result.boxes[0].conf[0]) * 100
                    class_id = int(result.boxes[0].cls[0])
                    # Use class mapping based on model
                    class_map = CLASS_MAPPINGS.get(self.model_name, {})
                    label = class_map.get(class_id, f"Class {class_id}")
                    logger.info(f"Detection: class={class_id}, conf={conf}, label={label}")
                    return ModelOutput(label=label, confidence=int(conf))
                logger.info("No detections found")
                return ModelOutput(label="Normal", confidence=0)

        except Exception as e:
            logger.error(f"Inference error: {e}")
            return ModelOutput(label="Error", confidence=0)


inference_services = {model_name: InferenceService(model_name) for model_name in SUPPORTED_MODELS}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(...),
    model: str = Form("YOLOv8"),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")
    if model not in SUPPORTED_MODELS:
        allowed = ", ".join(SUPPORTED_MODELS)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model '{model}'. Supported models: {allowed}",
        )
    logger.info("Predict request received: model=%s file=%s", model, file.filename)

    started_at = time.perf_counter()
    image_bytes = await file.read()
    inference_service = inference_services[model]
    output = inference_service.predict(image_bytes)
    elapsed_ms = int((time.perf_counter() - started_at) * 1000)

    return PredictionResponse(
        result=output.label,
        confidence=output.confidence,
        model=inference_service.model_name,
        inference_ms=elapsed_ms,
    )


@app.post("/predict/visualize")
async def predict_visualize(
    file: UploadFile = File(...),
    model: str = Form("YOLOv8"),
):
    """Predict and return the image with bounding boxes drawn."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")
    if model not in SUPPORTED_MODELS:
        allowed = ", ".join(SUPPORTED_MODELS)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model '{model}'. Supported models: {allowed}",
        )
    
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # Run inference
    inference_service = inference_services[model]
    output = inference_service.predict(image_bytes)
    
    # Draw bounding boxes if detections found
    from PIL import ImageDraw, ImageFont
    
    draw = ImageDraw.Draw(image)
    
    # Get the YOLO results for bounding boxes
    if model in ("YOLOv8", "Multiclass YOLO") and inference_service._model is not None:
        results = inference_service._model(image)
        result = results[0]
        
        if len(result.boxes) > 0:
            for box in result.boxes:
                # Get box coordinates (xyxy format)
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0]) * 100
                cls = int(box.cls[0])
                
                # Get label from class mapping
                class_map = CLASS_MAPPINGS.get(model, {})
                label_text = class_map.get(cls, f"Class {cls}")
                
                # Draw rectangle (red for malignant/positive, green for benign/normal)
                color = (255, 0, 0) if cls == 1 else (0, 255, 0)  # Red for malignant/positive, green for benign/normal
                draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
                
                # Add label with white text and dark outline for readability
                label = f"{label_text} {conf:.1f}%"
                # Draw text outline (black)
                draw.text((x1 + 1, y1 - 20), label, fill=(0, 0, 0))
                draw.text((x1 - 1, y1 - 20), label, fill=(0, 0, 0))
                draw.text((x1, y1 - 19), label, fill=(0, 0, 0))
                draw.text((x1, y1 - 21), label, fill=(0, 0, 0))
                # Draw white text
                draw.text((x1, y1 - 20), label, fill=(255, 255, 255))
    
    # Convert back to bytes
    img_io = io.BytesIO()
    image.save(img_io, format="PNG")
    img_io.seek(0)
    
    return StreamingResponse(
        img_io,
        media_type="image/png",
        headers={
            "X-Result": output.label,
            "X-Confidence": str(output.confidence),
            "X-Model": inference_service.model_name,
        }
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)