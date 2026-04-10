import instance from "./config";
import Cookies from "js-cookie";

/**
 * Get bookings where the current user is the CUSTOMER.
 */
export const getBooking = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get("/api/booking/", { headers });
  } catch (error) {
    console.error("Error fetching customer bookings:", error);
    throw error;
  }
};

/**
 * Get bookings where the current user is the EQUIPMENT OWNER.
 */
export const getBookingOwner = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get("/api/booking/request/", { headers });
  } catch (error) {
    console.error("Error fetching owner bookings:", error);
    throw error;
  }
};

/**
 * Create a new booking request.
 * @param {number} equipment - Equipment ID
 * @param {string} start_date - ISO date string (YYYY-MM-DD)
 * @param {string} end_date - ISO date string (YYYY-MM-DD)
 */
export const createBooking = async (equipment, start_date, end_date) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.post(
      "/api/booking/create/",
      { equipment, start_date, end_date },
      { headers }
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

/**
 * Get detailed booking information by booking PK.
 * @param {number} id - Booking primary key
 */
export const getBookingDetail = async (id) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get(`/api/booking/detail/${id}/`, { headers });
  } catch (error) {
    console.error("Error fetching booking detail:", error);
    throw error;
  }
};

/**
 * Update booking status with optional rejection/cancellation data.
 *
 * @param {string} status - New status (Accepted, Rejected, Cancelled, CancelledByOwner, Inprogress, Completed)
 * @param {number} id - Booking primary key
 * @param {object} extras - Optional extra fields:
 *   - rejection_reason (int) - Required when status is "Rejected"
 *   - rejection_note (string) - Optional note for rejection
 *   - owner_cancellation_reason (int) - Required when status is "CancelledByOwner"
 *   - owner_cancellation_note (string) - Optional note for owner cancellation
 */
export const BookingUpdate = async (status, id, extras = {}) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.patch(
      `/api/booking/update/${id}/`,
      { status, ...extras },
      { headers }
    );
  } catch (error) {
    console.error("Error updating booking:", error);
    throw error;
  }
};

/**
 * Get blocked dates for a specific equipment.
 * Returns date ranges of Accepted/Inprogress bookings.
 * Public endpoint — no auth required.
 * @param {number} equipmentId
 * @returns {Array<{start_date: string, end_date: string, status: string}>}
 */
export const getBlockedDates = async (equipmentId) => {
  try {
    return await instance.get(`/api/booking/blocked-dates/${equipmentId}/`);
  } catch (error) {
    console.error("Error fetching blocked dates:", error);
    return { data: [] };
  }
};

/**
 * Get owner reliability metrics.
 * Public endpoint — no auth required.
 * @param {number} ownerId
 * @returns {{ total_bookings_received, response_rate, avg_response_hours, completion_rate }}
 */
export const getOwnerStats = async (ownerId) => {
  try {
    return await instance.get(`/api/booking/owner-stats/${ownerId}/`);
  } catch (error) {
    console.error("Error fetching owner stats:", error);
    return null;
  }
};
