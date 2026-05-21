# Plexus — Project Structure

## Directory Layout

```
Plexus/
├── frontend/                    # Next.js 15 web application
│   ├── components/              # React UI components
│   │   ├── nodes/               # React Flow node definitions
│   │   │   ├── nodes.tsx        # All 40+ node type definitions and registry
│   │   │   ├── CustomNodes.tsx  # Custom node renderers
│   │   │   ├── CustomEdge.tsx   # Custom edge renderer
│   │   │   └── nodeStyles.ts    # Node visual style constants
│   │   ├── templates/
│   │   │   └── templateDefinitions.ts  # Model preset templates
│   │   ├── utils/
│   │   │   └── layoutUtils.ts   # Dagre auto-layout helper
│   │   ├── FlowCanvas.tsx       # Main React Flow canvas (core component)
│   │   ├── FlowCanvasWrapper.tsx
│   │   ├── DatasetManager.tsx   # Dataset upload, profiling, preview UI
│   │   ├── EnhancedSidebar.tsx  # Node palette with search/favorites/history
│   │   ├── Sidebar.tsx          # Basic sidebar
│   │   ├── CodeGenerator.tsx    # Code generation UI panel
│   │   ├── TrainingPanel.tsx    # Training progress and metrics UI
│   │   ├── ModelValidator.tsx   # Architecture validation UI
│   │   ├── ModelTemplates.tsx   # Template picker UI
│   │   ├── PerformanceAnalysis.tsx
│   │   ├── ProjectManager.tsx   # Save/load/export project UI
│   │   ├── ConsolePanel.tsx     # Log console UI
│   │   ├── InferenceEngine.tsx  # Model inference UI
│   │   ├── LocalInferenceEngine.tsx
│   │   ├── ColabInferenceEngine.tsx
│   │   ├── HelpSystem.tsx       # Quick-start guide and shortcuts
│   │   ├── FloatingToolbar.tsx  # Canvas toolbar
│   │   ├── NodeOptions.tsx      # Node property editor
│   │   ├── SettingsModal.tsx
│   │   ├── SaveProjectModal.tsx
│   │   ├── Toast.tsx / ToastProvider.tsx
│   │   ├── navbar.tsx
│   │   ├── icons.tsx
│   │   └── PlexusLogo.tsx
│   ├── pages/                   # Next.js file-based routing
│   │   ├── index.tsx            # Landing page
│   │   ├── neuralnetwork/       # Main IDE page (canvas + all panels)
│   │   ├── dashboard/           # User dashboard
│   │   ├── projects/            # Project browser
│   │   ├── about/, blog/, docs/, login/, signup/, pricing/
│   │   ├── _app.tsx             # App wrapper (providers, global state)
│   │   └── _document.tsx        # HTML document shell
│   ├── store/
│   │   └── plexusStore.ts       # Zustand global state store
│   ├── hooks/
│   │   ├── useGraphValidation.ts  # Architecture validation hook
│   │   └── useTrainingSocket.ts   # WebSocket training updates hook
│   ├── lib/
│   │   └── api.ts               # Typed API client (all backend calls)
│   ├── types/
│   │   ├── index.ts             # Core TypeScript types
│   │   └── neural-network.ts    # Neural network specific types
│   ├── utils/
│   │   └── projectStorage.ts    # localStorage project persistence
│   ├── config/
│   │   ├── fonts.ts             # Font configuration
│   │   └── site.ts              # Site metadata
│   ├── layouts/
│   │   ├── default.tsx          # Default page layout
│   │   └── head.tsx             # HTML head component
│   ├── styles/
│   │   ├── globals.css          # Global CSS
│   │   └── nodes.css            # Node-specific CSS
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                     # FastAPI Python backend
│   ├── agents/                  # AI agent implementations
│   │   ├── base.py              # BaseAgent abstract class + AgentResult
│   │   ├── data_agent.py        # DataAgent: CSV profiling + LLM cleaning
│   │   ├── architect.py         # ArchitectAgent: model architecture suggestions
│   │   ├── resource.py          # ResourceAgent: parameter/memory estimation
│   │   ├── debugger.py          # DebuggerAgent: training issue diagnosis
│   │   ├── optimizer.py         # OptimizerAgent: hyperparameter tuning
│   │   └── deployment.py        # DeploymentAgent: production file generation
│   ├── core/                    # Core utilities
│   │   ├── llm_client.py        # Unified OpenAI/Gemini LLM wrapper
│   │   ├── code_generator.py    # Graph → Python code (TF/PyTorch)
│   │   ├── dataset_analyzer.py  # Dataset profiling logic
│   │   ├── graph_utils.py       # Graph traversal utilities
│   │   └── trainer.py           # Training execution (real + simulated)
│   ├── models/                  # Saved model artifacts (joblib files)
│   ├── uploads/                 # Uploaded dataset files
│   │   └── demo/iris.csv        # Bundled demo dataset
│   ├── api.py                   # FastAPI app + all endpoints
│   ├── database.py              # SQLAlchemy models + SQLite persistence
│   ├── cli.py                   # CLI test interface
│   └── requirements.txt
│
├── assets/                      # Static assets (diagrams, sample data)
├── start.bat                    # One-click Windows startup script
└── README.md
```

## Core Architectural Patterns

### Frontend Architecture
- **Next.js Pages Router** — file-based routing under `pages/`
- **Zustand store** (`plexusStore.ts`) — single global state for nodes, edges, datasets, training jobs, UI state
- **React Flow** — canvas engine; nodes and edges are plain JS objects stored in Zustand
- **Component composition** — large feature panels (DatasetManager, TrainingPanel, etc.) are self-contained components imported into the main IDE page
- **Custom hooks** — `useGraphValidation` and `useTrainingSocket` encapsulate complex side-effect logic
- **Typed API client** (`lib/api.ts`) — all backend calls go through a single module with typed request/response shapes

### Backend Architecture
- **FastAPI** — async REST API + WebSocket endpoint
- **Agent pattern** — each AI capability is a class extending `BaseAgent` with a single `run(input) → AgentResult` method
- **Background tasks** — dataset profiling and agent runs use FastAPI `BackgroundTasks` + `asyncio.create_task`
- **Dual persistence** — in-memory dicts (`_dataset_registry`, `_jobs`) synced to SQLite via SQLAlchemy + a key-value `set_state` helper
- **Lazy agent imports** — agents imported inside endpoint functions to avoid startup failures from missing optional deps
- **LLM abstraction** — `LLMClient` in `core/llm_client.py` auto-detects available API keys and routes to OpenAI or Gemini

### Data Flow
1. User uploads CSV → backend saves file, returns stub record, starts background profiling
2. Background task profiles CSV, runs Data Agent (LLM cleaning) and Architect Agent in parallel
3. Frontend polls `/api/datasets/{id}/status` until `done: true`
4. User drags dataset node onto canvas, connects preprocessing and model nodes
5. User clicks Train → POST `/api/train/start` → background training job streams updates via WebSocket
6. Frontend `useTrainingSocket` hook receives epoch metrics and updates Zustand store → TrainingPanel re-renders
