import axios from "axios";
import instance from "./config";
import Cookies from "js-cookie";

// const url = "https://krushimitra-app.herokuapp.com";
const url = "http://127.0.0.1:8000";

/** Normalize API error - never pass raw HTML to UI (e.g. Django debug pages) */
function normalizeError(err) {
  const data = err?.response?.data;
  const contentType = err?.response?.headers?.["content-type"] || "";
  if (typeof data === "string" && (data.trim().startsWith("<") || contentType.includes("text/html"))) {
    return { msg: "Server error. Please try again later." };
  }
  if (data && typeof data === "object") return data;
  if (typeof data === "string") return { msg: data };
  return { msg: "Something went wrong. Please try again." };
}

export const postRegisterData = async ({
  first_name,
  email,
  password,
  last_name,
  pin_code,
  phone_number
}) => {
  try {
    const res = await axios.post(
  `${url}/users/signup/`,
  {
    first_name,
    last_name,
    email,
    password,
    pin_code: Number(pin_code),
    phone_number: String(phone_number)
  },
  {
    headers: { "Content-Type": "application/json" }
  }
);

    return res.data;
  } catch (err) {
    console.log(err.response?.data);
    throw normalizeError(err);
  }
};

export const postLoginDataEmail = async ({ email, password }) => {
  try {
    console.log(email, password);
    const res = await instance.post(`/users/login/email`, {
      email,
      password
    });
    return Promise.resolve(res.data);
  } catch (err) {
    console.log(err);
    return Promise.reject(normalizeError(err));
  }
};

export const postLoginDataPhone = async ({ phone_number }) => {
  try {
    const res = await axios.post(`${url}/users/login/otp`, {
      phone_number: String(phone_number) // ✅ MUST BE STRING
    });
    return res.data;
  } catch (err) {
    console.log(err.response?.data);
    throw normalizeError(err);
  }
};


export const verifyOtp = async ({ phone_number, otp }) => {
  try {
    const res = await axios.post(`${url}/users/signup/verify-otp`, {
      phone_number: String(phone_number),
      otp: String(otp).trim()  // Keep as string to preserve leading zeros (e.g. "0123")
    });
    return res.data;
  } catch (err) {
    console.log(err.response?.data);
    throw normalizeError(err);
  }
};


export const verifyOtpLogin = async ({ phone_number, otp }) => {
  try {
    const res = await axios.post(`${url}/users/login/verify-otp`, {
      phone_number: String(phone_number),
      otp: String(otp).trim()  // Keep as string to preserve leading zeros (e.g. "0123")
    });
    return res.data;
  } catch (err) {
    console.log(err.response?.data);
    throw normalizeError(err);
  }
};


export const renewAccessToken = async () => {
  const refresh_token = Cookies.get("refresh-token");
  try {
    const res = await axios.post(`${url}/api/token/refresh/`, {
      refresh: refresh_token
    });
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data?.msg);
  }
};

export const logoutUser = async () => {
  try {
    const res = await axios.get(`${url}/api/auth/logout`);
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data?.msg);
  }
};

export const forgotPassword = async (email) => {
  try {
    const res = await axios.post(`${url}/api/auth/forgot-password`, { email });
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data?.msg);
  }
};

export const resetPassword = async (password, accessToken) => {
  try {
    const res = await instance.post(
      `${url}/api/auth/reset-password`,
      { password },
      {
        headers: { Authorization: accessToken }
      }
    );
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data?.msg);
  }
};

export const updateProfile = async ({ formData, accessToken }) => {
  try {
    const uuid = Cookies.get("uuid");

    // Build FormData for multipart upload (supports files)
    const fd = new FormData();
    Object.keys(formData).forEach((key) => {
      const val = formData[key];
      // Skip empty strings and null/undefined but allow 0
      if (val === "" || val === null || val === undefined) return;
      fd.append(key, val);
    });

    const res = await instance.patch(`/users/${uuid}/`, fd, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Let browser set Content-Type with boundary for multipart
      },
    });
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data || { msg: "Update failed" });
  }
};

export const updatePassword = async (password, accessToken) => {
  try {
    const res = await instance.post(
      `${url}/api/auth/reset-password`,
      { password },
      {
        headers: { Authorization: accessToken }
      }
    );
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data?.msg);
  }
};

export const postDisputeData = async ({
  partner_id,
  email,
  name,
  phone_number,
  description,
  topic,
  equipment_id
}) => {
  try {
    const res = await axios.post(`${url}/enquiry/partner-dispute`, {
      partner_id,
      email,
      name,
      phone_number,
      description,
      topic,
      equipment_id
    });
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data?.msg);
  }
};

export const postCancellationData = async ({
  booking_id,
  cancel_reason,
  description,
  token
}) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    };
    const res = await instance.post(
      `${url}/enquiry/cancel-form`,
      {
        booking_id,
        cancel_reason,
        description
      },
      { headers }
    );
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data?.msg);
  }
};
