import "./App.css";
import ImageUpload from "./components/ImageUpload";

function App() {
  return (
    <div className="app-shell">
      {/* Header */}
      <header className="header">
        <span className="header-eyebrow">kea523.024 · BSc CS with AI</span>
        <h1 className="header-title">
          Breast <span>Ultrasound</span>
          <br />
          Cancer Detection
        </h1>
        <p className="header-sub">
          Deep learning · YOLOv8 / SSD / Faster R-CNN · Grad-CAM
        </p>
        <div className="header-divider" />
      </header>

      {/* Main card */}
      <div className="card">
        <div className="card-top-bar">
          <div className="dot dot-red" />
          <div className="dot dot-yellow" />
          <div className="dot dot-green" />
          <span className="card-top-label">Diagnostic Interface v0.1</span>
        </div>
        <div className="card-body">
          <ImageUpload />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="footer-note">
        <svg
          className="footer-note-icon"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
        </svg>
        This tool is a research prototype for BSc dissertation purposes only.
        Not a certified medical device. All predictions must be reviewed by a
        qualified radiologist.
      </div>
    </div>
  );
}

export default App;
