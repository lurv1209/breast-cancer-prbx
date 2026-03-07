import "./App.css";
import ImageUpload from "./components/ImageUpload";

function App() {
  return (
    <div className="app-shell">
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

      <ImageUpload />

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
        This tool is a research prototype developed for my dissertation purposes
        only. It is not a certified medical device and must not be used for
        clinical diagnosis.
      </div>
    </div>
  );
}

export default App;
