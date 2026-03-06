import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import Cookies from "js-cookie";

import InputField from "../input/InputField";
import logo from "../../img/logo.png";
import cross_black from "../../img/cross_black.svg";

import { verifyOtp, verifyOtpLogin } from "../../api/authAPI";
import {
  getLoginAction,
  getSaveTokenAction,
  getSaveProfileAction
} from "../../redux/actions";

/** Safe message from API error - never show raw HTML */
function getErrorMessage(err) {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") {
    if (err.trim().startsWith("<")) return "Server error. Please try again later.";
    return err;
  }
  return err?.msg || err?.message || "Something went wrong. Please try again.";
}

const STORAGE_KEYS = { signup: "otp_phone_number", login: "login_otp_phone" };

const VerifyOTP = () => {
  const [OTP, setOTP] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const isLoginFlow = location.pathname === "/login/verify-otp";
  const storageKey = isLoginFlow ? STORAGE_KEYS.login : STORAGE_KEYS.signup;

  useEffect(() => {
    const storedPhoneNumber = sessionStorage.getItem(storageKey);
    if (!storedPhoneNumber) {
      navigate(isLoginFlow ? "/login" : "/register", { replace: true });
      return;
    }
    setPhoneNumber(storedPhoneNumber);
  }, [navigate, storageKey, isLoginFlow]);


  async function verify(e) {
    e.preventDefault();
    setErrorMessage("");
    setError(false);
    if (!phone_number) {
      setError(true);
      setErrorMessage("Session expired. Please register again.");
      return;
    }
    if (!OTP || OTP.trim().length < 4) {
      setError(true);
      setErrorMessage("Please enter the OTP sent to your mobile.");
      return;
    }
    try {
      const apiCall = isLoginFlow ? verifyOtpLogin : verifyOtp;
      const data = await apiCall({ phone_number: phone_number, otp: OTP });
      if (data.success) {
        setSuccess(true);
        sessionStorage.removeItem(storageKey);
        if (isLoginFlow) {
          // Save tokens and user data for login (same as Login.js saveData)
          const tokens = data.data?.tokens || {};
          const uuid = data.data?.uuid;
          Cookies.set("access-token", tokens.access, {
            path: "/",
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
          Cookies.set("refresh-token", tokens.refresh, {
            path: "/",
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
          Cookies.set("uuid", uuid, {
            path: "/",
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
          localStorage.setItem("isLoggedIn", true);
          dispatch(getLoginAction());
          dispatch(getSaveTokenAction({
            accessToken: tokens.access,
            refreshToken: tokens.refresh
          }));
          dispatch(getSaveProfileAction(data));
        }
        setTimeout(() => {
          navigate(isLoginFlow ? "/" : "/login", { replace: true });
        }, 1500);
      } else {
        setOTP("");
        setError(true);
        setErrorMessage("Wrong OTP. Please try again.");
      }
    } catch (err) {
      setOTP("");
      setError(true);
      setErrorMessage(getErrorMessage(err));
    }
  }

  // Don't render if phone number is not available (will redirect)
  if (!phone_number) {
    return null;
  }

  const handleClose = () => {
    navigate(isLoginFlow ? "/login" : "/register");
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 min-h-screen w-full overflow-x-hidden overflow-y-auto box-border bg-[#219653]">
      <div className="absolute top-2 right-2 z-10">
        <img
          src={cross_black}
          className="cursor-pointer hover:opacity-90 bg-[#E5E5E5] rounded-full p-2 shadow-xl"
          alt="Close"
          onClick={handleClose}
        />
      </div>
      <div className="min-h-screen w-full flex justify-center items-center p-4 sm:p-9 box-border">
        <div
          className="w-full max-w-md relative bg-[#219653] box-border rounded-2xl"
          style={{
            paddingTop: "3rem",
            paddingBottom: "3rem",
            paddingLeft: "1.5rem",
            paddingRight: "1.5rem"
          }}
        >
          <div className="bg-white rounded-3xl drop-shadow-md p-6 sm:p-9 pt-3 relative">
            <form onSubmit={verify} className="flex flex-col relative">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <img
                  className="h-20 w-20 sm:h-24 sm:w-24 mx-auto"
                  style={{ filter: "drop-shadow(0px 4px 4px rgba(104, 172, 93, 0.25))" }}
                  src={logo}
                  alt="KrushiMitra"
                />
              </div>
              <h1 className="mb-5 text-center text-xl font-medium" style={{ marginTop: "3rem" }}>
                Enter the OTP sent to your Registered Number
              </h1>
            <InputField
              placeholder="OTP"
              value={OTP}
              onChange={(e) => setOTP(e.target.value)}
              type="text"
              inputMode="numeric"
              required={true}
            />
            <button
              className="px-6 py-2 mx-auto rounded-lg text-white text-lg font-semibold bg-[#219653] hover:opacity-90"
              type="submit"
            >
              Verify OTP
            </button>
            {success && (
              <p className="text-center text-green-400">
                OTP verified successfully!
              </p>
            )}
            {error && errorMessage && (
              <p className="text-center text-red-500 text-sm mt-2">
                {errorMessage}
              </p>
            )}
          </form>
            <p className="my-5 text-center text-sm">
              Didn&apos;t receive OTP?{" "}
              <Link to={isLoginFlow ? "/login" : "/register"} className="text-blue-600 underline">
                Back to {isLoginFlow ? "Login" : "Register"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
