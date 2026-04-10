import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import Cookies from "js-cookie";
import "./auth.css";

import { SuccessMsg, ErrorMsg } from "../components/alerts";
import {
  postLoginDataEmail,
  postLoginDataPhone
} from "../api/authAPI";
import { getProfile } from "../api/profileAPI";
import {
  getLoginAction,
  getSaveTokenAction,
  getSaveProfileAction
} from "../redux/actions";
import { isEmail, isEmpty, isPhoneNumber } from "../utils/validation";
import logo from "../img/logo.png";

/** Get display message from API error (never show raw HTML) */
function getErrorMessage(err) {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") {
    if (err.trim().startsWith("<")) return "Server error. Please try again later.";
    return err;
  }
  if (err?.msg) return err.msg;
  if (typeof err?.detail === "string") return err.detail;
  if (typeof err?.message === "string") return err.message;

  const emailErr = err?.email?.[0];
  if (emailErr) {
    if (typeof emailErr === "string") return emailErr;
    if (emailErr.msg) return emailErr.msg;
  }

  const pwdErr = err?.password?.[0];
  if (pwdErr) {
    if (typeof pwdErr === "string") return pwdErr;
    if (pwdErr.msg) return pwdErr.msg;
  }

  return "Invalid email or password";
}

const Login = () => {
  const [activeTab, setActiveTab] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone_number, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (Cookies.get("refresh-token")) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setMessage("");
    setError(false);
    if (isEmpty(email) || isEmpty(password)) {
      setError(true);
      setMessage("Please enter email and password.");
      return;
    }
    if (!isEmail(email)) {
      setError(true);
      setMessage("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const data2 = await postLoginDataEmail({ email, password });
      if (data2.success) {
        setLoading(false);
        setSuccess(true);
        setMessage(data2.message);
        saveData(data2);
      }
    } catch (err) {
      setLoading(false);
      setSuccess(false);
      setError(true);
      setMessage(getErrorMessage(err));
    }
  }

  async function handleLoginPhone(e) {
    e.preventDefault();
    setMessage("");
    setError(false);
    if (isEmpty(phone_number)) {
      setError(true);
      setMessage("Please enter your mobile number.");
      return;
    }
    if (!isPhoneNumber(phone_number)) {
      setError(true);
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const data = await postLoginDataPhone({ phone_number });
      if (data.success) {
        sessionStorage.setItem("login_otp_phone", phone_number);
        setLoading(false);
        navigate("/login/verify-otp", { replace: true });
      }
    } catch (err) {
      setSuccess(false);
      setLoading(false);
      setError(true);
      setMessage(getErrorMessage(err) || "Server issue. Try again later.");
    }
  }

  async function saveData(data) {
    setSuccess(data.success);
    setMessage(data.message);
    localStorage.setItem("isLoggedIn", true);
    Cookies.set("access-token", data.data.tokens.access, {
      path: "/",
      expires: new Date().setDate(new Date().getDate() + 1)
    });
    Cookies.set("refresh-token", data.data.tokens.refresh, {
      path: "/",
      expires: new Date().setDate(new Date().getDate() + 1)
    });
    Cookies.set("uuid", data.data.uuid, {
      path: "/",
      expires: new Date().setDate(new Date().getDate() + 1)
    });
    dispatch(getLoginAction());
    dispatch(
      getSaveTokenAction({
        accessToken: data.data.tokens.access,
        refreshToken: data.data.tokens.refresh
      })
    );

    try {
      const profileData = await getProfile({
        uuid: data.data.uuid,
        accessToken: data.data.tokens.access,
      });
      dispatch(getSaveProfileAction(profileData));
    } catch (err) {
      dispatch(getSaveProfileAction(data));
    }

    setLoading(false);
    navigate("/");
  }

  return (
    <div className="auth-page">
      {/* ── LEFT BRANDED PANEL ── */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <img src={logo} alt="KrushiMitra" className="auth-brand-logo" />
          <h1>KrushiMitra</h1>
          <p>
            India's trusted platform for renting farm equipment.
            Connect with equipment owners in your area and grow your harvest.
          </p>
          <div className="auth-brand-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          <button
            className="auth-close-btn"
            onClick={() => navigate("/")}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your account to continue</p>

          {/* Success/Error messages */}
          {success && message && (
            <div className="auth-message success">
              <i className="fa-solid fa-circle-check"></i>
              <span>{message}</span>
            </div>
          )}
          {error && message && (
            <div className="auth-message error">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{message}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${activeTab === "email" ? "active" : ""}`}
              onClick={() => { setActiveTab("email"); setError(false); setMessage(""); }}
            >
              <i className="fa-solid fa-envelope" style={{ marginRight: 6 }}></i>
              Email
            </button>
            <button
              className={`auth-tab ${activeTab === "phone" ? "active" : ""}`}
              onClick={() => { setActiveTab("phone"); setError(false); setMessage(""); }}
            >
              <i className="fa-solid fa-mobile-screen" style={{ marginRight: 6 }}></i>
              Mobile OTP
            </button>
          </div>

          {/* ── EMAIL LOGIN FORM ── */}
          {activeTab === "email" && (
            <form onSubmit={handleEmailLogin} noValidate>
              <div className="auth-field">
                <label htmlFor="login-email">
                  Email Address <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-envelope auth-input-icon"></i>
                  <input
                    id="login-email"
                    className="auth-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    aria-label="Email address"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="login-password">
                  Password <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-lock auth-input-icon"></i>
                  <input
                    id="login-password"
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    className="auth-pwd-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>

              <div className="auth-forgot-link">
                <Link to="/forgot-password" className="auth-link">Forgot Password?</Link>
              </div>

              <button
                className="auth-btn auth-btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <><span className="auth-spinner"></span> Signing in...</>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}

          {/* ── PHONE OTP LOGIN FORM ── */}
          {activeTab === "phone" && (
            <form onSubmit={handleLoginPhone} noValidate>
              <div className="auth-field">
                <label htmlFor="login-phone">
                  Mobile Number <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-phone auth-input-icon"></i>
                  <input
                    id="login-phone"
                    className="auth-input"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={phone_number}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    autoComplete="tel"
                    aria-label="Mobile number"
                    maxLength={10}
                  />
                </div>
              </div>

              {phone_number.length === 10 && (
                <p style={{ fontSize: 13, color: "#6b7280", margin: "-8px 0 16px", paddingLeft: 2 }}>
                  <i className="fa-solid fa-info-circle" style={{ marginRight: 4 }}></i>
                  An OTP will be sent to this number for verification.
                </p>
              )}

              <button
                className="auth-btn auth-btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <><span className="auth-spinner"></span> Sending OTP...</>
                ) : (
                  <>Send OTP <i className="fa-solid fa-arrow-right"></i></>
                )}
              </button>
            </form>
          )}

          {/* ── Footer link ── */}
          <div className="auth-link-row">
            Don&apos;t have an account?{" "}
            <Link to="/register">Create Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
