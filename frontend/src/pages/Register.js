import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Cookies from "js-cookie";
import "./auth.css";

import { postRegisterData } from "../api/authAPI";
import { isEmail, isEmpty, isValidPassword, isPhoneNumber, isPincode, isMatch } from "../utils/validation";
import logo from "../img/logo.png";

/** Get display message from API error */
function getErrorMessage(err) {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") {
    if (err.trim().startsWith("<")) return "Server error. Please try again later.";
    return err;
  }
  if (err?.msg) return err.msg;
  if (typeof err?.detail === "string") return err.detail;
  if (typeof err?.message === "string") return err.message;

  const phoneErr = err?.phone_number?.[0];
  if (phoneErr) {
    if (typeof phoneErr === "string") {
      if (phoneErr.toLowerCase().includes("exists")) return "User already exists with this phone number.";
      return phoneErr;
    }
    return "User already exists with this phone number.";
  }
  const emailErr = err?.email?.[0];
  if (emailErr) {
    if (typeof emailErr === "string") {
      if (emailErr.toLowerCase().includes("exists")) return "User already exists with this email.";
      return emailErr;
    }
    return "User already exists with this email.";
  }
  try {
    const raw = JSON.stringify(err).toLowerCase();
    if (raw.includes("email already exists")) return "User already exists with this email.";
    if (raw.includes("phone number already exists") || raw.includes("user already exists"))
      return "User already exists with this phone number.";
  } catch (_e) {}
  return "Registration failed. Please try again.";
}

