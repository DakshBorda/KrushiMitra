// import axios from "axios";
import instance from "./config";
// import Cookies from "js-cookie";

export const getProfile = async ({ uuid, accessToken }) => {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  try {
    const res = await instance.get(`/users/${uuid}/`, { headers });
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err.response?.data?.msg);
  }
};
