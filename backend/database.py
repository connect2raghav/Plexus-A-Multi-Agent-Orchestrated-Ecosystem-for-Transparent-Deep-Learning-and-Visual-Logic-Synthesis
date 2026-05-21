from typing import Any, Dict, List, Optional

from sqlalchemy import create_engine, Column, String, JSON, Integer, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.resolve()
DB_FILE = BASE_DIR / "plexus.db"

engine = create_engine(f"sqlite:///{DB_FILE.as_posix()}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBDataset(Base):
    __tablename__ = "datasets"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    size_bytes = Column(Integer)
    path = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    columns = Column(JSON, default=list)
    numeric_columns = Column(JSON, default=list)
    categorical_columns = Column(JSON, default=list)
    target_column = Column(String, nullable=True)
    row_count = Column(Integer, default=0)
    summary_stats = Column(JSON, default=dict)
    preprocessing_suggestions = Column(JSON, default=list)

class DBJob(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, index=True)
    dataset_id = Column(String)
    status = Column(String, default="created")
    metrics = Column(JSON, default=dict)
    architecture = Column(JSON, default=list)

class DBState(Base):
    __tablename__ = "state_records"
    id = Column(String, primary_key=True, index=True)
    kind = Column(String, index=True)
    payload = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base.metadata.create_all(bind=engine)

def list_state(kind: str) -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        return [row.payload for row in db.query(DBState).filter(DBState.kind == kind).all()]
    finally:
        db.close()

def get_state(kind: str, record_id: str) -> Optional[Dict[str, Any]]:
    db = SessionLocal()
    try:
        row = (
            db.query(DBState)
            .filter(DBState.kind == kind, DBState.id == f"{kind}:{record_id}")
            .first()
        )
        return row.payload if row else None
    finally:
        db.close()

def set_state(kind: str, record_id: str, payload: Dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        state_id = f"{kind}:{record_id}"
        row = db.query(DBState).filter(DBState.id == state_id).first()
        if not row:
            row = DBState(id=state_id, kind=kind)
            db.add(row)
        row.payload = payload
        row.updated_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()

def delete_state(kind: str, record_id: str) -> None:
    db = SessionLocal()
    try:
        row = (
            db.query(DBState)
            .filter(DBState.kind == kind, DBState.id == f"{kind}:{record_id}")
            .first()
        )
        if row:
            db.delete(row)
            db.commit()
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
