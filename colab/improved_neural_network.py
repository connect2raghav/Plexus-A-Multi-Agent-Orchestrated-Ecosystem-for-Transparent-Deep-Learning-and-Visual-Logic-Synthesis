# 🧠 Improved Real Neural Network for Gender Classification
# Run this in Google Colab for better error handling and debugging

# 📦 Install required packages
print("📦 Installing required packages...")
import subprocess
import sys

def install_package(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", package])

packages = ["flask", "flask-cors", "tensorflow", "pandas", "numpy", "scikit-learn", "pyngrok", "requests"]
for package in packages:
    try:
        install_package(package)
        print(f"✅ {package} installed")
    except Exception as e:
        print(f"❌ Failed to install {package}: {e}")

print("✅ All packages installation completed!")

# 📚 Import libraries
print("\n📚 Importing libraries...")
try:
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
    import requests
    
    print(f"✅ TensorFlow version: {tf.__version__}")
    print("✅ All libraries imported successfully!")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("🔧 Try restarting the runtime and running this cell again")
    raise

# 📊 Create sample dataset
print("\n📊 Creating sample dataset...")
sample_names = [
    # Female names (30)
    ('Sarah', 'Female'), ('Emma', 'Female'), ('Jessica', 'Female'), 
    ('Ashley', 'Female'), ('Amanda', 'Female'), ('Michelle', 'Female'),
    ('Lisa', 'Female'), ('Emily', 'Female'), ('Kimberly', 'Female'),
    ('Jennifer', 'Female'), ('Nicole', 'Female'), ('Elizabeth', 'Female'),
    ('Rebecca', 'Female'), ('Maria', 'Female'), ('Stephanie', 'Female'),
    ('Rachel', 'Female'), ('Catherine', 'Female'), ('Angela', 'Female'),
    ('Samantha', 'Female'), ('Katherine', 'Female'), ('Christina', 'Female'),
    ('Linda', 'Female'), ('Barbara', 'Female'), ('Susan', 'Female'),
    ('Karen', 'Female'), ('Nancy', 'Female'), ('Donna', 'Female'),
    ('Carol', 'Female'), ('Ruth', 'Female'), ('Sharon', 'Female'),
    
    # Male names (30)
    ('Michael', 'Male'), ('David', 'Male'), ('Robert', 'Male'),
    ('William', 'Male'), ('Christopher', 'Male'), ('Matthew', 'Male'),
    ('Joshua', 'Male'), ('Andrew', 'Male'), ('Daniel', 'Male'),
    ('James', 'Male'), ('John', 'Male'), ('Ryan', 'Male'),
    ('Nicholas', 'Male'), ('Alexander', 'Male'), ('Jonathan', 'Male'),
    ('Tyler', 'Male'), ('Brandon', 'Male'), ('Anthony', 'Male'),
    ('Steven', 'Male'), ('Thomas', 'Male'), ('Kevin', 'Male'),
    ('Paul', 'Male'), ('Mark', 'Male'), ('Donald', 'Male'),
    ('Kenneth', 'Male'), ('Richard', 'Male'), ('Charles', 'Male'),
    ('Joseph', 'Male'), ('Edward', 'Male'), ('George', 'Male')
]

print(f"📊 Dataset created with {len(sample_names)} names")
female_count = sum(1 for _, gender in sample_names if gender == 'Female')
male_count = sum(1 for _, gender in sample_names if gender == 'Male')
print(f"   👩 Female: {female_count} names")
print(f"   👨 Male: {male_count} names")

# 🤖 Gender Classification Model Class
print("\n🤖 Setting up Gender Classification Model...")

class GenderClassificationModel:
    def __init__(self):
        self.model = None
        self.char_to_idx = None
        self.idx_to_char = None
        self.label_encoder = None
        self.max_length = 20
        self.training_history = None
        
    def prepare_data(self, names_data):
        """Prepare and preprocess the data"""
        print("🔧 Preparing data...")
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
        
        print(f"✅ Data prepared: {len(X)} samples, vocab size: {len(self.char_to_idx)}")
        return np.array(X), y
    
    def build_model(self):
        """Build the neural network model"""
        print("🏗️ Building neural network architecture...")
        
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
        
        print("✅ Model architecture built successfully")
        return model
    
    def train(self, names_data):
        """Train the model"""
        print("🚀 Starting model training...")
        X, y = self.prepare_data(names_data)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        print(f"📊 Training set: {len(X_train)} samples")
        print(f"📊 Test set: {len(X_test)} samples")
        
        # Build model
        self.model = self.build_model()
        
        print("🏗️ Model Summary:")
        self.model.summary()
        
        # Train model
        print("\n🚀 Training in progress...")
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=50,
            batch_size=16,
            verbose=1
        )
        
        self.training_history = history.history
        
        # Evaluate
        test_loss, test_accuracy = self.model.evaluate(X_test, y_test, verbose=0)
        print(f"\n✅ Training completed!")
        print(f"📊 Test Accuracy: {test_accuracy:.4f}")
        print(f"📉 Test Loss: {test_loss:.4f}")
        
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
                try:
                    temp_model = Model(inputs=self.model.input, outputs=layer.output)
                    output = temp_model.predict(input_data, verbose=0)
                    
                    # Calculate activation intensity
                    if len(output.shape) > 2:  # For LSTM/embedding layers
                        activation_intensity = np.mean(np.abs(output))
                    else:  # For dense layers
                        activation_intensity = np.mean(np.abs(output[0]))
                    
                    layer_outputs[layer.name] = float(activation_intensity)
                except Exception as e:
                    print(f"Warning: Could not get activations for layer {layer.name}: {e}")
        
        return layer_outputs

