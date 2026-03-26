import axios from "axios";
import Cookies from "js-cookie";
import { renewAccessToken } from "./authAPI";

const instance = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

/* ===============================
   REQUEST INTERCEPTOR
   =============================== */
instance.interceptors.request.use((config) => {
  const publicEndpoints = [
    "/users/login/email",
    "/users/login/otp",
    "/users/login/verify-otp",
    "/users/signup/",
    "/users/signup/verify-otp",
    "/api/token/refresh/",
  ];

  const url = config.url;

  // 🚫 DO NOT attach token to public endpoints
  if (publicEndpoints.some((endpoint) => url.startsWith(endpoint))) {
    delete config.headers.Authorization;
    return config;
  }

  // ✅ Attach token for protected APIs
  const accessToken = Cookies.get("access-token");
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

/* ===============================
   RESPONSE INTERCEPTOR
   =============================== */
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const refreshToken = Cookies.get("refresh-token");

    // 🚫 Do NOT refresh if refresh token does not exist
    if (status === 401 && refreshToken) {
      try {
        const token = await renewAccessToken();
        Cookies.set("access-token", token.access);

        error.config.headers.Authorization = `Bearer ${token.access}`;
        error.config.baseURL = undefined;

        return axios.request(error.config);
      } catch (err) {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
