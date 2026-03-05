import os
import io
import base64
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

# Try TFLite interpreters (compatible with Python 3.12+ in Vercel)
try:
    import ai_edge_litert.interpreter as tflite
except ImportError:
    try:
        import tflite_runtime.interpreter as tflite
    except ImportError:
        try:
            import tensorflow.lite as tflite
        except ImportError:
            # Fallback for local testing if no libs installed yet
            tflite = None

app = Flask(__name__)
CORS(app)

# ─── Model Configuration ─────────────────────────────────────────────
# In Vercel, the root of the project is usually the current working directory
# but we can also use absolute paths relative to the file.
MODEL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(MODEL_DIR, "model.tflite")
IMG_SIZE = (224, 224)

# ─── Load Model ──────────────────────────────────────────────────────
interpreter = None

def get_interpreter():
    global interpreter
    if interpreter is None:
        if tflite is None:
            raise ImportError("No TFLite runtime found. Please check requirements.txt")
        if not os.path.exists(MODEL_PATH):
            # Try alternative path for Vercel /var/task
            alt_path = os.path.join('/var/task', 'model.tflite')
            if os.path.exists(alt_path):
                target_path = alt_path
            else:
                raise FileNotFoundError(f"Model file not found at {MODEL_PATH} or {alt_path}")
        else:
            target_path = MODEL_PATH
            
        print(f"Loading TFLite model from: {target_path}")
        interpreter = tflite.Interpreter(model_path=target_path)
        interpreter.allocate_tensors()
    return interpreter

def preprocess_image(image_data: str) -> np.ndarray:
    """
    Decode base64 image, resize to model input size, and normalize for MobileNetV2.
    Same logic as local model_server.py
    """
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    image_bytes = base64.b64decode(image_data)
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE, Image.Resampling.LANCZOS)
    img_array = np.array(img, dtype=np.float32)
    
    # Normalize to [-1, 1] for MobileNetV2
    img_array = (img_array / 127.5) - 1.0
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

def build_result(prediction: np.ndarray) -> dict:
    """
    Same logic as local model_server.py - Simplified Cataract/Normal output.
    """
    prediction = prediction[0]
    
    if len(prediction) == 1:
        cataract_prob = float(prediction[0])
        non_cataract_prob = 1.0 - cataract_prob
    else:
        cataract_prob = float(prediction[0])
        non_cataract_prob = float(prediction[1])
    
    confidence_score = cataract_prob
    confidence_pct = f"{confidence_score * 100:.1f}%"
    
    if confidence_score < 0.50:
        condition = "Normal (No Cataract)"
        severity = "Normal"
        description = "Mata Anda terlihat sehat dan normal. Tidak terdeteksi adanya tanda-tanda katarak berdasarkan analisis AI."
        recommendation = "Jaga kesehatan mata dengan pola makan sehat, gunakan kacamata anti-UV saat di luar ruangan, dan lakukan pemeriksaan rutin tahunan."
    else:
        condition = "Cataract Detected"
        severity = "Cataract"
        description = "Terdeteksi indikasi katarak pada mata Anda. Kekeruhan pada lensa mungkin mulai atau sudah mengganggu penglihatan."
        recommendation = "Sangat disarankan untuk berkonsultasi dengan dokter spesialis mata (Oftalmologis)."

    return {
        "condition": condition,
        "severity": severity,
        "confidence": confidence_pct,
        "confidence_level": severity, 
        "confidence_score": round(confidence_score, 4),
        "cataract_probability": round(cataract_prob, 4),
        "non_cataract_probability": round(non_cataract_prob, 4),
        "description": description,
        "recommendation": recommendation,
        "disclaimer": "DISCLAIMER: Analisis AI ini hanya untuk screening awal. Diagnosis pasti hanya dapat dilakukan oleh dokter mata profesional."
    }

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        interp = get_interpreter()
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400

        img_array = preprocess_image(data['image'])
        
        input_details = interp.get_input_details()
        output_details = interp.get_output_details()
        
        interp.set_tensor(input_details[0]['index'], img_array)
        interp.invoke()
        prediction = interp.get_tensor(output_details[0]['index'])
        
        result = build_result(prediction)
        return jsonify(result)

    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        return jsonify({"error": str(e)}), 500

# For Vercel Compatibility
def handler(request):
    return app(request)
