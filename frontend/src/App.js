import { useState } from "react";
import "./App.css";
import ImageUpload from "./components/ImageUpload";

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="5" />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        strokeLinecap="round"
      />
    </svg>
  );
}

function App() {
  const [dark, setDark] = useState(true);

  return (
    <div className={`app-shell ${dark ? "theme-dark" : "theme-light"}`}>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="header-eyebrow">kea523.024 · BEng CS with AI</span>
          <h1 className="header-title">
            Breast <span>Ultrasound</span>
            <br />
            Cancer Detection
          </h1>
          <p className="header-sub">
            Deep learning · YOLOv8 / SSD / Faster R-CNN · Grad-CAM
          </p>
          <div className="header-divider" />
        </div>

        <button
          className="theme-toggle"
          onClick={() => setDark((d) => !d)}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
          <span>{dark ? "Light" : "Dark"}</span>
        </button>
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
        This tool is a research prototype for BEng dissertation purposes only.
        Not a certified medical device. All predictions must be reviewed by a
        qualified radiologist.
      </div>
    </div>
  );
}

export default App;
