"""
Google Colab Neural Network Training and Inference Backend
This script should be run in Google Colab to train and serve a real neural network model.
"""

# Install required packages in Colab
!pip install flask flask-cors tensorflow pandas numpy scikit-learn
!pip install pyngrok

# Import necessary libraries
import tensorflow as tf
from tensorflow.keras import layers, Model, optimizers, losses
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import threading
import time
from pyngrok import ngrok

# Sample name dataset for gender classification
sample_names = [
    # Female names
    ('Sarah', 'Female'), ('Emma', 'Female'), ('Jessica', 'Female'), 
    ('Ashley', 'Female'), ('Amanda', 'Female'), ('Michelle', 'Female'),
    ('Lisa', 'Female'), ('Emily', 'Female'), ('Kimberly', 'Female'),
    ('Jennifer', 'Female'), ('Nicole', 'Female'), ('Elizabeth', 'Female'),
    ('Rebecca', 'Female'), ('Maria', 'Female'), ('Stephanie', 'Female'),
    ('Rachel', 'Female'), ('Catherine', 'Female'), ('Angela', 'Female'),
    ('Samantha', 'Female'), ('Katherine', 'Female'), ('Christina', 'Female'),
    
    # Male names
    ('Michael', 'Male'), ('David', 'Male'), ('Robert', 'Male'),
    ('William', 'Male'), ('Christopher', 'Male'), ('Matthew', 'Male'),
    ('Joshua', 'Male'), ('Andrew', 'Male'), ('Daniel', 'Male'),
    ('James', 'Male'), ('John', 'Male'), ('Ryan', 'Male'),
    ('Nicholas', 'Male'), ('Alexander', 'Male'), ('Jonathan', 'Male'),
    ('Tyler', 'Male'), ('Brandon', 'Male'), ('Anthony', 'Male'),
    ('Steven', 'Male'), ('Thomas', 'Male'), ('Kevin', 'Male')
]

class GenderClassificationModel:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.label_encoder = None
        self.max_length = 20
        self.training_history = None
        
    def prepare_data(self, names_data):
        """Prepare and preprocess the data"""
        df = pd.DataFrame(names_data, columns=['name', 'gender'])
        
        # Encode labels
        self.label_encoder = LabelEncoder()
        y = self.label_encoder.fit_transform(df['gender'])
        
        # Create character-level tokenizer
        all_chars = set(''.join(df['name'].str.lower()))
        self.char_to_idx = {char: i+1 for i, char in enumerate(sorted(all_chars))}
        self.char_to_idx['<PAD>'] = 0
        self.idx_to_char = {v: k for k, v in self.char_to_idx.items()}
        
        # Convert names to sequences
        X = []
        for name in df['name']:
            sequence = [self.char_to_idx.get(c.lower(), 0) for c in name]
            sequence = sequence[:self.max_length]  # Truncate
            sequence += [0] * (self.max_length - len(sequence))  # Pad
            X.append(sequence)
        
        return np.array(X), y
    
    def build_model(self):
        """Build the neural network model"""
        # Input layer
        input_layer = layers.Input(shape=(self.max_length,), name='name_input')
        
        # Embedding layer
        embedding = layers.Embedding(
            input_dim=len(self.char_to_idx),
            output_dim=64,
            input_length=self.max_length,
            name='embedding'
        )(input_layer)
        
        # LSTM layer
        lstm = layers.LSTM(128, name='lstm', return_sequences=False)(embedding)
        
        # Dense layers
        dense1 = layers.Dense(64, activation='relu', name='dense1')(lstm)
        dropout = layers.Dropout(0.3, name='dropout')(dense1)
        dense2 = layers.Dense(32, activation='relu', name='dense2')(dropout)
        
        # Output layer
        output = layers.Dense(1, activation='sigmoid', name='output')(dense2)
        
        # Create model
        model = Model(inputs=input_layer, outputs=output, name='gender_classifier')
        
        # Compile model
        model.compile(
            optimizer=optimizers.Adam(learning_rate=0.001),
            loss=losses.BinaryCrossentropy(),
            metrics=['accuracy']
        )
        
        return model
    
    def train(self, names_data):
        """Train the model"""
        X, y = self.prepare_data(names_data)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Build model
        self.model = self.build_model()
        
        # Train model
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=50,
            batch_size=32,
            verbose=1
        )
        
        self.training_history = history.history
        
        # Evaluate
        test_loss, test_accuracy = self.model.evaluate(X_test, y_test, verbose=0)
        print(f"Test Accuracy: {test_accuracy:.4f}")
        print(f"Test Loss: {test_loss:.4f}")
        
        return history
    
    def predict(self, name):
        """Make a prediction for a single name"""
        if self.model is None:
            raise ValueError("Model not trained yet!")
        
        # Preprocess the name
        sequence = [self.char_to_idx.get(c.lower(), 0) for c in name]
        sequence = sequence[:self.max_length]
        sequence += [0] * (self.max_length - len(sequence))
        
        # Make prediction
        input_data = np.array([sequence])
        prediction = self.model.predict(input_data, verbose=0)[0][0]
        
        # Get layer activations
        layer_outputs = self.get_layer_activations(input_data)
        
        return {
            'prediction': float(prediction),
            'gender': 'Female' if prediction > 0.5 else 'Male',
            'confidence': float(abs(prediction - 0.5) * 2),
            'layer_activations': layer_outputs
        }
    
    def get_layer_activations(self, input_data):
        """Get activations from each layer"""
        if self.model is None:
            return {}
        
        layer_outputs = {}
        
        # Create models for each layer to get intermediate outputs
        for i, layer in enumerate(self.model.layers[1:], 1):  # Skip input layer
            if hasattr(layer, 'output'):
                temp_model = Model(inputs=self.model.input, outputs=layer.output)
                output = temp_model.predict(input_data, verbose=0)
                
                # Calculate activation intensity
                if len(output.shape) > 2:  # For LSTM/embedding layers
                    activation_intensity = np.mean(np.abs(output))
                else:  # For dense layers
                    activation_intensity = np.mean(np.abs(output[0]))
                
                layer_outputs[layer.name] = float(activation_intensity)
        
        return layer_outputs
    
    def get_model_summary(self):
        """Get model architecture summary"""
        if self.model is None:
            return "Model not built yet"
        
        summary_list = []
        self.model.summary(print_fn=lambda x: summary_list.append(x))
        return '\n'.join(summary_list)

