# Plexus – Orchestration Layer

The `orchestration/` module is the AI agent backend for the **Plexus** project.
It runs entirely as a standalone Python package and is tested via a CLI.
Later it will be wired into FastAPI endpoints and integrated with the React-Flow frontend.

---

## Architecture overview

```
orchestration/
├── agents/
│   ├── base.py           BaseAgent – abstract interface all agents share
│   ├── data_agent.py     Profiles a CSV and generates a clean_data() function  [FULL]
│   ├── architect.py      Suggests a Keras NN architecture                       [FULL]
│   ├── debugger.py       Diagnoses training-loop issues                         [stub]
│   ├── optimizer.py      Automated hyperparameter search                        [stub]
│   ├── resource.py       Compute / memory estimator                             [stub]
│   └── deployment.py     Generates serving code (FastAPI, Docker, ONNX)        [stub]
├── core/
│   ├── llm_client.py     Unified LLM wrapper (OpenAI, retry logic)
│   ├── dataset_analyzer.py  CSV profiling → DatasetProfile dataclass
│   └── graph_utils.py    layers → React-Flow nodes/edges + Keras code
├── cli.py                Interactive CLI entry point
├── requirements.txt
└── README.md
```

### How an agent call flows

```
CLI  →  DataAgent.run({csv_path, target_col})
              │
              ├─ DatasetAnalyzer.profile()   → DatasetProfile
              ├─ LLMClient.chat(prompt)      → raw text
              ├─ extract code block          → clean_data() source
              └─ validate on 5-row sample   → AgentResult

CLI  →  ArchitectAgent.run({profile, task_type})
              │
              ├─ build LLM prompt            (features, classes, size)
              ├─ LLMClient.chat(prompt)      → JSON layer array
              ├─ graph_utils.graph_to_keras_code()  → Keras snippet
              ├─ graph_utils.layers_to_graph()      → React-Flow nodes/edges
              └─ AgentResult
```

---

## Quick start

### 1. Prerequisites

- Python 3.10 or later
- An OpenAI API key (get one at <https://platform.openai.com/>)

### 2. Create and activate a virtual environment

```bash
# from the orchestration/ directory
cd orchestration

python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure your API key

Create a file called `.env` inside the `orchestration/` directory:

```
OPENAI_API_KEY=sk-...your-key-here...
```

> The `.env` file is listed in `.gitignore` and will not be committed.

### 5. Run the CLI

```bash
python cli.py
```

The CLI will prompt you for:
1. Path to a CSV dataset
2. Name of the target column (optional)
3. Task type: classification or regression

It will then:
- Profile the dataset
- Generate a `clean_data(df)` pandas function
- Validate the code on a 5-row sample
- Propose a Keras neural network architecture
- Print the Keras model code

---

## Example session

```
Enter path to dataset (CSV file): ../data/titanic.csv
Target column name (press Enter to skip): Survived
What type of ML task?
  1. classification  (default)
  2. regression
Enter number [1]:

  ▸  Profiling dataset…
  ✔  Dataset profiled: 891 rows × 12 columns

Dataset Profile:
  ...

Generated clean_data() function:
──────────────────────────────────────────────────────────────
def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    ...
──────────────────────────────────────────────────────────────
  ✔  Code validation passed (executed on 5-row sample).

  ▸  Designing architecture for classification…
  ✔  Architecture generated: 6 layers

Architecture Description:
  [0] InputLayer(input_shape=[10])
  [1] Dense(units=64)  activation=relu
  ...

Keras Model Code:
──────────────────────────────────────────────────────────────
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers as kl

model = keras.Sequential([
    kl.InputLayer(input_shape=[10]),
    kl.Dense(units=64, activation="relu"),
    ...
])
──────────────────────────────────────────────────────────────
```

---

## Environment variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Required. Your OpenAI secret key. |
| `OPENAI_MODEL` | Optional. Override the default model (`gpt-3.5-turbo`). |

---

## Extending the orchestration layer

### Add a new agent

1. Create `agents/my_agent.py` that subclasses `BaseAgent`.
2. Implement `async def run(self, inputs) -> AgentResult`.
3. Register it in `agents/__init__.py`.

### Expose via FastAPI (future)

```python
from fastapi import FastAPI, UploadFile
from orchestration.agents.data_agent import DataAgent

app = FastAPI()
agent = DataAgent()

@app.post("/analyze")
async def analyze(file: UploadFile):
    result = await agent.run({"csv_path": save_temp(file)})
    return result.data
```

---

## Notes

- The CLI uses `asyncio.run()` to call async agents synchronously.
  FastAPI will call them with `await` instead.
- Code validation uses `exec()` in a restricted namespace.
  This is for testing only – do not use in production.
- Stub agents return `AgentResult(success=False)` with a "not implemented"
  message.  They follow the same interface so they can be filled in without
  changing call sites.
