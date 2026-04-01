// import axios from "axios";
import instance from "./config";
import Cookies from "js-cookie";

export const getBooking = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get("/api/booking/", { headers });
  } catch (error) {
    console.log("Error while calling getBookings API", error);
    throw error;
  }
};

export const getBookingOwner = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get("/api/booking/request/", { headers });
  } catch (error) {
    console.log("Error while calling getBookings API", error);
    throw error;
  }
};

export const createBooking = async (equipment, start_date, end_date) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.post(
      "/api/booking/create/",
      {
        equipment,
        start_date,
        end_date,
      },
      { headers }
    );
  } catch (error) {
    console.log("Error while calling createBooking API", error);
    throw error;
  }
};

export const getBookingDetail = async (id) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get(`/api/booking/detail/${id}/`, { headers });
  } catch (error) {
    console.log("Error while calling getBookingDetail API", error);
    throw error;
  }
};

export const BookingListRequest = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Cookies.get("access-token")}`,
    };
    return await instance.get("/api/booking/request/", { headers });
  } catch (error) {
    console.log("Error while calling BookingListRequest API", error);
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
    console.log("Error while calling BookingUpdate API", error);
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
    console.log("Error while calling getBlockedDates API", error);
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
    console.log("Error while calling getOwnerStats API", error);
    return null;
  }
};
