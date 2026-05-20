# 🧠 Plexus — AI-Powered Neural Network Visual IDE

Plexus is an interactive visual development environment for designing, training, and deploying deep learning models. Drag-and-drop neural network layers onto a canvas, connect them, and let AI agents handle the rest — from data preprocessing to architecture optimization.

---

## 📁 Project Structure

```
Plexus/
├── frontend/          # Next.js web application (React + TypeScript)
│   ├── components/    # UI components (FlowCanvas, DatasetManager, Sidebar, etc.)
│   ├── pages/         # Next.js routes
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # API client & utilities
│   ├── store/         # Zustand global state
│   ├── styles/        # CSS styles
│   ├── config/        # App configuration (fonts, site metadata)
│   ├── layouts/       # Page layouts
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── backend/           # FastAPI Python backend
│   ├── agents/        # AI agents (Data, Architect, Debugger, Optimizer, Resource)
│   ├── core/          # Core modules (LLM client, dataset analyzer, code generator)
│   ├── api.py         # FastAPI endpoints
│   ├── cli.py         # CLI test interface
│   └── requirements.txt
├── start.bat          # One-click startup script (Windows)
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **npm** or **pnpm**

### One-Click Start (Windows)
```bash
start.bat
```
This will:
1. Create a Python virtual environment (if not exists)
2. Install Python dependencies (if not installed)
3. Install Node packages (if not installed)
4. Launch the backend on `http://localhost:8000`
5. Launch the frontend on `http://localhost:3000`

### Manual Start

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn backend.api:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## ✅ Work Done

### Visual Neural Network Builder
- **Drag-and-drop canvas** using React Flow — supports 40+ node types
- **Node types**: Input/Output layers, Dense, Conv2D, LSTM, GRU, Dropout, BatchNorm, Flatten, Reshape, Attention, Embedding, and more
- **Algorithm nodes**: CNN, RNN, Transformer, Autoencoder, GAN, ResNet, VAE
- **Optimizer nodes**: Adam, SGD, RMSProp, AdaGrad, AdamW
- **Loss function nodes**: CrossEntropy, MSE, MAE, BCE
- **LR Scheduler nodes**: StepLR, ExponentialLR, CosineAnnealing, ReduceOnPlateau
- **Training configuration node** with epochs, batch size, validation split, early stopping
- **Auto-layout** using dagre graph layout algorithm

### Dataset Management
- **Upload** CSV, text, and image ZIP datasets
- **Background profiling** — dataset stats computed asynchronously after upload
- **Column statistics** — dtype, missing %, min/max/mean/std, unique values
- **Preview** — first 10 rows displayed in a data table
- **Preprocessing suggestions** — auto-inferred from column stats (drop nulls, encode categoricals, scale numerics)
- **Dataset node** on canvas — drag a dataset onto the workflow with live profiling status

### Preprocessing Pipeline (Canvas Nodes)
- **Normalize** — StandardScaler / min-max normalization
- **Drop Nulls** — handle missing values
- **One-Hot Encode** — encode low-cardinality categoricals
- **Embed Encode** — embedding for high-cardinality features
- **Scale** — numeric feature scaling

### AI Agent System (Backend)
- **Data Agent** — profiles CSV, calls LLM to generate `clean_data(df)` function, validates on sample
- **Architect Agent** — suggests neural network architecture based on dataset profile
- **Resource Agent** — estimates parameters, memory, FLOPs for a given graph
- **Debugger Agent** — diagnoses training issues (overfitting, vanishing gradients, etc.)
- **Optimizer Agent** — recommends hyperparameter tuning (learning rate, batch size)
- **Deployment Agent** — generates production deployment files
- **LLM Client** — unified wrapper supporting OpenAI and Google Gemini with auto-detection, retry, and exponential backoff

### Code Generation
- **TensorFlow / Keras** code generation from visual graph
- **PyTorch** code generation from visual graph
- **Jupyter Notebook** export — complete `.ipynb` with data loading, model definition, training loop
- **Google Colab** ready — notebooks can be uploaded directly to Colab

### Training Pipeline
- **Start training** from the canvas (via backend API)
- **Simulated training** when TensorFlow/PyTorch not installed
- **Real-time metrics** via WebSocket — loss, accuracy, gradient norms
- **Visualization nodes** — Loss Curve, Gradient Flow, Confusion Matrix, Predictions Table, Activation Heatmap
- **Training panel** with live progress

### Model Templates & Presets
- **Binary Classifier** — simple feedforward network
- **CNN Image Classifier** — Conv2D + pooling architecture
- **LSTM Text Classifier** — sequential model for NLP
- **Autoencoder** — encoder-decoder network
- Organized by category (Vision, NLP, General, Time Series)

### Model Validation
- **Architecture validation** — checks for missing input/output, disconnected nodes
- **Best practices** — activation functions, regularization usage
- **Performance warnings** — identifies overly complex models
- **Scoring system** — 0-100 quality score

### Project Management
- **Save/Load** projects to browser localStorage
- **Import/Export** as JSON files
- **Project metadata** — name, description, tags, framework, category
- **Thumbnail generation** for project previews

### Enhanced Sidebar
- **Smart search** — search by name, type, or keywords
- **Favorites** — star frequently used layers
- **Recent history** — last 5 used layer types
- **Category filtering** — Input/Output, Core, CNN, RNN, Optimizers, etc.

### Help System
- **Quick start guide** — 5-step tutorial
- **Keyboard shortcuts** — Ctrl+S, Ctrl+O, Ctrl+L, Ctrl+G, F1
- **Tips & tricks** — workflow optimization

### Performance Analysis
- **Parameter count** — total and trainable
- **Model size** estimation
- **Memory usage** and efficiency metrics
- **Recommendations** for optimization

### Console & Notifications
- **Console panel** — logs all actions (info, success, warning, error, agent)
- **Agent notifications** — suggestions, warnings from AI agents
- **Toast notifications** — user-facing success/error messages

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/datasets/upload` | Upload a dataset |
| `GET` | `/api/datasets` | List all datasets |
| `GET` | `/api/datasets/{id}` | Get dataset details |
| `GET` | `/api/datasets/{id}/status` | Profiling progress |
| `DELETE` | `/api/datasets/{id}` | Delete a dataset |
| `POST` | `/api/agents/data` | Run Data Agent |
| `POST` | `/api/agents/architect` | Run Architect Agent |
| `POST` | `/api/agents/resource` | Run Resource Agent |
| `POST` | `/api/agents/debug` | Run Debugger Agent |
| `POST` | `/api/agents/optimize` | Run Optimizer Agent |
| `POST` | `/api/generate/code` | Generate Python code |
| `POST` | `/api/train/start` | Start training job |
| `GET` | `/api/train/{id}/status` | Get training status |
| `WS` | `/ws/train/{id}` | Real-time training updates |

---

## 🔑 Environment Setup

**Backend** (`backend/.env`):
```env
GEMINI_API_KEY=your_key_here        # Free at https://aistudio.google.com/apikey
# OR
OPENAI_API_KEY=your_key_here
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_PLEXUS_API_URL=http://localhost:8000
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript, React Flow, HeroUI, Tailwind CSS |
| Backend | Python, FastAPI, Pandas, Uvicorn |
| AI/LLM | OpenAI GPT / Google Gemini (auto-detected) |
| State | Zustand |
| Layout | Dagre (graph auto-layout) |
