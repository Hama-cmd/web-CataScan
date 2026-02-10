import tensorflow as tf
import os

h5_model_path = 'best_model_mobilenetv2_katarak.h5'
tflite_model_path = 'model.tflite'

if os.path.exists(h5_model_path):
    print(f"Loading {h5_model_path}...")
    model = tf.keras.models.load_model(h5_model_path)
    
    print("Converting to TFLite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    
    print(f"Saving to {tflite_model_path}...")
    with open(tflite_model_path, 'wb') as f:
        f.write(tflite_model)
    
    print("Done! Model converted successfully.")
else:
    print(f"Error: {h5_model_path} not found.")
