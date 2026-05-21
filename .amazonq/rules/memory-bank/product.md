# Plexus — Product Overview

## Purpose & Value Proposition
Plexus is an AI-powered visual IDE for designing, training, and deploying deep learning models. It eliminates the need to write boilerplate ML code by letting users drag-and-drop neural network layers onto a canvas, connect them visually, and delegate data preprocessing, architecture design, and hyperparameter tuning to AI agents.

## Target Users
- ML practitioners who want rapid prototyping without boilerplate
- Data scientists exploring neural architectures visually
- Students and researchers learning deep learning concepts interactively

## Key Features

### Visual Neural Network Builder
- Drag-and-drop canvas (React Flow) with 40+ node types
- Node categories: Input/Output, Dense, Conv2D, LSTM, GRU, Dropout, BatchNorm, Flatten, Reshape, Attention, Embedding
- Algorithm nodes: CNN, RNN, Transformer, Autoencoder, GAN, ResNet, VAE
- Optimizer nodes: Adam, SGD, RMSProp, AdaGrad, AdamW
- Loss function nodes: CrossEntropy, MSE, MAE, BCE
- LR Scheduler nodes: StepLR, ExponentialLR, CosineAnnealing, ReduceOnPlateau
- Auto-layout via dagre graph algorithm

### Dataset Management
- Upload CSV, text, and image ZIP datasets
- Background profiling with async progress tracking
- Column statistics: dtype, missing %, min/max/mean/std, unique values
- 10-row preview table
- Auto-inferred preprocessing suggestions
- Demo Iris dataset seeded on first launch

### AI Agent System
- **Data Agent** — profiles CSV, generates `clean_data(df)` via LLM, validates on sample
- **Architect Agent** — suggests neural network architecture from dataset profile
- **Resource Agent** — estimates parameters, memory, FLOPs for a graph
- **Debugger Agent** — diagnoses overfitting, vanishing gradients, etc.
- **Optimizer Agent** — recommends learning rate and batch size tuning
- **Deployment Agent** — generates production deployment files (optionally as ZIP)
- **LLM Client** — unified wrapper for OpenAI GPT and Google Gemini with auto-detection, retry, and exponential backoff

### Code Generation & Export
- TensorFlow/Keras code generation from visual graph
- PyTorch code generation from visual graph
- Jupyter Notebook export (`.ipynb`) with data loading, model definition, training loop
- Google Colab-ready notebooks

### Training Pipeline
- Start training from canvas via backend API
- Simulated training when TF/PyTorch not installed
- Real-time metrics via WebSocket (loss, accuracy, gradient norms)
- Pause/resume training with checkpoint support
- Visualization nodes: Loss Curve, Gradient Flow, Confusion Matrix, Predictions Table, Activation Heatmap

### Model Templates & Validation
- Presets: Binary Classifier, CNN Image Classifier, LSTM Text Classifier, Autoencoder
- Architecture validation: missing input/output, disconnected nodes, best practices
- 0–100 quality score

### Project Management
- Save/Load to browser localStorage
- Import/Export as JSON files
- Project metadata: name, description, tags, framework, category
- Thumbnail generation for project previews

### Developer Experience
- Enhanced sidebar with smart search, favorites, recent history, category filtering
- Console panel with typed log levels (info, success, warning, error, agent)
- Toast notifications
- Keyboard shortcuts: Ctrl+S, Ctrl+O, Ctrl+L, Ctrl+G, F1
- Help system with quick-start guide and tips
