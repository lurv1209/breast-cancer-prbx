import io
import logging
import time
from dataclasses import dataclass

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

app = FastAPI(title="Breast Cancer Inference API", version="0.1.0")
SUPPORTED_MODELS = ("YOLOv8", "SSD", "FasterRCNN")
logger = logging.getLogger("uvicorn.error")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    Scaffold inference service.
    Replace the stub in predict() with your real PyTorch model code.
    """

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model = self._load_model()

    def _load_model(self):
        # TODO: Load your trained model weights here once available.
        # Example:
        #   model = torch.load("models/breast_model.pt", map_location="cpu")
        #   model.eval()
        #   return model
        return None

    def _preprocess(self, image_bytes: bytes) -> Image.Image:
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as exc:  # pragma: no cover - defensive path
            raise HTTPException(status_code=400, detail="Invalid image file") from exc
        return image

    def predict(self, image_bytes: bytes) -> ModelOutput:
        _image = self._preprocess(image_bytes)

        # TODO: Replace this stub with real inference:
        # 1) preprocess to tensor
        # 2) model forward pass
        # 3) map output index -> class label
        # 4) convert probability to integer percentage
        return ModelOutput(label="Normal", confidence=88)


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