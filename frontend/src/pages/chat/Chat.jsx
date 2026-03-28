import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Cookies from "js-cookie";
import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  markAsRead,
  createChatWebSocket,
} from "../../api/chatAPI";
import "./Chat.css";

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const authState = useSelector((state) => state.authReducer);
  const currentUserId = authState?.user?.data?.id || authState?.user?.id || 0;

  // Redirect if not logged in
  useEffect(() => {
    if (!Cookies.get("access-token")) {
      navigate("/login");
    }
  }, [navigate]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Handle incoming query params (start conversation from product page)
  useEffect(() => {
    const userId = searchParams.get("userId");
    const bookingId = searchParams.get("bookingId");
    if (userId) {
      handleStartConversation(parseInt(userId, 10), bookingId ? parseInt(bookingId, 10) : null);
    }
  }, [searchParams]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection management
  useEffect(() => {
    if (!activeConversation) return;

    // Close previous WebSocket
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Create new WebSocket
    wsRef.current = createChatWebSocket(
      activeConversation.id,
      (message) => {
        // Only add if it's from the other user (our messages are added locally)
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
        // Refresh conversation list for updated preview
        loadConversations();
      },
      () => {
         // WebSocket error — fall back to polling
        console.log("WebSocket unavailable, using polling fallback");
      }
    );

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [activeConversation?.id]);

  // Polling fallback — refresh messages every 5s if WebSocket isn't connected
  useEffect(() => {
    if (!activeConversation) return;

    const interval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        loadMessages(activeConversation.id, true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeConversation?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      setConversations(res?.data || []);
    } catch (err) {
      console.log("Error loading conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      const res = await getMessages(conversationId);
      setMessages(res?.data || []);
    } catch (err) {
      console.log("Error loading messages:", err);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation);
    await loadMessages(conversation.id);
    await markAsRead(conversation.id);
    // Update unread count in sidebar
    setConversations((prev) =>
      prev.map((c) => (c.id === conversation.id ? { ...c, unread_count: 0 } : c))
    );
  };

  const handleStartConversation = async (userId, bookingId = null) => {
    try {
      const res = await startConversation(userId, bookingId);
      const conversation = res?.data;
      if (conversation) {
        await loadConversations();
        setActiveConversation(conversation);
        await loadMessages(conversation.id);
      }
    } catch (err) {
      console.log("Error starting conversation:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = newMessage.trim();
    if (!text || !activeConversation || sending) return;

    setSending(true);
    setNewMessage("");

    try {
      // Send via WebSocket if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ text }));
      }
      // Also send via REST as backup (the consumer handles dedup)
      const res = await sendMessage(activeConversation.id, text);
      if (res?.data) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === res.data.id);
          if (exists) return prev;
          return [...prev, res.data];
        });
      }
      loadConversations();
    } catch (err) {
      console.log("Error sending message:", err);
      setNewMessage(text); // Restore message on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (isYesterday) {
      return "Yesterday " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (firstName, lastName) => {
    return ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-loading">
          <div className="chat-loading-spinner"></div>
          <p>Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Sidebar — Conversation List */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>💬 Messages</h2>
        </div>
        <div className="chat-sidebar-list">
          {conversations.length === 0 ? (
            <div className="chat-empty-sidebar">
              <p>No conversations yet</p>
              <span>Visit an equipment page and click "Chat with Owner" to start</span>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`chat-sidebar-item ${activeConversation?.id === conv.id ? "active" : ""}`}
                onClick={() => handleSelectConversation(conv)}
              >
                <div className="chat-avatar">
                  {getInitials(conv.other_user?.first_name, conv.other_user?.last_name)}
                </div>
                <div className="chat-sidebar-item-info">
                  <div className="chat-sidebar-item-top">
                    <span className="chat-sidebar-name">
                      {conv.other_user?.first_name || "User"} {conv.other_user?.last_name || ""}
                    </span>
                    {conv.last_message && (
                      <span className="chat-sidebar-time">
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="chat-sidebar-item-bottom">
                    <p className="chat-sidebar-preview">
                      {conv.last_message?.text || "No messages yet"}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="chat-unread-badge">{conv.unread_count}</span>
                    )}
                  </div>
                  {conv.equipment_title && (
                    <span className="chat-sidebar-equipment">🚜 {conv.equipment_title}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {!activeConversation ? (
          <div className="chat-no-selection">
            <div className="chat-no-selection-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose from your existing conversations or start a new one from an equipment page</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-main-header">
              <div className="chat-header-user">
                <div className="chat-avatar chat-avatar-sm">
                  {getInitials(
                    activeConversation.other_user?.first_name,
                    activeConversation.other_user?.last_name
                  )}
                </div>
                <div>
                  <h3>
                    {activeConversation.other_user?.first_name || "User"}{" "}
                    {activeConversation.other_user?.last_name || ""}
                  </h3>
                  {activeConversation.equipment_title && (
                    <span className="chat-header-equipment">
                      🚜 {activeConversation.equipment_title}
                      {activeConversation.booking_id && ` • Booking #${activeConversation.booking_id}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messagesLoading ? (
                <div className="chat-loading">
                  <div className="chat-loading-spinner"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-no-messages">
                  <p>No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender === currentUserId;
                  const showDateSep =
                    idx === 0 ||
                    new Date(msg.created_at).toDateString() !==
                      new Date(messages[idx - 1].created_at).toDateString();

                  return (
                    <React.Fragment key={msg.id || idx}>
                      {showDateSep && (
                        <div className="chat-date-separator">
                          <span>
                            {new Date(msg.created_at).toLocaleDateString([], {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      <div className={`chat-message ${isMine ? "chat-message-mine" : "chat-message-theirs"}`}>
                        <div className="chat-bubble">
                          <p>{msg.text}</p>
                          <span className="chat-message-time">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {isMine && (
                              <span className="chat-read-status">
                                {msg.is_read ? " ✓✓" : " ✓"}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <textarea
                className="chat-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={1}
                disabled={sending}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!newMessage.trim() || sending}
              >
                {sending ? "..." : "Send"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
