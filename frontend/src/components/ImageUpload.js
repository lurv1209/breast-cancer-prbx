import { useState, useCallback } from "react";

const LOADING_STEPS = [
  "Preprocessing image",
  "Running inference",
  "Classifying lesion",
  "Generating report",
];
const MODEL_OPTIONS = ["YOLOv8", "Multiclass YOLO"];

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

async function analyseFile(file, model) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for slow CPU inference

  try {
    console.log(`🚀 Starting analysis for ${file.name} with model ${model}`);
    console.log(`📡 API URL: ${API_BASE_URL}/predict`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`✅ Response received: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let detail = "";
      try {
        const errData = await response.json();
        detail = errData?.detail ? ` - ${errData.detail}` : "";
        console.error(`❌ Server error response:`, errData);
      } catch {
        detail = "";
      }
      throw new Error(`Server error: ${response.status}${detail}`);
    }

    const data = await response.json();
    console.log(`📊 Analysis complete:`, data);

    return {
      result: data.result,
      confidence: data.confidence ?? 88,
      model: data.model ?? "YOLOv8",
      inferenceMs: data.inference_ms ?? 149,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`💥 Analysis failed:`, error);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out - please check if the backend server is running');
    }
    throw error;
  }
}

async function getAnnotatedImage(file, model) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for slow CPU inference

  try {
    console.log(`🎨 Getting annotated image for ${file.name} with model ${model}`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model);
    const response = await fetch(`${API_BASE_URL}/predict/visualize`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log(`✅ Annotated image response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error("Failed to get annotated image");
    }
    const blob = await response.blob();
    console.log(`🖼️ Annotated image loaded, size: ${blob.size} bytes`);

    return URL.createObjectURL(blob);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`💥 Annotated image failed:`, error);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out while getting annotated image');
    }
    throw error;
  }
}

