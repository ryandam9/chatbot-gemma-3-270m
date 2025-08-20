// Global variables
let sessionId = null;
let isTyping = false;
let messageHistory = [];

// DOM elements
const chatContainer = document.getElementById("chatContainer");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const clearChatBtn = document.getElementById("clearChat");
const newSessionBtn = document.getElementById("newSession");
const charCount = document.getElementById("charCount");
const sessionIdDisplay = document.getElementById("sessionId");
const loadingOverlay = document.getElementById("loadingOverlay");
const errorToast = document.getElementById("errorToast");
const errorMessage = document.getElementById("errorMessage");
const successToast = document.getElementById("successToast");
const successMessage = document.getElementById("successMessage");
const debugPanel = document.getElementById("debugPanel");
const debugPrompt = document.getElementById("debugPrompt");
const toggleDebugBtn = document.getElementById("toggleDebug");
const closeDebugBtn = document.getElementById("closeDebug");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initializeChat();
  setupEventListeners();
  adjustTextareaHeight();
});

// Initialize chat
function initializeChat() {
  // Check for existing session in localStorage
  const storedSessionId = localStorage.getItem("chatSessionId");
  if (storedSessionId) {
    sessionId = storedSessionId;
    loadChatHistory();
  }
  updateSessionDisplay();
}

// Setup event listeners
function setupEventListeners() {
  // Send button click
  sendButton.addEventListener("click", sendMessage);

  // Enter key to send (Shift+Enter for new line)
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Input changes
  messageInput.addEventListener("input", () => {
    updateCharCount();
    adjustTextareaHeight();
    validateInput();
  });

  // Clear chat button
  clearChatBtn.addEventListener("click", clearChat);

  // New session button
  newSessionBtn.addEventListener("click", startNewSession);

  // Suggested prompts
  document.querySelectorAll(".prompt-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      const prompt = e.target.dataset.prompt;
      messageInput.value = prompt;
      updateCharCount();
      validateInput();
      sendMessage();
    });
  });

  // Debug panel toggle
  toggleDebugBtn.addEventListener("click", toggleDebugPanel);
  closeDebugBtn.addEventListener("click", closeDebugPanel);
}

// Send message to API
async function sendMessage() {
  const message = messageInput.value.trim();

  if (!message || isTyping) return;

  try {
    isTyping = true;
    sendButton.disabled = true;

    // Remove welcome message if it exists
    const welcomeMessage = document.querySelector(".welcome-message");
    if (welcomeMessage) {
      welcomeMessage.remove();
    }

    // Add user message to chat
    addMessageToChat("user", message);

    // Clear input
    messageInput.value = "";
    updateCharCount();
    adjustTextareaHeight();
    validateInput();

    // Show typing indicator
    showTypingIndicator();

    // Send request to API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Update session ID if new
    if (!sessionId || sessionId !== data.session_id) {
      sessionId = data.session_id;
      localStorage.setItem("chatSessionId", sessionId);
      updateSessionDisplay();
    }

    // Remove typing indicator
    removeTypingIndicator();

    // Add AI response to chat
    addMessageToChat("assistant", data.response, data.timestamp);

    // Update debug panel with the last prompt if available
    if (data.last_prompt) {
      updateDebugPrompt(data.last_prompt);
    }

    // Store in history
    messageHistory.push(
      { role: "user", content: message },
      { role: "assistant", content: data.response },
    );
  } catch (error) {
    console.error("Error sending message:", error);
    removeTypingIndicator();
    showError("Failed to send message. Please try again.");
  } finally {
    isTyping = false;
    sendButton.disabled = false;
  }
}

// Add message to chat display
function addMessageToChat(role, content, timestamp = null) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;
  messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-${role === "user" ? "user" : "robot"}"></i>
        </div>
        <div class="message-content">
            ${formatMessage(content)}
            ${timestamp ? `<div class="message-timestamp">${formatTimestamp(timestamp)}</div>` : ""}
        </div>
    `;

  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

// Format message content (handle markdown, code blocks, etc.)
function formatMessage(content) {
  // Escape HTML
  let formatted = escapeHtml(content);

  // Convert markdown-style code blocks
  formatted = formatted.replace(
    /```([\s\S]*?)```/g,
    "<pre><code>$1</code></pre>",
  );

  // Convert inline code
  formatted = formatted.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Convert bold text
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Convert italic text
  formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Convert line breaks to paragraphs
  const paragraphs = formatted.split("\n\n");
  formatted = paragraphs
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return formatted;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Show typing indicator
function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "message assistant typing-message";
  typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
  chatContainer.appendChild(typingDiv);
  scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
  const typingMessage = document.querySelector(".typing-message");
  if (typingMessage) {
    typingMessage.remove();
  }
}

// Clear chat
async function clearChat() {
  if (!sessionId) {
    chatContainer.innerHTML = getWelcomeMessage();
    return;
  }

  if (!confirm("Are you sure you want to clear the chat history?")) {
    return;
  }

  try {
    showLoading();

    const response = await fetch(`/api/clear/${sessionId}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Clear UI
    chatContainer.innerHTML = getWelcomeMessage();
    messageHistory = [];

    showSuccess("Chat cleared successfully");
  } catch (error) {
    console.error("Error clearing chat:", error);
    showError("Failed to clear chat. Please try again.");
  } finally {
    hideLoading();
  }
}

// Start new session
function startNewSession() {
  if (!confirm("Start a new chat session? Current session will be saved.")) {
    return;
  }

  // Clear session
  sessionId = null;
  localStorage.removeItem("chatSessionId");
  messageHistory = [];

  // Clear UI
  chatContainer.innerHTML = getWelcomeMessage();
  updateSessionDisplay();

  showSuccess("New session started");
}

