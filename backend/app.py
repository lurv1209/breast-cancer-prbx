from fastapi import FastAPI, UploadFile
import random

app = FastAPI()

@app.post("/predict")
async def predict(file: UploadFile):

    prediction = random.choice([
        "Benign",
        "Malignant",
        "Normal"
    ])

    confidence = round(random.uniform(0.7,0.99),2)

    return {
        "result": prediction,
        "confidence": confidence
    }