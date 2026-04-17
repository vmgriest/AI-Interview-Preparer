#!/bin/bash
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python -m venv venv
fi

source venv/Scripts/activate 2>/dev/null || source venv/bin/activate

echo "Installing dependencies..."
pip install -q -r requirements.txt

cd ..
echo "Starting backend on http://localhost:8000"
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