// Load chat history
async function loadChatHistory() {
  if (!sessionId) return;

  try {
    const response = await fetch(`/api/history/${sessionId}`);

    if (!response.ok) {
      if (response.status === 404) {
        // Session not found, start new
        sessionId = null;
        localStorage.removeItem("chatSessionId");
        updateSessionDisplay();
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.messages && data.messages.length > 0) {
      // Remove welcome message
      const welcomeMessage = document.querySelector(".welcome-message");
      if (welcomeMessage) {
        welcomeMessage.remove();
      }

      // Display history
      data.messages.forEach((msg) => {
        addMessageToChat(
          msg.role === "user" ? "user" : "assistant",
          msg.content,
        );
      });

      messageHistory = data.messages;
    }
  } catch (error) {
    console.error("Error loading history:", error);
  }
}

// Get welcome message HTML
function getWelcomeMessage() {
  return `
        <div class="welcome-message">
            <i class="fas fa-comments"></i>
            <h2>Welcome to AI Assistant</h2>
            <p>Start a conversation by typing a message below</p>
            <div class="suggested-prompts">
                <button class="prompt-chip" data-prompt="What can you help me with?">
                    What can you help me with?
                </button>
                <button class="prompt-chip" data-prompt="Tell me an interesting fact">
                    Tell me an interesting fact
                </button>
                <button class="prompt-chip" data-prompt="How does AI work?">
                    How does AI work?
                </button>
                <button class="prompt-chip" data-prompt="Write a short story">
                    Write a short story
                </button>
            </div>
        </div>
    `;
}

// Update session display
function updateSessionDisplay() {
  if (sessionId) {
    sessionIdDisplay.textContent = sessionId.substring(0, 8) + "...";
    sessionIdDisplay.title = sessionId;
  } else {
    sessionIdDisplay.textContent = "New";
    sessionIdDisplay.title = "No active session";
  }
}

// Update character count
function updateCharCount() {
  const count = messageInput.value.length;
  charCount.textContent = `${count} / 2000`;

  if (count > 1800) {
    charCount.style.color = "var(--warning)";
  } else if (count > 1900) {
    charCount.style.color = "var(--error)";
  } else {
    charCount.style.color = "var(--text-muted)";
  }
}

// Validate input
function validateInput() {
  const message = messageInput.value.trim();
  sendButton.disabled = !message || message.length === 0 || isTyping;
}

// Adjust textarea height
function adjustTextareaHeight() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
}

// Scroll to bottom of chat
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return "Just now";
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleString();
  }
}

// Show loading overlay
function showLoading() {
  loadingOverlay.classList.add("active");
}

// Hide loading overlay
function hideLoading() {
  loadingOverlay.classList.remove("active");
}

// Show error toast
function showError(message) {
  errorMessage.textContent = message;
  errorToast.classList.add("show");

  setTimeout(() => {
    errorToast.classList.remove("show");
  }, 5000);
}

// Hide error toast
function hideError() {
  errorToast.classList.remove("show");
}

// Show success toast
function showSuccess(message) {
  successMessage.textContent = message;
  successToast.classList.add("show");

  setTimeout(() => {
    successToast.classList.remove("show");
  }, 3000);
}

// Toggle debug panel
function toggleDebugPanel() {
  debugPanel.classList.toggle("active");
  toggleDebugBtn.classList.toggle("active");
}

// Close debug panel
function closeDebugPanel() {
  debugPanel.classList.remove("active");
  toggleDebugBtn.classList.remove("active");
}

// Update debug prompt display
function updateDebugPrompt(prompt) {
  // First escape HTML to prevent XSS
  let formattedPrompt = prompt.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Split by lines to process each line
  const lines = formattedPrompt.split("\n");
  const processedLines = lines.map((line) => {
    // Highlight start_of_turn tokens with role
    if (line.includes("&lt;start_of_turn&gt;user")) {
      return (
        '<span class="prompt-line prompt-line-user">' +
        line.replace(
          /&lt;start_of_turn&gt;user/g,
          '<span class="token token-user">&lt;start_of_turn&gt;</span><span class="role role-user">user</span>',
        ) +
        "</span>"
      );
    } else if (line.includes("&lt;start_of_turn&gt;model")) {
      return (
        '<span class="prompt-line prompt-line-model">' +
        line.replace(
          /&lt;start_of_turn&gt;model/g,
          '<span class="token token-model">&lt;start_of_turn&gt;</span><span class="role role-model">model</span>',
        ) +
        "</span>"
      );
    } else if (line.includes("&lt;end_of_turn&gt;")) {
      return line.replace(
        /&lt;end_of_turn&gt;/g,
        '<span class="token token-end">&lt;end_of_turn&gt;</span>',
      );
    } else if (line.includes("&lt;start_of_turn&gt;")) {
      // Generic start_of_turn without role
      return line.replace(
        /&lt;start_of_turn&gt;/g,
        '<span class="token token-start">&lt;start_of_turn&gt;</span>',
      );
    }
    return line;
  });

  formattedPrompt = processedLines.join("\n");

  debugPrompt.innerHTML = formattedPrompt;

  // Add a subtle animation to indicate update
  debugPrompt.classList.add("updated");
  setTimeout(() => {
    debugPrompt.classList.remove("updated");
  }, 300);
}

// Re-attach event listeners for dynamically added elements
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("prompt-chip")) {
    const prompt = e.target.dataset.prompt;
    messageInput.value = prompt;
    updateCharCount();
    validateInput();
    sendMessage();
  }
});