/** Password strength meter */
function getPasswordStrength(pwd) {
  if (!pwd || pwd.length < 4) return null;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

const STEP_LABELS = ["Personal Info", "Security", "Contact"];

const Register = () => {
  const [step, setStep] = useState(1);
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pin_code, setPincode] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (Cookies.get("refresh-token")) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const strength = getPasswordStrength(password);

  // ── Step validation ──
  function validateStep(s) {
    setError(false);
    setMessage("");

    if (s === 1) {
      if (isEmpty(first_name) || isEmpty(last_name)) {
        setError(true);
        setMessage("Please enter your first and last name.");
        return false;
      }
      if (email && !isEmail(email)) {
        setError(true);
        setMessage("Please enter a valid email address.");
        return false;
      }
      return true;
    }

    if (s === 2) {
      if (isEmpty(password)) {
        setError(true);
        setMessage("Please enter a password.");
        return false;
      }
      if (!isValidPassword(password)) {
        setError(true);
        setMessage("Password must be at least 8 characters with letters and numbers.");
        return false;
      }
      if (!isMatch(password, confirmPassword)) {
        setError(true);
        setMessage("Passwords do not match.");
        return false;
      }
      return true;
    }

    return true;
  }

  function nextStep() {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  }

  function prevStep() {
    setError(false);
    setMessage("");
    setStep(step - 1);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMessage("");
    setError(false);
    setSuccess(false);

    if (isEmpty(phone_number) || !isPhoneNumber(phone_number)) {
      setError(true);
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (isEmpty(pin_code) || !isPincode(pin_code)) {
      setError(true);
      setMessage("Please enter a valid 6-digit pincode.");
      return;
    }
    if (!agreeTerms) {
      setError(true);
      setMessage("Please agree to the Terms & Conditions.");
      return;
    }

    try {
      setLoading(true);
      const data = await postRegisterData({
        first_name,
        email,
        password,
        last_name,
        pin_code,
        phone_number
      });
      if (data.success && data.next === "VERIFY_OTP") {
        setSuccess(true);
        setError(false);
        setMessage("OTP sent to your mobile number for verification.");
        setLoading(false);
        sessionStorage.setItem("otp_phone_number", phone_number);
        navigate("/verify-otp", { replace: true });
      }
    } catch (err) {
      setLoading(false);
      setError(true);
      setMessage(getErrorMessage(err));
    }
  }

  return (
    <div className="auth-page">
      {/* ── LEFT BRANDED PANEL ── */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <img src={logo} alt="KrushiMitra" className="auth-brand-logo" />
          <h1>Join KrushiMitra</h1>
          <p>
            Create your free account to rent or list farm equipment.
            Trusted by farmers across India.
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

          <h2>Create Account</h2>
          <p className="auth-subtitle">
            Step {step} of 3 — {STEP_LABELS[step - 1]}
          </p>

          {/* Step indicator */}
          <div className="auth-steps">
            <div className={`auth-step-dot ${step >= 1 ? (step > 1 ? "completed" : "active") : ""}`}></div>
            <div className={`auth-step-line ${step > 1 ? "completed" : ""}`}></div>
            <div className={`auth-step-dot ${step >= 2 ? (step > 2 ? "completed" : "active") : ""}`}></div>
            <div className={`auth-step-line ${step > 2 ? "completed" : ""}`}></div>
            <div className={`auth-step-dot ${step >= 3 ? "active" : ""}`}></div>
          </div>

          {/* Messages */}
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

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <div>
              <div className="auth-field">
                <label htmlFor="reg-first-name">First Name <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-user auth-input-icon"></i>
                  <input
                    id="reg-first-name"
                    className="auth-input"
                    type="text"
                    placeholder="Enter your first name"
                    value={first_name}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="reg-last-name">Last Name <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-user auth-input-icon"></i>
                  <input
                    id="reg-last-name"
                    className="auth-input"
                    type="text"
                    placeholder="Enter your last name"
                    value={last_name}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="reg-email">Email Address</label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-envelope auth-input-icon"></i>
                  <input
                    id="reg-email"
                    className="auth-input"
                    type="email"
                    placeholder="you@example.com (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button type="button" className="auth-btn auth-btn-primary" onClick={nextStep}>
                Continue <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          )}

          {/* ── STEP 2: Security ── */}
          {step === 2 && (
            <div>
              <div className="auth-field">
                <label htmlFor="reg-password">Password <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-lock auth-input-icon"></i>
                  <input
                    id="reg-password"
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters, letters & numbers"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
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
                {strength && (
                  <div className="pwd-strength">
                    <div className="pwd-strength-bar">
                      <div className={`pwd-strength-fill ${strength}`}></div>
                    </div>
                    <span className={`pwd-strength-label ${strength}`}>
                      {strength === "weak" ? "Weak" : strength === "medium" ? "Medium" : "Strong"}
                    </span>
                  </div>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="reg-confirm">Confirm Password <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-lock auth-input-icon"></i>
                  <input
                    id="reg-confirm"
                    className={`auth-input ${confirmPassword && !isMatch(password, confirmPassword) ? "has-error" : ""}`}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-pwd-toggle"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label="Toggle password visibility"
                  >
                    <i className={`fa-solid ${showConfirm ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
                {confirmPassword && !isMatch(password, confirmPassword) && (
                  <div className="auth-field-error">
                    <i className="fa-solid fa-circle-exclamation"></i> Passwords do not match
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="auth-btn auth-btn-secondary" onClick={prevStep}>
                  <i className="fa-solid fa-arrow-left"></i> Back
                </button>
                <button type="button" className="auth-btn auth-btn-primary" onClick={nextStep}>
                  Continue <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Contact & Submit ── */}
          {step === 3 && (
            <form onSubmit={handleRegister} noValidate>
              <div className="auth-field">
                <label htmlFor="reg-phone">Mobile Number <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-phone auth-input-icon"></i>
                  <input
                    id="reg-phone"
                    className="auth-input"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone_number}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    autoComplete="tel"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="reg-pincode">Pincode <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-location-dot auth-input-icon"></i>
                  <input
                    id="reg-pincode"
                    className="auth-input"
                    type="text"
                    placeholder="6-digit area pincode"
                    value={pin_code}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="auth-checkbox">
                <input
                  type="checkbox"
                  id="reg-terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <label htmlFor="reg-terms">
                  I agree to the <a href="/policy" target="_blank" rel="noopener noreferrer">Terms & Conditions</a> and{" "}
                  <a href="/policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                </label>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="auth-btn auth-btn-secondary" onClick={prevStep}>
                  <i className="fa-solid fa-arrow-left"></i> Back
                </button>
                <button
                  className="auth-btn auth-btn-primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="auth-spinner"></span> Creating Account...</>
                  ) : (
                    <>Create Account <i className="fa-solid fa-user-plus"></i></>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── Footer link ── */}
          <div className="auth-link-row">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
