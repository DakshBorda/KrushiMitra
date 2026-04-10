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
      otp: String(otp).trim()
    });
    return res.data;
  } catch (err) {
    console.log(err.response?.data);
    throw normalizeError(err);
  }
};

/** Resend OTP for signup — calls the signup endpoint which re-sends OTP to unverified users */
export const resendOtpSignup = async ({ phone_number }) => {
  try {
    const res = await axios.post(`${url}/users/signup/`, {
      phone_number: String(phone_number),
      // Send minimal data — backend will find existing unverified user and resend OTP
      first_name: "_",
      last_name: "_",
      password: "Temp1234!",
      pin_code: 100000,
    });
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
};

/** Resend OTP for login — calls the login/otp endpoint which triggers a new OTP */
export const resendOtpLogin = async ({ phone_number }) => {
  try {
    const res = await axios.post(`${url}/users/login/otp`, {
      phone_number: String(phone_number)
    });
    return res.data;
  } catch (err) {
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

export const updateProfile = async ({ formData, accessToken }) => {
  try {
    const uuid = Cookies.get("uuid");
    const fd = new FormData();
    Object.keys(formData).forEach((key) => {
      const val = formData[key];
      if (val === "" || val === null || val === undefined) return;
      fd.append(key, val);
    });
    const res = await instance.patch(`/users/${uuid}/`, fd, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data || { msg: "Update failed" });
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


// ═══════════════════════════════════════════════════════════
//  PASSWORD RESET API
// ═══════════════════════════════════════════════════════════

/** Step 1: Request a password reset OTP to be sent via email */
export const requestPasswordResetOTP = async ({ email }) => {
  try {
    const res = await axios.post(`${url}/users/forgot-password/request-otp`, {
      email: email.toLowerCase().trim(),
    });
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
};

/** Step 2: Verify the OTP sent to email */
export const verifyPasswordResetOTP = async ({ email, otp }) => {
  try {
    const res = await axios.post(`${url}/users/forgot-password/verify-otp`, {
      email: email.toLowerCase().trim(),
      otp: String(otp).trim(),
    });
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
};

/** Step 3: Set the new password using the reset token */
export const resetPassword = async ({ email, reset_token, new_password, confirm_password }) => {
  try {
    const res = await axios.post(`${url}/users/forgot-password/reset`, {
      email: email.toLowerCase().trim(),
      reset_token,
      new_password,
      confirm_password,
    });
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
};