# 🎯 Train the model
print("\n🎯 Training the neural network...")
try:
    gender_model = GenderClassificationModel()
    history = gender_model.train(sample_names)
    print("\n🎉 Model training completed successfully!")
except Exception as e:
    print(f"❌ Training failed: {e}")
    raise

# 🧪 Test the model
print("\n🧪 Testing the trained model...")
test_names = ['Sarah', 'Michael', 'Emma', 'David', 'Jessica', 'Robert']
print("-" * 50)

for name in test_names:
    try:
        result = gender_model.predict(name)
        confidence_emoji = "🔥" if result['confidence'] > 0.8 else "✅" if result['confidence'] > 0.6 else "🤔"
        gender_emoji = "👩" if result['gender'] == 'Female' else "👨"
        
        print(f"{gender_emoji} {name:10} → {result['gender']:6} ({result['confidence']*100:5.1f}% confident) {confidence_emoji}")
    except Exception as e:
        print(f"❌ Error predicting {name}: {e}")

print("\n✅ Model testing completed!")

# 🌐 Flask API Server Setup
print("\n🌐 Setting up Flask API server...")
app = Flask(__name__)
CORS(app, origins="*", methods=["GET", "POST", "OPTIONS"])

@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response
    
    return jsonify({
        'status': 'healthy', 
        'model_loaded': gender_model.model is not None,
        'message': '🧠 Real Neural Network is ready!',
        'timestamp': time.time()
    })

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
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
        
        response = jsonify(result)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
        
    except Exception as e:
        error_response = jsonify({'error': f'Prediction failed: {str(e)}'})
        error_response.headers.add("Access-Control-Allow-Origin", "*")
        return error_response, 500

