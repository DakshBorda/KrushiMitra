import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import Cookies from "js-cookie";
import "../../pages/auth.css";

import logo from "../../img/logo.png";
import { verifyOtp, verifyOtpLogin, resendOtpSignup, resendOtpLogin } from "../../api/authAPI";
import { getProfile } from "../../api/profileAPI";
import {
  getLoginAction,
  getSaveTokenAction,
  getSaveProfileAction
} from "../../redux/actions";

/** Safe message from API error */
function getErrorMessage(err) {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") {
    if (err.trim().startsWith("<")) return "Server error. Please try again later.";
    return err;
  }
  return err?.msg || err?.message || "Something went wrong. Please try again.";
}

const STORAGE_KEYS = { signup: "otp_phone_number", login: "login_otp_phone" };
const RESEND_COOLDOWN = 30;
const OTP_LENGTH = 6;

const VerifyOTP = () => {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [phone_number, setPhoneNumber] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [otpError, setOtpError] = useState(false);

  const inputRefs = useRef([]);
  const timerRef = useRef(null);
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
    setResendCooldown(RESEND_COOLDOWN);
    // Focus first digit
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [navigate, storageKey, isLoginFlow]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      timerRef.current = setTimeout(() => {
        setResendCooldown((c) => c - 1);
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [resendCooldown]);

  // Mask phone number
  const maskedPhone = phone_number
    ? phone_number.slice(0, 2) + "****" + phone_number.slice(-4)
    : "";

  // ── Digit Input Handlers ──
  const handleDigitChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    setOtpError(false);
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-advance to next box
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (value && index === OTP_LENGTH - 1) {
      const fullOtp = newDigits.join("");
      if (fullOtp.length === OTP_LENGTH) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    setOtpError(false);
    if (pasted.length === OTP_LENGTH) {
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      handleVerify(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  // ── Resend OTP ──
  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0 || resending || !phone_number) return;
    setResending(true);
    setResendMessage("");
    setError(false);
    setErrorMessage("");
    try {
      const resendFn = isLoginFlow ? resendOtpLogin : resendOtpSignup;
      await resendFn({ phone_number });
      setResendMessage("OTP resent successfully!");
      setResendCooldown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("blocked")) {
        setResendMessage("Too many attempts. Please wait a moment.");
      } else {
        setResendMessage("Failed to resend OTP. Try again.");
      }
    } finally {
      setResending(false);
    }
  }, [resendCooldown, resending, phone_number, isLoginFlow]);

  // ── Verify OTP ──
  async function handleVerify(otpCode) {
    const otp = otpCode || digits.join("");
    setErrorMessage("");
    setError(false);
    setResendMessage("");

    if (!phone_number) {
      setError(true);
      setErrorMessage(isLoginFlow ? "Session expired. Please login again." : "Session expired. Please register again.");
      return;
    }
    if (otp.length < OTP_LENGTH) {
      setError(true);
      setErrorMessage("Please enter the complete OTP.");
      return;
    }

    setLoading(true);
    try {
      const apiCall = isLoginFlow ? verifyOtpLogin : verifyOtp;
      const data = await apiCall({ phone_number, otp });
      if (data.success) {
        setSuccess(true);
        sessionStorage.removeItem(storageKey);
        if (isLoginFlow) {
          const tokens = data.data?.tokens || {};
          const uuid = data.data?.uuid;
          Cookies.set("access-token", tokens.access, {
            path: "/", expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
          Cookies.set("refresh-token", tokens.refresh, {
            path: "/", expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
          Cookies.set("uuid", uuid, {
            path: "/", expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
          localStorage.setItem("isLoggedIn", true);
          dispatch(getLoginAction());
          dispatch(getSaveTokenAction({ accessToken: tokens.access, refreshToken: tokens.refresh }));
          try {
            const profileData = await getProfile({ uuid, accessToken: tokens.access });
            dispatch(getSaveProfileAction(profileData));
          } catch (_e) {
            dispatch(getSaveProfileAction(data));
          }
        }
        setTimeout(() => {
          navigate(isLoginFlow ? "/" : "/login", { replace: true });
        }, 1500);
      } else {
        setDigits(Array(OTP_LENGTH).fill(""));
        setOtpError(true);
        setError(true);
        setErrorMessage("Wrong OTP. Please try again.");
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setDigits(Array(OTP_LENGTH).fill(""));
      setOtpError(true);
      setError(true);
      setErrorMessage(getErrorMessage(err));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  if (!phone_number) return null;

  return (
    <div className="auth-page">
      {/* ── LEFT BRANDED PANEL ── */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <img src={logo} alt="KrushiMitra" className="auth-brand-logo" />
          <h1>Verify Identity</h1>
          <p>
            We've sent a verification code to your registered mobile number.
            Enter the code to {isLoginFlow ? "sign in" : "complete registration"}.
          </p>
          <div className="auth-brand-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="auth-form-panel">
        <div className="auth-form-card" style={{ textAlign: "center" }}>
          <button
            className="auth-close-btn"
            onClick={() => navigate(isLoginFlow ? "/login" : "/register")}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div style={{ marginBottom: 8 }}>
            <i className="fa-solid fa-shield-halved" style={{ fontSize: 48, color: "#219653", opacity: 0.8 }}></i>
          </div>
          <h2>Enter Verification Code</h2>
          <p className="auth-subtitle">
            We've sent a {OTP_LENGTH}-digit code to <strong>{maskedPhone}</strong>
          </p>

          {/* Messages */}
          {success && (
            <div className="auth-message success">
              <i className="fa-solid fa-circle-check"></i>
              <span>OTP verified successfully! Redirecting...</span>
            </div>
          )}
          {error && errorMessage && (
            <div className="auth-message error">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ── OTP Digit Boxes ── */}
          <div className="otp-digits" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                className={`otp-digit ${digit ? "filled" : ""} ${otpError ? "error" : ""}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading || success}
                aria-label={`Digit ${i + 1}`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            className="auth-btn auth-btn-primary"
            onClick={() => handleVerify()}
            disabled={loading || success || digits.join("").length < OTP_LENGTH}
            style={{ marginBottom: 20 }}
          >
            {loading ? (
              <><span className="auth-spinner"></span> Verifying...</>
            ) : success ? (
              <><i className="fa-solid fa-check"></i> Verified!</>
            ) : (
              "Verify OTP"
            )}
          </button>

          {/* ── Resend Section ── */}
          <div className="auth-timer">
            <p style={{ color: "#6b7280", marginBottom: 8 }}>Didn&apos;t receive the code?</p>
            {resendCooldown > 0 ? (
              <p>Resend available in <strong>{resendCooldown}s</strong></p>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="auth-timer-btn"
              >
                {resending ? "Sending..." : "Resend OTP"}
              </button>
            )}
            {resendMessage && (
              <p style={{
                fontSize: 12,
                marginTop: 8,
                fontWeight: 600,
                color: resendMessage.includes("success") ? "#16a34a" : "#f59e0b"
              }}>
                {resendMessage}
              </p>
            )}
          </div>

          {/* Back link */}
          <div className="auth-link-row">
            <Link to={isLoginFlow ? "/login" : "/register"}>
              <i className="fa-solid fa-arrow-left" style={{ marginRight: 4 }}></i>
              Back to {isLoginFlow ? "Login" : "Register"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