function ResultCard({ item, index, viewMode, onImageClick }) {
  const resultClass = item.prediction
    ? item.prediction.result.toLowerCase()
    : "";
  const confidenceFillClass =
    item.prediction?.confidence >= 85
      ? ""
      : item.prediction?.confidence >= 65
        ? "low"
        : "danger";

  // Use annotated image if viewMode is "annotated" and available
  const imageUrl = viewMode === "annotated" && item.annotatedUrl
    ? item.annotatedUrl
    : item.previewUrl;

  return (
    <div className={`result-card status-${item.status}`}>
      <div className="result-card-img-wrap">
        <img 
          src={imageUrl} 
          alt={`Scan ${index + 1}`} 
          onClick={() => onImageClick && onImageClick(item, viewMode === "annotated" ? "annotated" : "original")}
          style={{ cursor: "pointer" }}
        />
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
            <div className="loading-timer">
              ⏱️ Elapsed: {item.elapsedTime || 0}s (This may take 30-60 seconds)
            </div>
            <div className="loading-progress-bar">
              <div 
                className="loading-progress-fill"
                style={{ 
                  width: `${Math.min((item.elapsedTime || 0) / 60 * 100, 95)}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
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
  const [viewMode, setViewMode] = useState("original"); // "original" | "annotated" | "table"
  const [lightbox, setLightbox] = useState(null); // { item, imageType } | null

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
      elapsedTime: 0,
      startTime: null,
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

    try {
      const pending = items.filter((i) => i.status === "pending");

      for (const item of pending) {
        const startTime = Date.now();
        
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "loading", loadingStep: 0, startTime } : i,
          ),
        );

        // Update elapsed time every second during loading
        const timerInterval = setInterval(() => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id && i.status === "loading"
                ? { ...i, elapsedTime: Math.floor((Date.now() - startTime) / 1000) }
                : i,
            ),
          );
        }, 1000);

        try {
          console.log(`🔄 Processing ${item.file.name}...`);

          for (let step = 0; step < LOADING_STEPS.length; step++) {
            console.log(`📍 Step ${step + 1}/${LOADING_STEPS.length}: ${LOADING_STEPS[step]}`);
            setItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, loadingStep: step } : i)),
            );
            await new Promise((r) => setTimeout(r, 200 + Math.random() * 100)); // Faster steps
          }

          console.log(`🤖 Calling API for ${item.file.name}...`);
          const startTime = Date.now();
          try {
            const prediction = await analyseFile(item.file, selectedModel);
            const inferenceTime = Date.now() - startTime;
            console.log(`✅ Prediction received in ${inferenceTime}ms:`, prediction);
            
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
            console.log(`🎉 State updated for ${item.file.name}: status=done`);
          } catch (error) {
            console.log(`❌ Error for ${item.file.name}:`, error);
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
            console.log(`💥 State updated for ${item.file.name}: status=error`);
          }
        } finally {
          clearInterval(timerInterval);
        }
      }
    } finally {
      console.log("🏁 runAll function completed");
      setRunning(false);
    }
  };
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  const reset = () => setItems([]);
  const lightboxItem = lightbox?.item;

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

      {/* View toggle */}
      {doneCount > 0 && (
        <div className="summary-bar">
          <span className="summary-count">View</span>
          <div className="summary-actions">
            <button
              className={`view-btn ${viewMode === "original" ? "active" : ""}`}
              onClick={() => setViewMode("original")}
            >
              Original
            </button>
            <button
              className={`view-btn ${viewMode === "annotated" ? "active" : ""}`}
              onClick={() => setViewMode("annotated")}
            >
              With Bounding Box
            </button>
            <button
              className={`view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              Table View
            </button>
          </div>
        </div>
      )}

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
            {pendingCount > 0 && (
              <div className="performance-notice">
                ⚡ Analysis may take over 60 seconds per image on free hosting
              </div>
            )}
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
      {items.length > 0 && viewMode === "table" && (
        <div className="results-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Original</th>
                <th>With Bounding Box</th>
                <th>Result</th>
                <th>Confidence</th>
                <th>Model</th>
                <th>Inference (ms)</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(i => i.status === "done").map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <img 
                      src={item.previewUrl} 
                      alt="Original" 
                      className="table-thumb" 
                      onClick={() => setLightbox({ item, imageType: "original" })}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td>
                    {item.annotatedUrl ? (
                      <img 
                        src={item.annotatedUrl} 
                        alt="Annotated" 
                        className="table-thumb" 
                        onClick={() => setLightbox({ item, imageType: "annotated" })}
                        style={{ cursor: "pointer" }}
                      />
                    ) : (
                      <span className="no-image">N/A</span>
                    )}
                  </td>
                  <td className={`result-cell ${item.prediction?.result?.toLowerCase()}`}>
                    {item.prediction?.result}
                  </td>
                  <td>{item.prediction?.confidence}%</td>
                  <td>{item.prediction?.model}</td>
                  <td>{item.prediction?.inferenceMs}</td>
                  <td>
                    <button
                      className="icon-btn"
                      type="button"
                      title="View full result"
                      onClick={() => setLightbox({ item, imageType: "overview" })}
                    >
                      <EyeIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results grid */}
      {items.length > 0 && viewMode !== "table" && (
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
              <ResultCard item={item} index={index} viewMode={viewMode} onImageClick={(item, type) => setLightbox({ item, imageType: type })} />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox for enlarged image view */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>
              ✕
            </button>
            <div className="lightbox-header">
              <span className="lightbox-filename">{lightboxItem.file.name}</span>
              <span className="lightbox-label">
                {lightbox.imageType === "overview"
                  ? "Full Result"
                  : lightbox.imageType === "annotated"
                    ? "With Bounding Box"
                    : "Original"}
              </span>
              <span className="lightbox-model">
                Model: {lightboxItem.prediction?.model ?? "Unknown"}
              </span>
              {lightboxItem.prediction && (
                <span className={`lightbox-result ${lightboxItem.prediction.result.toLowerCase()}`}>
                  {lightboxItem.prediction.result} ({lightboxItem.prediction.confidence}%)
                </span>
              )}
            </div>
            {lightbox.imageType === "overview" ? (
              <div className="lightbox-grid">
                <div className="lightbox-panel">
                  <div className="lightbox-panel-label">Original</div>
                  <img src={lightboxItem.previewUrl} alt="Original view" />
                </div>
                {lightboxItem.annotatedUrl ? (
                  <div className="lightbox-panel">
                    <div className="lightbox-panel-label">With Bounding Box</div>
                    <img src={lightboxItem.annotatedUrl} alt="Annotated view" />
                  </div>
                ) : (
                  <div className="lightbox-panel no-annotated">
                    <div className="lightbox-panel-label">With Bounding Box</div>
                    <div className="no-image">Annotated image not available</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="lightbox-single">
                <img
                  src={lightbox.imageType === "annotated" && lightboxItem.annotatedUrl
                    ? lightboxItem.annotatedUrl
                    : lightboxItem.previewUrl}
                  alt={lightbox.imageType === "annotated" ? "Annotated view" : "Original view"}
                />
              </div>
            )}
            <div className="lightbox-footer">
              <span>Click outside or press ✕ to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ImageUpload;
