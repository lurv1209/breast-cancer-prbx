import "./App.css";
import ImageUpload from "./components/ImageUpload";

function App() {
  return (
    <div className="App">
      <h1>Breast Cancer Detection</h1>
      <p>Upload an ultrasound image to analyse.</p>

      <ImageUpload />
    </div>
  );
}

export default App;