@app.route('/model_info', methods=['GET', 'OPTIONS'])
def model_info():
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response
    
    try:
        summary_list = []
        if gender_model.model:
            gender_model.model.summary(print_fn=lambda x: summary_list.append(x))
        
        response = jsonify({
            'model_summary': '\n'.join(summary_list),
            'training_history': gender_model.training_history,
            'vocab_size': len(gender_model.char_to_idx) if gender_model.char_to_idx else 0
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    except Exception as e:
        error_response = jsonify({'error': f'Model info failed: {str(e)}'})
        error_response.headers.add("Access-Control-Allow-Origin", "*")
        return error_response, 500

print("✅ Flask API routes configured with CORS enabled!")

# 🚀 Start the server with comprehensive error checking
def run_flask():
    print("🔥 Flask server thread starting...")
    try:
        app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False, threaded=True)
    except Exception as e:
        print(f"❌ Flask server error: {e}")

print("\n🚀 Starting Flask server...")
flask_thread = threading.Thread(target=run_flask)
flask_thread.daemon = True
flask_thread.start()

# Wait for Flask to start
print("⏳ Waiting for server to start...")
time.sleep(8)

# Test local server comprehensively
print("\n🔍 Testing local server...")
local_tests_passed = 0
total_tests = 3

try:
    # Test 1: Basic health check
    response = requests.get('http://localhost:5000/health', timeout=10)
    if response.status_code == 200:
        data = response.json()
        print("✅ Test 1/3: Health endpoint working")
        local_tests_passed += 1
        if data.get('model_loaded'):
            print("  ✅ Model is loaded and ready")
        else:
            print("  ⚠️ Model not loaded properly")
    else:
        print(f"❌ Test 1/3: Health endpoint returned {response.status_code}")
        print(f"  Response: {response.text[:100]}...")
except Exception as e:
    print(f"❌ Test 1/3: Health endpoint failed: {e}")

try:
    # Test 2: Sample prediction
    response = requests.post('http://localhost:5000/predict', 
                           json={'name': 'Sarah'}, 
                           timeout=10)
    if response.status_code == 200:
        data = response.json()
        print("✅ Test 2/3: Prediction endpoint working")
        print(f"  Sample: Sarah → {data.get('gender', 'Unknown')} ({data.get('confidence', 0)*100:.1f}% confident)")
        local_tests_passed += 1
    else:
        print(f"❌ Test 2/3: Prediction endpoint returned {response.status_code}")
        print(f"  Response: {response.text[:100]}...")
except Exception as e:
    print(f"❌ Test 2/3: Prediction endpoint failed: {e}")

try:
    # Test 3: Model info
    response = requests.get('http://localhost:5000/model_info', timeout=10)
    if response.status_code == 200:
        data = response.json()
        print("✅ Test 3/3: Model info endpoint working")
        print(f"  Vocab size: {data.get('vocab_size', 0)}")
        local_tests_passed += 1
    else:
        print(f"❌ Test 3/3: Model info endpoint returned {response.status_code}")
except Exception as e:
    print(f"❌ Test 3/3: Model info endpoint failed: {e}")

if local_tests_passed == total_tests:
    print(f"\n🎉 All local tests passed ({local_tests_passed}/{total_tests})!")
else:
    print(f"\n⚠️ Only {local_tests_passed}/{total_tests} local tests passed")
    print("🔧 Some endpoints may not work properly")

# Create ngrok tunnel with error handling
print("\n🌐 Creating public URL with ngrok...")
public_url = None
try:
    # Create new tunnel with options to minimize "Visit Site" page
    print("🔗 Establishing ngrok tunnel to localhost:5000...")
    
    # Try to create tunnel with inspect=False to reduce security warnings
    try:
        public_url = ngrok.connect(5000, options={
            "bind_tls": True,  # Force HTTPS
            "inspect": False   # Disable inspection to reduce warnings
        })
    except:
        # Fallback to basic tunnel if options fail
        public_url = ngrok.connect(5000)
    
    print(f"✅ Ngrok tunnel created successfully!")
    print(f"🌍 Public URL: {public_url}")
    
    # Important notice about ngrok security page
    print("\n" + "🔐 IMPORTANT - NGROK SECURITY NOTICE:")
    print("📋 If you see a 'Visit Site' page when opening the URL:")
    print("   1. This is normal ngrok security")
    print("   2. Click 'Visit Site' to authorize access") 
    print("   3. Then your React app can connect successfully")
    print("=" * 60)
    
except Exception as e:
    print(f"❌ Failed to create ngrok tunnel: {e}")
    print("🔧 Try running this cell again or check your internet connection")
    raise

# Test the public URL
print("\n🔍 Testing public URL...")
public_tests_passed = 0
total_public_tests = 2

try:
    response = requests.get(f'{public_url}/health', timeout=20)
    if response.status_code == 200:
        data = response.json()
        print("✅ Public health endpoint working")
        public_tests_passed += 1
        if data.get('model_loaded'):
            print("  ✅ Model accessible via public URL")
        else:
            print("  ⚠️ Model not loaded via public URL")
    else:
        print(f"❌ Public health endpoint returned {response.status_code}")
        print(f"  Response: {response.text[:100]}...")
except Exception as e:
    print(f"⚠️ Could not test public health endpoint: {e}")
    print("  This might be normal due to ngrok limitations")

try:
    response = requests.post(f'{public_url}/predict', 
                           json={'name': 'Michael'}, 
                           timeout=20)
    if response.status_code == 200:
        data = response.json()
        print("✅ Public prediction endpoint working")
        print(f"  Sample: Michael → {data.get('gender', 'Unknown')} ({data.get('confidence', 0)*100:.1f}% confident)")
        public_tests_passed += 1
    else:
        print(f"❌ Public prediction endpoint returned {response.status_code}")
except Exception as e:
    print(f"⚠️ Could not test public prediction endpoint: {e}")
    print("  This might be normal due to ngrok limitations")

# Final status report
print("\n" + "="*70)
if local_tests_passed == total_tests and public_tests_passed >= 1:
    print("🎉 SUCCESS! Your neural network is FULLY OPERATIONAL!")
elif local_tests_passed == total_tests:
    print("✅ SUCCESS! Your neural network is ready (local tests passed)")
else:
    print("⚠️ PARTIAL SUCCESS - Some issues detected")
print("="*70)

print(f"\n📡 Your Public URL: {public_url}")
print("\n📋 COPY THIS EXACT URL FOR YOUR REACT APP:")
print(f"    {public_url}")

print("\n🔗 Available endpoints:")
print(f"   • GET  {public_url}/health - Check server status")
print(f"   • POST {public_url}/predict - Make predictions")  
print(f"   • GET  {public_url}/model_info - Get model details")

print("\n💡 Troubleshooting:")
print("   • If connection fails, copy the URL exactly as shown above")
print("   • Make sure this cell keeps running (don't stop it)")
print("   • The URL expires after 2 hours on free ngrok")

print("\n⚡ Server Status: RUNNING")
print("🎯 Ready for React app connection!")

# Keep server running with better monitoring
print("\n🔄 Monitoring server requests...")
print("💡 Watch this space for incoming predictions from your React app!")
print("-" * 70)

request_count = 0
start_time = time.time()

try:
    while True:
        time.sleep(5)  # Check every 5 seconds
        current_time = time.time()
        uptime = current_time - start_time
        
        # Show periodic status
        if int(uptime) % 60 == 0:  # Every minute
            print(f"⏰ Server uptime: {int(uptime//60)} minutes - Still running strong!")
            
except KeyboardInterrupt:
    print("\n🛑 Server stopped by user")
    if public_url:
        try:
            ngrok.disconnect(public_url)
            print("✅ ngrok tunnel closed cleanly")
        except:
            print("⚠️ ngrok tunnel may still be active")
    print("👋 Goodbye!")
