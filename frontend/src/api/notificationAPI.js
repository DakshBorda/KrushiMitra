import instance from "./config";
import Cookies from "js-cookie";

/**
 * Get the current user's notifications (paginated, newest first).
 */
export const getNotifications = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get("/api/notifications/", { headers });
  } catch (error) {
    console.log("Error while calling getNotifications API", error);
  }
};

/**
 * Get the unread notification count (lightweight, for polling).
 */
export const getUnreadCount = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get("/api/notifications/unread-count/", { headers });
  } catch (error) {
    console.log("Error while calling getUnreadCount API", error);
  }
};

/**
 * Mark a single notification as read.
 * @param {number} id - Notification primary key
 */
export const markNotificationRead = async (id) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.patch(`/api/notifications/${id}/read/`, {}, { headers });
  } catch (error) {
    console.log("Error while calling markNotificationRead API", error);
  }
};

/**
 * Mark all notifications as read.
 */
export const markAllNotificationsRead = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.post("/api/notifications/mark-all-read/", {}, { headers });
  } catch (error) {
    console.log("Error while calling markAllNotificationsRead API", error);
  }
};
