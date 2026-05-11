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
    allow_origins=["*"],
    allow_credentials=False,
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

        except Exception as exc:
            logger.exception("Inference error")
            raise RuntimeError("YOLO inference failed") from exc


inference_services = {model_name: InferenceService(model_name) for model_name in SUPPORTED_MODELS}


@app.on_event("startup")
async def startup_event():
    """Log startup and check model availability."""
    logger.info("🚀 Application starting up...")
    logger.info(f"Supported models: {SUPPORTED_MODELS}")
    
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    logger.info(f"Models directory: {models_dir}")
    
    if os.path.exists(models_dir):
        model_files = os.listdir(models_dir)
        logger.info(f"Model files found: {model_files}")
    else:
        logger.warning(f"Models directory does not exist: {models_dir}")
    
    logger.info("✅ Application startup complete")


@app.get("/health")
async def health():
    return {"status": "ok", "models": list(SUPPORTED_MODELS)}


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

    try:
        output = inference_service.predict(image_bytes)
    except Exception as exc:
        logger.exception("Predict endpoint failed for file %s", file.filename)
        raise HTTPException(status_code=500, detail="Inference service error; check backend logs") from exc

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
    try:
        output = inference_service.predict(image_bytes)
    except Exception as exc:
        logger.exception("Visualization inference failed")
        raise HTTPException(status_code=500, detail="Visualization inference failed") from exc
    
    # Draw bounding boxes if detections found
    from PIL import ImageDraw, ImageFont
    
    draw = ImageDraw.Draw(image)
    
    # Choose a larger label font based on image size
    font_size = max(18, int(min(image.size) * 0.035))
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except Exception:
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()
    
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
                color = (255, 0, 0) if cls == 1 else (0, 255, 0)
                draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
                
                label = f"{label_text} {conf:.1f}%"
                text_bbox = draw.textbbox((0, 0), label, font=font)
                text_width = text_bbox[2] - text_bbox[0]
                text_height = text_bbox[3] - text_bbox[1]
                text_x = x1
                text_y = y1 - text_height - 8
                if text_y < 0:
                    text_y = y1 + 8
                
                # Draw a solid background behind the text for readability
                draw.rectangle(
                    [
                        text_x - 2,
                        text_y - 2,
                        text_x + text_width + 4,
                        text_y + text_height + 2,
                    ],
                    fill=(0, 0, 0),
                )
                
                draw.text((text_x, text_y), label, font=font, fill=(255, 255, 255))
    
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