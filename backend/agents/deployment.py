"""
agents/deployment.py
--------------------
Deployment Code Generator Agent – generates production-ready serving code.

Given a model architecture (nodes + edges), generates:
  - A FastAPI prediction endpoint (Python)
  - A Dockerfile
  - A requirements.txt for the serving container
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from .base import AgentResult, BaseAgent


_FASTAPI_TEMPLATE = """\"\"\"
Plexus-generated FastAPI serving application.
Run: uvicorn app:app --host 0.0.0.0 --port 8000
\"\"\"
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
import {framework_import}

app = FastAPI(title="Plexus Model API")


# ---- Load model ----
model = {load_model_code}


class PredictRequest(BaseModel):
    inputs: list  # flat list of floats


class PredictResponse(BaseModel):
    predictions: list
    probabilities: list


@app.get("/health")
def health():
    return {{"status": "ok"}}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    x = np.array(req.inputs, dtype=np.float32).reshape(1, -1)
    {predict_code}
    return PredictResponse(
        predictions=predictions.tolist(),
        probabilities=probabilities.tolist(),
    )
"""

_DOCKERFILE_TEMPLATE = """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
"""

_TF_REQUIREMENTS = """fastapi>=0.111.0
uvicorn[standard]>=0.29.0
numpy>=1.24.0
tensorflow>=2.13.0
pydantic>=2.0.0
"""

_TORCH_REQUIREMENTS = """fastapi>=0.111.0
uvicorn[standard]>=0.29.0
numpy>=1.24.0
torch>=2.0.0
pydantic>=2.0.0
"""

_SKLEARN_REQUIREMENTS = """fastapi>=0.111.0
uvicorn[standard]>=0.29.0
numpy>=1.24.0
pandas>=2.0.0
joblib>=1.3.0
scikit-learn>=1.4.0
pydantic>=2.0.0
"""

_SKLEARN_TEMPLATE = """\"\"\"\
Plexus-generated FastAPI serving application (scikit-learn).
Run: uvicorn app:app --host 0.0.0.0 --port 8000
\"\"\"
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from joblib import load

app = FastAPI(title="Plexus Model API")

# ---- Load model bundle ----
bundle = load("{model_path}")
model = bundle.get("model") if isinstance(bundle, dict) else bundle
preprocessor = bundle.get("preprocessor") if isinstance(bundle, dict) else None
feature_columns = bundle.get("feature_columns") if isinstance(bundle, dict) else []


class PredictRequest(BaseModel):
    rows: list  # list of dict rows


class PredictResponse(BaseModel):
    predictions: list
    probabilities: list | None


@app.get("/health")
def health():
    return {{"status": "ok"}}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    frame = pd.DataFrame(req.rows)
    if feature_columns:
        frame = frame[feature_columns]
    X = preprocessor.transform(frame) if preprocessor is not None else frame
    predictions = model.predict(X)
    probabilities = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)
    return PredictResponse(
        predictions=predictions.tolist(),
        probabilities=probabilities.tolist() if probabilities is not None else None,
    )
