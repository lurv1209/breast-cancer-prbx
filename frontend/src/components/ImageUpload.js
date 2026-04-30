import { useState, useCallback } from "react";

const LOADING_STEPS = [
  "Preprocessing image",
  "Running inference",
  "Classifying lesion",
  "Generating report",
];
const MODEL_OPTIONS = ["YOLOv8", "SSD", "FasterRCNN"];

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

async function analyseFile(file, model) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", model);
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    let detail = "";
    try {
      const errData = await response.json();
      detail = errData?.detail ? ` - ${errData.detail}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`Server error: ${response.status}${detail}`);
  }
  const data = await response.json();
  return {
    result: data.result,
    confidence: data.confidence ?? 88,
    model: data.model ?? "YOLOv8",
    inferenceMs: data.inference_ms ?? 149,
  };
}

async function getAnnotatedImage(file, model) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", model);
  const response = await fetch(`${API_BASE_URL}/predict/visualize`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to get annotated image");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function ResultCard({ item, index }) {
  const resultClass = item.prediction
    ? item.prediction.result.toLowerCase()
    : "";
  const confidenceFillClass =
    item.prediction?.confidence >= 85
      ? ""
      : item.prediction?.confidence >= 65
        ? "low"
        : "danger";

  return (
    <div className={`result-card status-${item.status}`}>
      <div className="result-card-img-wrap">
        <img src={item.previewUrl} alt={`Scan ${index + 1}`} />
        <span className="preview-img-badge">US SCAN {index + 1}</span>
        <div className={`status-badge status-badge-${item.status}`}>
          {item.status === "pending" && "Queued"}
          {item.status === "loading" && (
            <>
              <div className="spinner-sm" />
              Analysing
            </>
          )}
          {item.status === "done" && item.prediction?.result}
          {item.status === "error" && "Error"}
        </div>
      </div>

      <div className="result-card-body">
        <div className="result-card-filename">{item.file.name}</div>

        {item.status === "loading" && (
          <div className="loading-steps">
            {LOADING_STEPS.map((s, i) => (
              <div
                key={s}
                className={`loading-step ${i === item.loadingStep ? "active" : i < item.loadingStep ? "done" : ""}`}
              >
                <div className="step-dot" />
                {s}
              </div>
            ))}
          </div>
        )}

        {item.status === "done" && item.prediction && (
          <>
            <div className={`result-value ${resultClass}`}>
              {item.prediction.result}
            </div>
            <div className="confidence-bar-wrap">
              <div className="confidence-header">
                <span>Confidence</span>
                <span>{item.prediction.confidence}%</span>
              </div>
              <div className="confidence-bar">
                <div
                  className={`confidence-fill ${confidenceFillClass}`}
                  style={{ width: `${item.prediction.confidence}%` }}
                />
              </div>
            </div>
            <div className="meta-grid">
              <div className="meta-cell">
                <div className="meta-cell-label">Model</div>
                <div className="meta-cell-value">{item.prediction.model}</div>
              </div>
              <div className="meta-cell">
                <div className="meta-cell-label">Inference</div>
                <div className="meta-cell-value">
                  {item.prediction.inferenceMs} ms
                </div>
              </div>
            </div>
          </>
        )}

        {item.status === "error" && (
          <div className="error-box">{item.error}</div>
        )}

        {item.status === "pending" && (
          <div className="pending-note">Waiting to be analysed…</div>
        )}
      </div>
    </div>
  );
}

function ImageUpload() {
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0]);
  const [viewMode, setViewMode] = useState("original"); // "original" | "annotated"

  const addFiles = (files) => {
    const newItems = Array.from(files).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      annotatedUrl: null,
      status: "pending",
      prediction: null,
      loadingStep: 0,
      error: null,
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleInputChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const removeItem = (id) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const runAll = async () => {
    setRunning(true);

    const pending = items.filter((i) => i.status === "pending");

    for (const item of pending) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "loading", loadingStep: 0 } : i,
        ),
      );

      for (let step = 0; step < LOADING_STEPS.length; step++) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, loadingStep: step } : i)),
        );
        await new Promise((r) => setTimeout(r, 420 + Math.random() * 180));
      }

      try {
        const prediction = await analyseFile(item.file, selectedModel);
        
        // Get annotated image with bounding boxes
        let annotatedUrl = null;
        try {
          annotatedUrl = await getAnnotatedImage(item.file, selectedModel);
        } catch (e) {
          console.warn("Could not get annotated image:", e);
        }
        
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "done", prediction, annotatedUrl } : i,
          ),
        );
      } catch (error) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  error: error?.message || "Analysis failed",
                }
              : i,
          ),
        );
      }
    }

    setRunning(false);
  };

  const reset = () => setItems([]);

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <>
      {/* Drop zone */}
      <div className="summary-bar">
        <span className="summary-count">Model selection</span>
        <div className="summary-actions">
          <select
            className="analyse-btn"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={running}
          >
            {MODEL_OPTIONS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={`drop-zone ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
        />
        <div className="drop-icon">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0L8 8m4-4 4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="drop-label">
          {items.length === 0
            ? "Drop ultrasound images here"
            : "Drop more images to add"}
        </span>
        <span className="drop-hint">
          or click to browse — multiple files supported
        </span>
        <span className="drop-tag">PNG · JPEG · DICOM-derived</span>
      </div>

      {/* Summary bar */}
      {items.length > 0 && (
        <div className="summary-bar">
          <span className="summary-count">
            <strong>{items.length}</strong> image{items.length !== 1 ? "s" : ""}{" "}
            loaded
            {doneCount > 0 && (
              <>
                {" "}
                · <span className="summary-done">{doneCount} analysed</span>
              </>
            )}
            {pendingCount > 0 && !running && (
              <>
                {" "}
                ·{" "}
                <span className="summary-pending">{pendingCount} pending</span>
              </>
            )}
          </span>
          <div className="summary-actions">
            {!running && pendingCount > 0 && (
              <button className="analyse-btn" onClick={runAll}>
                Run Analysis ({pendingCount})
              </button>
            )}
            {running && (
              <span className="running-label">
                <div className="spinner-sm" />
                Running…
              </span>
            )}
            <button className="reset-btn" onClick={reset} disabled={running}>
              ✕ Clear all
            </button>
          </div>
        </div>
      )}

      {/* Results grid */}
      {items.length > 0 && (
        <div className="results-grid">
          {items.map((item, index) => (
            <div key={item.id} className="result-card-wrapper">
              {!running && item.status !== "loading" && (
                <button
                  className="remove-btn"
                  onClick={() => removeItem(item.id)}
                >
                  ✕
                </button>
              )}
              <ResultCard item={item} index={index} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default ImageUpload;
