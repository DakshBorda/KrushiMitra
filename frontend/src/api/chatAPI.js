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
 * @param {number|null} equipmentId - Optional equipment ID (from product page)
 */
export const startConversation = async (userId, bookingId = null, equipmentId = null) => {
  try {
    const headers = getAuthHeaders();
    const body = { user_id: userId };
    if (bookingId) body.booking_id = bookingId;
    if (equipmentId) body.equipment_id = equipmentId;
    return await instance.post("/api/chat/conversations/start/", body, { headers });
  } catch (error) {
    console.log("Error while calling startConversation API", error);
    throw error;
  }
};

/**
 * Get messages in a conversation (paginated).
 * @param {number} conversationId
 * @param {number|null} beforeId - Load messages older than this ID
 */
export const getMessages = async (conversationId, beforeId = null) => {
  try {
    const headers = getAuthHeaders();
    let url = `/api/chat/conversations/${conversationId}/messages/`;
    if (beforeId) url += `?before=${beforeId}`;
    return await instance.get(url, { headers });
  } catch (error) {
    console.log("Error while calling getMessages API", error);
    throw error;
  }
};

/**
 * Send a message in a conversation.
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
 * Get total unread chat message count (for header badge).
 */
export const getChatUnreadCount = async () => {
  try {
    const headers = getAuthHeaders();
    return await instance.get("/api/chat/unread-count/", { headers });
  } catch (error) {
    console.log("Error while calling getChatUnreadCount API", error);
  }
};

/**
 * Create a WebSocket connection for a conversation with auto-reconnection.
 * @param {number} conversationId
 * @param {function} onMessage - Callback when message is received
 * @param {function} onError - Callback on error
 * @returns {object} - { ws, close }
 */
export const createChatWebSocket = (conversationId, onMessage, onError) => {
  const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsHost = process.env.REACT_APP_WS_HOST || "127.0.0.1:8000";
  const token = Cookies.get("access-token");
  const wsUrl = `${wsProtocol}://${wsHost}/ws/chat/${conversationId}/?token=${token}`;

  let ws = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  let closed = false;

  const connect = () => {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      retryCount = 0; // Reset on successful connection
    };

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
    };

    ws.onclose = () => {
      if (closed) return; // Intentional close — don't reconnect

      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        retryCount++;
        console.log(`WebSocket reconnecting in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
        setTimeout(connect, delay);
      } else {
        console.log("WebSocket max retries reached, using polling fallback");
        if (onError) onError(new Error("WebSocket max retries reached"));
      }
    };
  };

  connect();

  // Return an object with close() for cleanup
  return {
    get ws() { return ws; },
    get readyState() { return ws ? ws.readyState : WebSocket.CLOSED; },
    close() {
      closed = true;
      if (ws) ws.close();
    },
  };
};