"""


class DeploymentAgent(BaseAgent):
    """Generates deployment boilerplate for a trained Keras/PyTorch model."""

    def __init__(self) -> None:
        super().__init__(
            name="deployment_agent",
            description=(
                "Generates a FastAPI serving endpoint, Dockerfile, and requirements.txt "
                "for deploying a trained model."
            ),
        )

    async def run(self, inputs: Dict[str, Any]) -> AgentResult:
        """
        Expected inputs
        ---------------
        framework    : str  – "tensorflow" | "pytorch"
        model_path   : str  – path/name to load the saved model (optional)
        input_shape  : list – e.g. [784] or [28, 28, 1]
        output_units : int  – number of output classes / regression targets
        task_type    : str  – "classification" | "regression"
        """
        framework: str = inputs.get("framework", "tensorflow").lower()
        model_path: str = inputs.get("model_path", "model.h5")
        input_shape: List[int] = inputs.get("input_shape", [784])
        output_units: int = int(inputs.get("output_units", 1))
        task_type: str = inputs.get("task_type", "classification")

        if framework == "tensorflow":
            framework_import = "tensorflow as tf"
            load_model_code = f'tf.keras.models.load_model("{model_path}")'
            predict_code = self._tf_predict_code(task_type, output_units)
            requirements = _TF_REQUIREMENTS
        elif framework == "pytorch":
            framework_import = "torch"
            load_model_code = (
                f'torch.load("{model_path}", map_location="cpu")'
            )
            predict_code = self._torch_predict_code(task_type, output_units)
            requirements = _TORCH_REQUIREMENTS
        elif framework in ("sklearn", "scikit-learn"):
            app_code = _SKLEARN_TEMPLATE.format(model_path=model_path)
            readme = self._generate_readme("sklearn", model_path, input_shape)
            return self._ok({
                "files": {
                    "app.py": app_code,
                    "Dockerfile": _DOCKERFILE_TEMPLATE,
                    "requirements.txt": _SKLEARN_REQUIREMENTS,
                    "README.md": readme,
                },
                "summary": (
                    "Generated FastAPI serving code for a scikit-learn model. "
                    "Build with `docker build -t plexus-model .` and run with `docker run -p 8000:8000 plexus-model`."
                ),
            })
        else:
            return self._fail(f"Unsupported framework: {framework!r}. Use 'tensorflow' or 'pytorch'.")

        app_code = _FASTAPI_TEMPLATE.format(
            framework_import=framework_import,
            load_model_code=load_model_code,
            predict_code=predict_code,
        )

        readme = self._generate_readme(framework, model_path, input_shape)

        return self._ok({
            "files": {
                "app.py": app_code,
                "Dockerfile": _DOCKERFILE_TEMPLATE,
                "requirements.txt": requirements,
                "README.md": readme,
            },
            "summary": (
                f"Generated FastAPI serving code for a {framework} model. "
                f"Build with `docker build -t plexus-model .` and run with `docker run -p 8000:8000 plexus-model`."
            ),
        })

    @staticmethod
    def _tf_predict_code(task_type: str, output_units: int) -> str:
        if task_type == "classification" and output_units > 1:
            return (
                "raw = model.predict(x)\n"
                "    probabilities = raw[0].tolist() if hasattr(raw[0], 'tolist') else list(raw[0])\n"
                "    predictions = [int(np.argmax(raw[0]))]"
            )
        return (
            "raw = model.predict(x)\n"
            "    probabilities = raw[0].tolist() if hasattr(raw[0], 'tolist') else list(raw[0])\n"
            "    predictions = raw[0].tolist() if hasattr(raw[0], 'tolist') else list(raw[0])"
        )

    @staticmethod
    def _torch_predict_code(task_type: str, output_units: int) -> str:
        if task_type == "classification" and output_units > 1:
            return (
                "model.eval()\n"
                "    with torch.no_grad():\n"
                "        tensor = torch.tensor(x)\n"
                "        logits = model(tensor)\n"
                "        probs = torch.softmax(logits, dim=-1)\n"
                "    probabilities = probs[0].tolist()\n"
                "    predictions = [int(torch.argmax(probs[0]))]"
            )
        return (
            "model.eval()\n"
            "    with torch.no_grad():\n"
            "        tensor = torch.tensor(x)\n"
            "        out = model(tensor)\n"
            "    probabilities = out[0].tolist()\n"
            "    predictions = out[0].tolist()"
        )

    @staticmethod
    def _generate_readme(framework: str, model_path: str, input_shape: List[int]) -> str:
        shape_str = " × ".join(str(s) for s in input_shape)
        return f"""# Plexus Model Deployment

## Quick Start

```bash
# Build Docker image
docker build -t plexus-model .

# Run container
docker run -p 8000:8000 plexus-model
```

## API Endpoints

- `GET  /health`       – health check
- `POST /predict`      – run inference

### Example request

```bash
curl -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{{"inputs": [0.5, 0.3, ...]}}'  # {shape_str} features
```

## Model Details

- Framework: {framework}
- Model file: `{model_path}`
- Input shape: ({shape_str})
"""
