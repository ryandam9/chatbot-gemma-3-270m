import asyncio
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app import ChatState
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str
    last_prompt: Optional[str] = None


class ChatHistory(BaseModel):
    messages: List[Dict[str, str]]
    session_id: str


# Store chat sessions in memory (in production, use Redis or a database)
chat_sessions: Dict[str, ChatState] = {}
session_timestamps: Dict[str, datetime] = {}

# Session timeout (in hours)
SESSION_TIMEOUT_HOURS = 2


async def cleanup_old_sessions():
    """Remove sessions that have been inactive for too long"""
    while True:
        current_time = datetime.now()
        sessions_to_remove = []

        for session_id, last_activity in session_timestamps.items():
            if current_time - last_activity > timedelta(hours=SESSION_TIMEOUT_HOURS):
                sessions_to_remove.append(session_id)

        for session_id in sessions_to_remove:
            if session_id in chat_sessions:
                del chat_sessions[session_id]
            if session_id in session_timestamps:
                del session_timestamps[session_id]

        if sessions_to_remove:
            print(f"Cleaned up {len(sessions_to_remove)} expired sessions")

        # Run cleanup every 30 minutes
        await asyncio.sleep(1800)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up chatbot server...")
    # Create a task for periodic cleanup
    cleanup_task = asyncio.create_task(cleanup_old_sessions())

    yield

    # Shutdown
    print("Shutting down chatbot server...")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


# Create FastAPI app with lifespan manager
app = FastAPI(
    title="Chatbot API",
    description="A conversational AI chatbot using Gemma model",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")


def get_or_create_session(session_id: Optional[str] = None) -> tuple[str, ChatState]:
    """Get existing session or create a new one"""
    if session_id and session_id in chat_sessions:
        # Update last activity timestamp
        session_timestamps[session_id] = datetime.now()
        return session_id, chat_sessions[session_id]

    # Create new session
    new_session_id = str(uuid.uuid4())
    system_prompt = """You are a helpful, friendly AI assistant.
    You provide clear, concise, and accurate responses to user queries.
    Be engaging and maintain context throughout the conversation."""

    chat_sessions[new_session_id] = ChatState(
        model_name="google/gemma-3-270m-it", system=system_prompt
    )
    session_timestamps[new_session_id] = datetime.now()

    return new_session_id, chat_sessions[new_session_id]


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Serve the main chat interface"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/chat", response_model=ChatResponse)
async def chat(chat_message: ChatMessage):
    """
    Process a chat message and return the AI response
    """
    try:
        # Get or create session
        session_id, chat_state = get_or_create_session(chat_message.session_id)

        # Generate response
        response = chat_state.send_message(chat_message.message)

        # Get the last prompt that was sent to the LLM
        last_prompt = chat_state.get_full_prompt()

        return ChatResponse(
            response=response,
            session_id=session_id,
            timestamp=datetime.now().isoformat(),
            last_prompt=last_prompt,
        )

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history/{session_id}", response_model=ChatHistory)
async def get_history(session_id: str):
    """
    Get the chat history for a specific session
    """
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    chat_state = chat_sessions[session_id]
    history = chat_state.history

    # Parse history into structured format
    messages = []
    for item in history:
        if item.startswith(ChatState.__START_TURN_USER__):
            content = item.replace(ChatState.__START_TURN_USER__, "").replace(
                ChatState.__END_TURN__, ""
            )
            messages.append({"role": "user", "content": content})
        elif item.startswith(ChatState.__START_TURN_MODEL__):
            content = item.replace(ChatState.__START_TURN_MODEL__, "")
            messages.append({"role": "assistant", "content": content})

    return ChatHistory(messages=messages, session_id=session_id)


@app.post("/api/clear/{session_id}")
async def clear_session(session_id: str):
    """
    Clear the chat history for a specific session
    """
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    # Recreate the session with fresh state
    system_prompt = """You are a helpful, friendly AI assistant.
    You provide clear, concise, and accurate responses to user queries.
    Be engaging and maintain context throughout the conversation."""

    chat_sessions[session_id] = ChatState(
        model_name="google/gemma-3-270m-it", system=system_prompt
    )
    session_timestamps[session_id] = datetime.now()

    return {"message": "Session cleared successfully", "session_id": session_id}


@app.get("/api/sessions/count")
async def get_active_sessions():
    """Get the count of active sessions (for monitoring)"""
    return {
        "active_sessions": len(chat_sessions),
        "total_sessions_created": len(session_timestamps),
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(chat_sessions),
    }
