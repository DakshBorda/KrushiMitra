import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../api/notificationAPI";
import usePolling from "../../utils/usePolling";
import "./Notifications.css";

// ── Notification type → icon + color mapping (no emoji) ──
const NOTIF_META = {
  new_booking_request: { icon: "fa-file-lines", color: "#3b82f6", bg: "#eff6ff", label: "New Request" },
  booking_accepted: { icon: "fa-circle-check", color: "#22c55e", bg: "#f0fdf4", label: "Confirmed" },
  booking_rejected: { icon: "fa-circle-xmark", color: "#ef4444", bg: "#fef2f2", label: "Declined" },
  booking_auto_rejected: { icon: "fa-rotate", color: "#f97316", bg: "#fff7ed", label: "Auto-Declined" },
  booking_expired: { icon: "fa-hourglass-end", color: "#6b7280", bg: "#f9fafb", label: "Expired" },
  booking_cancelled: { icon: "fa-ban", color: "#78716c", bg: "#fafaf9", label: "Cancelled" },
  booking_cancelled_by_owner: { icon: "fa-rectangle-xmark", color: "#dc2626", bg: "#fef2f2", label: "Owner Cancelled" },
  booking_inprogress: { icon: "fa-truck", color: "#eab308", bg: "#fefce8", label: "In Progress" },
  booking_completed: { icon: "fa-flag-checkered", color: "#2563eb", bg: "#eff6ff", label: "Completed" },
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'unread', 'read'

  useEffect(() => {
    if (!Cookies.get("access-token")) {
      navigate("/login");
      return;
    }
    fetchNotifications();
  }, [navigate]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      if (res?.data?.results) {
        setNotifications(res.data.results);
      } else if (Array.isArray(res?.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.log("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 15s with visibility API (pauses when tab hidden, instant on tab focus)
  usePolling(fetchNotifications, 15000, !!Cookies.get("access-token"));

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.booking_pk) {
      navigate(`/bookingRequest/${notif.booking_pk}`);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // ── Group notifications by date ──
  const groupByDate = (notifs) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = { Today: [], Yesterday: [], Earlier: [] };

    notifs.forEach((notif) => {
      const created = new Date(notif.created_at);
      created.setHours(0, 0, 0, 0);

      if (created.getTime() === today.getTime()) {
        groups.Today.push(notif);
      } else if (created.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(notif);
      } else {
        groups.Earlier.push(notif);
      }
    });

    return groups;
  };

  // ── Filter notifications ──
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const grouped = groupByDate(filteredNotifications);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="notif-page">
      <div className="notif-page-container">
        {/* ── Header ── */}
        <div className="notif-page-header">
          <div className="notif-page-header-left">
            <h1 className="notif-page-heading">
              <i className="fa-solid fa-bell notif-page-bell" style={{ color: '#68AC5D' }}></i> Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="notif-page-unread-badge">{unreadCount} unread</span>
            )}
          </div>
          <div className="notif-page-header-right">
            {unreadCount > 0 && (
              <button className="notif-page-mark-all" onClick={handleMarkAllRead}>
                <i className="fa-solid fa-check-double" style={{ marginRight: '4px' }}></i> Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="notif-page-filters">
          {["all", "unread", "read"].map((f) => (
            <button
              key={f}
              className={`notif-filter-tab ${filter === f ? "notif-filter-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "unread" && unreadCount > 0 && (
                <span className="notif-filter-count">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Notification List ── */}
        {loading ? (
          <div className="notif-page-empty">
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notif-page-empty">
            <i className="fa-solid fa-bell-slash" style={{ fontSize: "48px", color: "#d1d5db" }}></i>
            <h3>No notifications</h3>
            <p>
              {filter === "unread"
                ? "You're all caught up!"
                : filter === "read"
                ? "No read notifications yet."
                : "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateLabel, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={dateLabel} className="notif-date-group">
                <h2 className="notif-date-label">{dateLabel}</h2>
                <div className="notif-date-list">
                  {items.map((notif) => {
                    const meta = NOTIF_META[notif.notification_type] || {
                      icon: "fa-bell",
                      color: "#999",
                      bg: "#f9fafb",
                      label: "Notification",
                    };
                    return (
                      <div
                        key={notif.id}
                        className={`notif-page-card ${!notif.is_read ? "notif-page-card-unread" : ""}`}
                        onClick={() => handleNotifClick(notif)}
                      >
                        <div
                          className="notif-page-icon"
                          style={{ backgroundColor: meta.bg }}
                        >
                          <span><i className={`fa-solid ${meta.icon}`} style={{ color: meta.color, fontSize: '16px' }}></i></span>
                        </div>
                        <div className="notif-page-body">
                          <div className="notif-page-card-top">
                            <p className="notif-page-card-title">{notif.title}</p>
                            <span
                              className="notif-page-type-badge"
                              style={{ color: meta.color, backgroundColor: meta.bg }}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <p className="notif-page-card-msg">{notif.message}</p>
                          <div className="notif-page-card-bottom">
                            <span className="notif-page-time">{notif.time_ago}</span>
                            {notif.booking_display_id && (
                              <span className="notif-page-booking-id">
                                {notif.booking_display_id}
                              </span>
                            )}
                          </div>
                        </div>
                        {!notif.is_read && <div className="notif-page-dot" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
