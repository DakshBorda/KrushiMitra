import React, { useState, useEffect, useRef, useCallback } from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import logo from "../../img/logo.png";
import { useSelector, useDispatch } from "react-redux";
import { getLogoutAction } from "../../redux/actions";
import Cookies from "js-cookie";
import { getUnreadCount, getNotifications, markNotificationRead, markAllNotificationsRead } from "../../api/notificationAPI";
import { getChatUnreadCount } from "../../api/chatAPI";

// images
import userIcon from "../../img/user_icon.svg";

// ── Notification type → icon + color mapping (no emoji) ──
const NOTIF_ICONS = {
  new_booking_request: { icon: "fa-file-lines", color: "#3b82f6" },
  booking_accepted: { icon: "fa-circle-check", color: "#22c55e" },
  booking_rejected: { icon: "fa-circle-xmark", color: "#ef4444" },
  booking_auto_rejected: { icon: "fa-rotate", color: "#f97316" },
  booking_expired: { icon: "fa-hourglass-end", color: "#6b7280" },
  booking_cancelled: { icon: "fa-ban", color: "#78716c" },
  booking_cancelled_by_owner: { icon: "fa-rectangle-xmark", color: "#dc2626" },
  booking_inprogress: { icon: "fa-truck", color: "#eab308" },
  booking_completed: { icon: "fa-flag-checkered", color: "#2563eb" },
};

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.authReducer);
  const isLoggedIn = !!Cookies.get("refresh-token");

  const [show, setShow] = useState(false);

  // ── Notification state ──
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  // ── Poll unread counts every 30 seconds ──
  const fetchUnreadCount = useCallback(async () => {
    if (!Cookies.get("access-token")) return;
    try {
      const [notifRes, chatRes] = await Promise.allSettled([
        getUnreadCount(),
        getChatUnreadCount(),
      ]);
      if (notifRes.status === "fulfilled" && notifRes.value?.data?.unread_count !== undefined) {
        setUnreadCount(notifRes.value.data.unread_count);
      }
      if (chatRes.status === "fulfilled" && chatRes.value?.data?.unread_count !== undefined) {
        setChatUnreadCount(chatRes.value.data.unread_count);
      }
    } catch (err) {
      // Silently fail — polling
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, fetchUnreadCount]);

  // ── Fetch notifications when panel opens ──
  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await getNotifications();
      if (res?.data?.results) {
        setNotifications(res.data.results.slice(0, 10));
      } else if (Array.isArray(res?.data)) {
        setNotifications(res.data.slice(0, 10));
      }
    } catch (err) {
      console.log("Error fetching notifications", err);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!showNotifPanel) {
      fetchNotifications();
    }
    setShowNotifPanel(!showNotifPanel);
  };

  // ── Close panel when clicking outside ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Mark single notification as read and navigate ──
  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    setShowNotifPanel(false);
    if (notif.booking_pk) {
      navigate(`/bookingRequest/${notif.booking_pk}`);
    }
  };

  // ── Mark all as read ──
  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="km-header inPhone">
      <div className="km-header-inner">
        <div className="km-header-brand" onClick={() => navigate("/")}>
          <img
            src={logo}
            className="logoWeb"
            alt="KrushiMitra"
          />
          <span className="km-brand-text"><span style={{color: '#219653'}}>Krushi</span><span style={{color: '#1a472a'}}>Mitra</span></span>
        </div>
        <nav className="km-header-nav">
          <ul>
            <li onClick={() => navigate("/")}>Home</li>
            <li onClick={() => navigate("/dashboard")}>Browse</li>
            {isLoggedIn && (
              <li onClick={() => navigate("/addProduct")}>List Equipment</li>
            )}
            {isLoggedIn && (
              <li onClick={() => navigate("/my-equipment")}>My Equipment</li>
            )}
            <li onClick={() => navigate("/help")}>Help</li>
          </ul>
        </nav>
        {!isLoggedIn ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="hover:bg-[#219653] bg-white border-2 transition-all duration-200 border-[#219653] text-[#219653] hover:text-white font-semibold py-2 px-7 rounded-lg text-[15px]"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="bg-[#219653] hover:bg-[#1a7a42] border-2 transition-all duration-200 border-[#219653] hover:border-[#1a7a42] text-white font-semibold py-2 px-7 rounded-lg text-[15px]"
            >
              Sign Up
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* ══════════════════════════════════════ */}
            {/*  NOTIFICATION BELL                    */}
            {/* ══════════════════════════════════════ */}
            <div className="notif-bell-wrapper" ref={notifRef}>
              <button
                className="notif-bell-btn"
                onClick={handleBellClick}
                title="Notifications"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#555"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="notif-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* ── Notification Dropdown Panel ── */}
              {showNotifPanel && (
                <div className="notif-panel">
                  <div className="notif-panel-header">
                    <h3 className="notif-panel-title">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        className="notif-mark-all-btn"
                        onClick={handleMarkAllRead}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="notif-panel-list">
                    {notifLoading ? (
                      <div className="notif-empty">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="notif-empty">
                        <i className="fa-solid fa-bell-slash" style={{ fontSize: '28px', color: '#d1d5db' }}></i>
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const typeInfo = NOTIF_ICONS[notif.notification_type] || {
                          icon: "fa-bell",
                          color: "#999",
                        };
                        return (
                          <div
                            key={notif.id}
                            className={`notif-item ${!notif.is_read ? "notif-unread" : ""}`}
                            onClick={() => handleNotifClick(notif)}
                          >
                            <div
                              className="notif-icon"
                              style={{ backgroundColor: typeInfo.color + "18" }}
                            >
                              <span><i className={`fa-solid ${typeInfo.icon}`} style={{ color: typeInfo.color, fontSize: '14px' }}></i></span>
                            </div>
                            <div className="notif-content">
                              <p className="notif-item-title">{notif.title}</p>
                              <p className="notif-item-msg">
                                {notif.message.length > 80
                                  ? notif.message.substring(0, 80) + "..."
                                  : notif.message}
                              </p>
                              <span className="notif-time">{notif.time_ago}</span>
                            </div>
                            {!notif.is_read && <div className="notif-dot" />}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="notif-panel-footer">
                    <button
                      onClick={() => {
                        setShowNotifPanel(false);
                        navigate("/notifications");
                      }}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════ */}
            {/*  USER PROFILE DROPDOWN                */}
            {/* ══════════════════════════════════════ */}
            <div
              onMouseOver={() => setShow(true)}
              onMouseLeave={() => setShow(false)}
              className="my-auto"
            >
              <div className="bg-gray-200 relative rounded-full py-1 px-4 my-auto text-gray-700 flex items-center z-40 hover:bg-gray-300 mr-5 cursor-pointer">
                <img
                  className="rounded-full w-8 h-8 mr-3 object-cover"
                  src={
                    authState?.user?.data?.profile_picture
                      ? (authState.user.data.profile_picture.startsWith("http")
                          ? authState.user.data.profile_picture
                          : `http://127.0.0.1:8000${authState.user.data.profile_picture}`)
                      : userIcon
                  }
                  alt="profile_pic"
                />
                <p className="text-lg font-semibold">
                  {"Hi, " + (authState?.user?.data?.first_name || "User")}
                </p>
              </div>
              {show && (
                <div
                  onMouseOver={() => setShow(true)}
                  onMouseLeave={() => setShow(false)}
                  className="absolute bg-white rounded-lg z-40 border-2 border-slate-400 p-1"
                >
                  <p
                    onClick={() => navigate("/update-profile")}
                    className="px-5 text-gray-600 py-2 bg-white cursor-pointer border-solid border-b border-slate-400 hover:bg-gray-200"
                  >
                    Profile
                  </p>
                  <p
                    onClick={() => navigate("/booking-history")}
                    className="px-5 text-gray-600 py-2 bg-white cursor-pointer border-solid border-b border-slate-400 hover:bg-gray-200"
                  >
                    Booking History
                  </p>
                  <p
                    onClick={() => navigate("/notifications")}
                    className="px-5 text-gray-600 py-2 bg-white cursor-pointer border-solid border-b border-slate-400 hover:bg-gray-200"
                  >
                    Notifications
                    {unreadCount > 0 && (
                      <span style={{
                        marginLeft: '8px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '1px 7px',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </p>
                  <p
                    onClick={() => navigate("/chat")}
                    className="px-5 text-gray-600 py-2 bg-white cursor-pointer border-solid border-b border-slate-400 hover:bg-gray-200"
                  >
                    Messages
                    {chatUnreadCount > 0 && (
                      <span style={{
                        marginLeft: '8px',
                        background: '#68AC5D',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '1px 7px',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}>
                        {chatUnreadCount}
                      </span>
                    )}
                  </p>
                  <p
                    onClick={() => {
                      Cookies.remove("access-token");
                      Cookies.remove("refresh-token");
                      Cookies.remove("uuid");
                      localStorage.removeItem("isLoggedIn");
                      dispatch(getLogoutAction());
                      navigate("/login");
                    }}
                    className="px-5 text-gray-600 py-2 bg-white cursor-pointer border-solid border-slate-400 hover:bg-gray-200"
                  >
                    Logout
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
