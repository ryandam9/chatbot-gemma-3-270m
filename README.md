# AI Chatbot Application

This is a wrapper application for https://ai.google.dev/gemma/docs/gemma_chat

A modern, responsive web-based chatbot application powered by Google's Gemma model with a FastAPI backend and interactive UI.

## Features

- 🤖 **AI-Powered Conversations**: Uses Google's Gemma-3-270m-it model for intelligent responses
- 💬 **Session Management**: Maintains conversation context across messages
- 🎨 **Modern UI**: Responsive, dark-themed interface with smooth animations
- 📝 **Message History**: Preserves chat history within sessions
- ⚡ **Real-time Interaction**: Fast response times with typing indicators
- 🔄 **Session Persistence**: Automatically saves and loads chat sessions
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## Prerequisites

- Python 3.8 or higher
- 4GB+ RAM recommended for model loading
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation

1. Clone or download this repository

2. Navigate to the chatbot directory:

   ```bash
   cd chatbot
   ```

3. Make the run script executable (Linux/Mac):

   ```bash
   chmod +x run.sh
   ```

4. Run the application:

   ```bash
   ./run.sh
   ```

   Or manually:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python server.py
   ```

## Usage

1. **Start the Server**: Run the application using the instructions above

2. **Access the Interface**: Open your browser and navigate to:
   - Main Application: `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`

3. **Start Chatting**:
   - Type your message in the input field
   - Press Enter or click the send button
   - The AI will respond with context-aware messages
   - Your conversation history is maintained throughout the session

4. **Session Management**:
   - **Clear Chat**: Remove all messages from the current session
   - **New Session**: Start a fresh conversation with a new session ID
   - Sessions are automatically saved and can be resumed

## Project Structure

```
chatbot/
├── app.py              # Core ChatState class and model interaction
├── server.py           # FastAPI backend server
├── requirements.txt    # Python dependencies
├── run.sh             # Startup script
├── README.md          # This file
├── static/            # Frontend assets
│   ├── styles.css     # Styling
│   └── script.js      # Client-side JavaScript
└── templates/         # HTML templates
    └── index.html     # Main chat interface
```

## API Endpoints

### Core Endpoints

- `GET /` - Main chat interface
- `POST /api/chat` - Send a message and receive AI response

  ```json
  {
    "message": "Your message here",
    "session_id": "optional-session-id"
  }
  ```

- `GET /api/history/{session_id}` - Retrieve chat history for a session
- `POST /api/clear/{session_id}` - Clear chat history for a session
- `GET /health` - Health check endpoint

### Response Format

```json
{
  "response": "AI generated response",
  "session_id": "uuid-session-id",
  "timestamp": "2024-01-01T12:00:00"
}
```

## Configuration

### Model Settings

The application uses the `google/gemma-3-270m-it` model by default. To change the model, edit the `server.py` file:

```python
chat_sessions[new_session_id] = ChatState(
    model_name="your-model-name-here",
    system=system_prompt
)
```

### Session Timeout

Sessions expire after 2 hours of inactivity. Modify `SESSION_TIMEOUT_HOURS` in `server.py` to change this.

### System Prompt

The AI's behavior can be customized by modifying the `system_prompt` in `server.py`.

## Troubleshooting

### Model Download Issues

- First run may take time to download the model (~500MB)
- Ensure stable internet connection
- Check available disk space

### Memory Issues

- The model requires ~2-3GB RAM
- Close other applications if needed
- Consider using a smaller model for limited resources

### Port Already in Use

- Change the port in `server.py`:
  ```python
  uvicorn.run(app, host="0.0.0.0", port=8001)  # Change 8000 to another port
  ```

### Session Not Persisting

- Check browser localStorage is enabled
- Clear browser cache if issues persist

## Development

### Running in Development Mode

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Adding New Features

1. **Backend Changes**: Modify `server.py` for new API endpoints
2. **Model Behavior**: Update `app.py` for different model interactions
3. **UI Updates**: Edit files in `static/` and `templates/`

### Testing

Test the API endpoints using the automatic documentation at `http://localhost:8000/docs`

## Security Considerations

- **Production Deployment**: Update CORS settings in `server.py`
- **API Keys**: If using cloud models, store API keys in environment variables
- **Rate Limiting**: Consider implementing rate limiting for production
- **HTTPS**: Use HTTPS in production environments

## Performance Tips

- **Model Caching**: The model is loaded once and reused across sessions
- **Session Cleanup**: Automatic cleanup removes inactive sessions
- **Response Streaming**: Consider implementing streaming for long responses
- **CDN**: Host static files on a CDN for production

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Google's Gemma model team
- FastAPI framework developers
- Transformers library by Hugging Face

---

**Note**: This is a development setup. For production deployment, consider using proper process managers (like systemd or supervisor), implementing proper logging, and adding security measures.
