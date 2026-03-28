import instance from "./config";
import Cookies from "js-cookie";

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${Cookies.get("access-token")}`,
});

/**
 * Get all conversations for the current user.
 */
export const getConversations = async () => {
  try {
    const headers = getAuthHeaders();
    return await instance.get("/api/chat/conversations/", { headers });
  } catch (error) {
    console.log("Error while calling getConversations API", error);
    throw error;
  }
};

/**
 * Start or get a conversation with another user.
 * @param {number} userId - The other user's ID
 * @param {number|null} bookingId - Optional booking ID for context
 */
export const startConversation = async (userId, bookingId = null) => {
  try {
    const headers = getAuthHeaders();
    const body = { user_id: userId };
    if (bookingId) body.booking_id = bookingId;
    return await instance.post("/api/chat/conversations/start/", body, { headers });
  } catch (error) {
    console.log("Error while calling startConversation API", error);
    throw error;
  }
};

/**
 * Get all messages in a conversation.
 * @param {number} conversationId
 */
export const getMessages = async (conversationId) => {
  try {
    const headers = getAuthHeaders();
    return await instance.get(`/api/chat/conversations/${conversationId}/messages/`, { headers });
  } catch (error) {
    console.log("Error while calling getMessages API", error);
    throw error;
  }
};

/**
 * Send a message in a conversation (REST fallback).
 * @param {number} conversationId
 * @param {string} text
 */
export const sendMessage = async (conversationId, text) => {
  try {
    const headers = getAuthHeaders();
    return await instance.post(
      `/api/chat/conversations/${conversationId}/messages/send/`,
      { text },
      { headers }
    );
  } catch (error) {
    console.log("Error while calling sendMessage API", error);
    throw error;
  }
};

/**
 * Mark all messages in a conversation as read.
 * @param {number} conversationId
 */
export const markAsRead = async (conversationId) => {
  try {
    const headers = getAuthHeaders();
    return await instance.post(`/api/chat/conversations/${conversationId}/read/`, {}, { headers });
  } catch (error) {
    console.log("Error while calling markAsRead API", error);
  }
};

/**
 * Create a WebSocket connection for a conversation.
 * @param {number} conversationId
 * @param {function} onMessage - Callback when message is received
 * @param {function} onError - Callback on error
 * @returns {WebSocket}
 */
export const createChatWebSocket = (conversationId, onMessage, onError) => {
  const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${wsProtocol}://127.0.0.1:8000/ws/chat/${conversationId}/`;

  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "new_message" && data.message) {
        onMessage(data.message);
      }
    } catch (e) {
      console.log("WebSocket parse error:", e);
    }
  };

  ws.onerror = (error) => {
    console.log("WebSocket error:", error);
    if (onError) onError(error);
  };

  ws.onclose = () => {
    console.log("WebSocket closed for conversation", conversationId);
  };

  return ws;
};