# Global model instance
gender_model = GenderClassificationModel()

# Train the model with sample data
print("Training gender classification model...")
history = gender_model.train(sample_names)
print("Model training completed!")

# Flask app for serving predictions
app = Flask(__name__)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        name = data.get('name', '')
        
        if not name:
            return jsonify({'error': 'No name provided'}), 400
        
        result = gender_model.predict(name)
        
        # Add training metrics
        if gender_model.training_history:
            latest_epoch = len(gender_model.training_history['accuracy']) - 1
            result['training_metrics'] = {
                'accuracy': gender_model.training_history['accuracy'][latest_epoch],
                'loss': gender_model.training_history['loss'][latest_epoch],
                'val_accuracy': gender_model.training_history['val_accuracy'][latest_epoch],
                'val_loss': gender_model.training_history['val_loss'][latest_epoch]
            }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/model_info', methods=['GET'])
def model_info():
    try:
        return jsonify({
            'model_summary': gender_model.get_model_summary(),
            'training_history': gender_model.training_history,
            'vocab_size': len(gender_model.char_to_idx) if gender_model.char_to_idx else 0
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model_loaded': gender_model.model is not None})

def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False)

# Start Flask app in background
flask_thread = threading.Thread(target=run_flask)
flask_thread.daemon = True
flask_thread.start()

# Set up ngrok tunnel
print("Setting up ngrok tunnel...")
public_url = ngrok.connect(5000)
print(f"Public URL: {public_url}")

# Keep the script running
print("Model is ready! Use the public URL to connect from your React app.")
print("Endpoints available:")
print(f"- POST {public_url}/predict - Make predictions")
print(f"- GET {public_url}/model_info - Get model information")
print(f"- GET {public_url}/health - Check health status")

# Test the model
test_names = ['Sarah', 'Michael', 'Emma', 'David']
print("\nTesting the model:")
for name in test_names:
    result = gender_model.predict(name)
    print(f"{name}: {result['gender']} ({result['confidence']:.2f} confidence)")

# Keep running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Stopping server...")
