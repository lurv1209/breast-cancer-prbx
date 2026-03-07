import { useState } from "react";

function ImageUpload() {
  const [image, setImage] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    setImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://localhost:8000/predict", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setPrediction(data.result);
  };

  return (
    <div>
      <h2>Breast Cancer Detection</h2>

      <input type="file" onChange={handleUpload} />

      {image && <img src={image} width="300" alt="uploaded" />}

      {prediction && <h3>Prediction: {prediction}</h3>}
    </div>
  );
}

export default ImageUpload;
