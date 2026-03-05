"""
Cataract Screening Model Server
Flask API that serves the TFLite-based cataract detection model.
Works with Python 3.13+ (no full TensorFlow dependency).
"""

import os
import io
import base64
import logging
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

# Try TFLite interpreters (compatible with Python 3.13)
try:
    import ai_edge_litert.interpreter as tflite
except ImportError:
    try:
        import tflite_runtime.interpreter as tflite
    except ImportError:
        raise ImportError(
            "No TFLite runtime found. Install one of:\n"
            "  pip install ai-edge-litert\n"
            "  pip install tflite-runtime"
        )

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Model Configuration ─────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.tflite")
IMG_SIZE = (224, 224)

# ─── Load Model ──────────────────────────────────────────────────────
interpreter = None

def get_interpreter():
    global interpreter
    if interpreter is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        logger.info(f"Loading TFLite model from: {MODEL_PATH}")
        interpreter = tflite.Interpreter(model_path=MODEL_PATH)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        logger.info(f"✅ Model loaded! Input shape: {input_details[0]['shape']}, Output shape: {output_details[0]['shape']}")
    return interpreter


def preprocess_image(image_data: str) -> np.ndarray:
    """
    Decode base64 image, resize to model input size, and normalize for MobileNetV2.
    """
    # Remove data URI prefix if present
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    # Decode base64 to bytes
    image_bytes = base64.b64decode(image_data)
    
    # Open image and convert to RGB
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # Resize to model input size
    img = img.resize(IMG_SIZE, Image.Resampling.LANCZOS)
    
    # Convert to numpy array
    img_array = np.array(img, dtype=np.float32)
    
    # Normalize to [-1, 1] for MobileNetV2
    img_array = (img_array / 127.5) - 1.0
    
    # Add batch dimension: (1, 224, 224, 3)
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array


def build_result(prediction: np.ndarray) -> dict:
    """
    Convert model prediction to structured result with severity levels.
    """
    prediction = prediction[0]  # Remove batch dimension
    
    if len(prediction) == 1:
        # Sigmoid output: single value 0-1
        cataract_prob = float(prediction[0])
        non_cataract_prob = 1.0 - cataract_prob
    else:
        # Softmax output: [cataract_prob, non_cataract_prob]
        cataract_prob = float(prediction[0])
        non_cataract_prob = float(prediction[1])
    
    confidence_score = cataract_prob
    confidence_pct = f"{confidence_score * 100:.1f}%"
    
    # Determine Confidence and Basic Recommendations
    if confidence_score < 0.50:
        condition = "Normal (No Cataract)"
        severity = "Normal"
        description = (
            "Mata Anda terlihat sehat dan normal. Tidak terdeteksi adanya tanda-tanda katarak "
            "berdasarkan analisis AI."
        )
        recommendation = (
            "Jaga kesehatan mata dengan pola makan sehat, gunakan kacamata anti-UV "
            "saat di luar ruangan, dan lakukan pemeriksaan rutin tahunan."
        )
    else:
        condition = "Cataract Detected"
        severity = "Cataract"
        description = (
            "Terdeteksi indikasi katarak pada mata Anda. Kekeruhan pada lensa "
            "mungkin mulai atau sudah mengganggu penglihatan."
        )
        recommendation = (
            "Sangat disarankan untuk berkonsultasi dengan dokter spesialis mata (Oftalmologis). "
            "Dokter akan mengevaluasi kondisi Anda dan menentukan penanganan yang tepat, "
            "termasuk kemungkinan tindakan operasi."
        )

    # UI expects 'condition' to determine color/icon.
    if confidence_score > 0.5:
        final_condition = "Cataract Detected"
    else:
        final_condition = "Normal (No Cataract)"

    return {
        "condition": final_condition,
        "severity": severity,
        "confidence": confidence_pct,
        "confidence_level": severity, 
        "confidence_score": round(confidence_score, 4),
        "cataract_probability": round(cataract_prob, 4),
        "non_cataract_probability": round(non_cataract_prob, 4),
        "description": description,
        "recommendation": recommendation,
        "disclaimer": (
            "DISCLAIMER: Analisis AI ini hanya untuk screening awal. "
            "Hasil bervariasi tergantung kualitas cahaya dan kamera. "
            "Diagnosis pasti hanya dapat dilakukan oleh dokter mata profesional."
        )
    }


@app.route("/health", methods=["GET"])
def health_check():
    try:
        get_interpreter()
        status = "healthy"
    except Exception:
        status = "unhealthy"
    return jsonify({
        "status": status,
        "model": "MobileNetV2 (TFLite)",
        "version": "v2.0"
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        interp = get_interpreter()
    except Exception as e:
        return jsonify({"error": f"Model not loaded: {str(e)}"}), 503
    
    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "No image data"}), 400
    
    try:
        img_array = preprocess_image(data["image"])
        
        input_details = interp.get_input_details()
        output_details = interp.get_output_details()
        
        interp.set_tensor(input_details[0]['index'], img_array)
        interp.invoke()
        prediction = interp.get_tensor(output_details[0]['index'])
        
        result = build_result(prediction)
        logger.info(f"Prediction: {result['condition']} - Score: {result['confidence']}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("MODEL_PORT", 5001))
    logger.info(f"Starting TFLite Model Server on port {port}")
    app.run(host="0.0.0.0", port=port)
