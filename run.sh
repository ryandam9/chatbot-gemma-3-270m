#!/bin/bash

# Chatbot Application Startup Script

echo "🤖 Starting AI Chatbot Application..."
echo "=================================="

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    uv venv --python 3.12
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Install/upgrade pip
echo "📚 Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📥 Installing dependencies..."
uv pip install -r requirements.txt


# Check if the model needs to be downloaded
echo "🧠 Checking model availability..."
python -c "from transformers import AutoTokenizer; AutoTokenizer.from_pretrained('google/gemma-3-270m-it')" 2>/dev/null || {
    echo "⏬ Downloading model (this may take a while on first run)..."
}

# Start the server
echo "=================================="
echo "🚀 Starting FastAPI server..."
echo "📍 Open your browser at: http://localhost:8000"
echo "📖 API documentation at: http://localhost:8000/docs"
echo "=================================="

# Run the FastAPI server with reload enabled for development
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
