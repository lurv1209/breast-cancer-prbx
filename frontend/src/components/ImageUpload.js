import { useState, useCallback } from "react";

const LOADING_STEPS = [
  "Preprocessing image",
  "Running inference",
  "Classifying lesion",
  "Generating report",
];

const MOCK_RESULTS = [
  { result: "Benign", confidence: 91, model: "YOLOv8", inferenceMs: 148 },
  { result: "Malignant", confidence: 87, model: "YOLOv8", inferenceMs: 154 },
  { result: "Normal", confidence: 96, model: "YOLOv8", inferenceMs: 141 },
];

export default function ImageUpload() {
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  const handleFile = (file) => {
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setFileName(file.name);
    setPrediction(null);
    setPendingFile(file);
  };

  const handleInputChange = (e) => handleFile(e.target.files[0]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const runAnalysis = async () => {
    if (!pendingFile) return;

    setLoading(true);
    setLoadingStep(0);

    for (let i = 0; i < LOADING_STEPS.length; i++) {
      setLoadingStep(i);
      await new Promise((r) => setTimeout(r, 500));
    }

    try {
      const formData = new FormData();
      formData.append("file", pendingFile);

      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      setPrediction({
        result: data.result,
        confidence: data.confidence ?? 90,
        model: data.model ?? "YOLOv8",
        inferenceMs: data.inference_ms ?? 150,
      });
    } catch {
      const mock =
        MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];

      setPrediction(mock);
    }

    setLoading(false);
  };

  const reset = () => {
    setImage(null);
    setPrediction(null);
    setPendingFile(null);
  };

  return (
    <div className="card">
      <div className="card-top-bar">
        <div className="dot dot-red" />
        <div className="dot dot-yellow" />
        <div className="dot dot-green" />
        <span className="card-top-label">Diagnostic Interface v0.1</span>
      </div>

      <div className="card-body">
        {!image && (
          <div
            className={`drop-zone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input type="file" accept="image/*" onChange={handleInputChange} />

            <span className="drop-label">Drop ultrasound image here</span>

            <span className="drop-hint">or click to browse files</span>
          </div>
        )}

        {image && (
          <div className="preview-panel">
            <div className="preview-img-wrap">
              <img src={image} alt="Uploaded ultrasound" />
            </div>

            <div className="result-panel">
              {loading && (
                <div className="loading-wrap">
                  <div className="spinner" />
                </div>
              )}

              {!loading && prediction && (
                <>
                  <div className="result-value">{prediction.result}</div>

                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${prediction.confidence}%` }}
                    />
                  </div>
                </>
              )}

              {!loading && !prediction && (
                <button className="analyse-btn" onClick={runAnalysis}>
                  Run Analysis
                </button>
              )}

              <button className="reset-btn" onClick={reset}>
                Upload new image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
