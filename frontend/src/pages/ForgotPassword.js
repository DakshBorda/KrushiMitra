import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./auth.css";
import logo from "../img/logo.png";
import {
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
} from "../api/authAPI";
import { isEmail, isEmpty, isValidPassword, isMatch } from "../utils/validation";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

/** Password strength */
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

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password, 4=success
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState(false);

  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const strength = getPasswordStrength(newPassword);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ── Step 1: Request OTP ──
  async function handleRequestOTP(e) {
    e.preventDefault();
    setError(false);
    setMessage("");
    setSuccess(false);

    if (isEmpty(email)) {
      setError(true); setMessage("Please enter your email address.");
      return;
    }
    if (!isEmail(email)) {
      setError(true); setMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetOTP({ email });
      if (res.success) {
        setStep(2);
        setResendCooldown(RESEND_COOLDOWN);
        setSuccess(true);
        setMessage(res.message || "Reset code sent to your email.");
        setTimeout(() => inputRefs.current[0]?.focus(), 200);
      }
    } catch (err) {
      setError(true);
      setMessage(
        typeof err === "string" ? err :
        err?.email?.[0] || err?.msg || err?.message || "Failed to send reset code."
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify OTP ──
  async function handleVerifyOTP(otpCode) {
    const otp = otpCode || digits.join("");
    setError(false);
    setMessage("");
    setSuccess(false);

    if (otp.length < OTP_LENGTH) {
      setError(true); setMessage("Please enter the complete code.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPasswordResetOTP({ email, otp });
      if (res.success) {
        setResetToken(res.data?.reset_token);
        setStep(3);
        setSuccess(true);
        setMessage("Code verified. Enter your new password.");
      }
    } catch (err) {
      setOtpError(true);
      setDigits(Array(OTP_LENGTH).fill(""));
      setError(true);
      setMessage(
        typeof err === "string" ? err :
        err?.non_field_errors?.[0] || err?.msg || err?.message || "Invalid or expired code."
      );
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Reset Password ──
  async function handleResetPassword(e) {
    e.preventDefault();
    setError(false);
    setMessage("");
    setSuccess(false);

    if (isEmpty(newPassword)) {
      setError(true); setMessage("Please enter a new password.");
      return;
    }
    if (!isValidPassword(newPassword)) {
      setError(true); setMessage("Password must be at least 8 characters with letters and numbers.");
      return;
    }
    if (!isMatch(newPassword, confirmPassword)) {
      setError(true); setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({
        email,
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      if (res.success) {
        setStep(4);
        setSuccess(true);
        setMessage(res.message || "Password reset successfully!");
      }
    } catch (err) {
      setError(true);
      setMessage(
        typeof err === "string" ? err :
        err?.non_field_errors?.[0] || err?.msg || err?.message || "Failed to reset password."
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Resend OTP ──
  async function handleResend() {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(false);
    setMessage("");
    try {
      await requestPasswordResetOTP({ email });
      setResendCooldown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      setSuccess(true);
      setMessage("New reset code sent to your email.");
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(true);
      setMessage("Failed to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Digit Input Handlers ──
  const handleDigitChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    setOtpError(false);
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (value && index === OTP_LENGTH - 1) {
      const fullOtp = newDigits.join("");
      if (fullOtp.length === OTP_LENGTH) handleVerifyOTP(fullOtp);
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
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    setOtpError(false);
    if (pasted.length === OTP_LENGTH) {
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      handleVerifyOTP(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  // ── Step titles ──
  const stepTitles = {
    1: { icon: "fa-envelope-open-text", title: "Forgot Password", subtitle: "Enter your email to receive a reset code" },
    2: { icon: "fa-shield-halved", title: "Enter Reset Code", subtitle: `We've sent a ${OTP_LENGTH}-digit code to your email` },
    3: { icon: "fa-key", title: "Set New Password", subtitle: "Choose a strong password for your account" },
    4: { icon: "fa-circle-check", title: "Password Reset!", subtitle: "Your password has been successfully reset" },
  };
  const current = stepTitles[step];

  return (
    <div className="auth-page">
      {/* ── LEFT BRANDED PANEL ── */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <img src={logo} alt="KrushiMitra" className="auth-brand-logo" />
          <h1>Account Recovery</h1>
          <p>
            No worries — we'll help you reset your password securely via a
            verification code sent to your registered email.
          </p>
          <div className="auth-brand-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="auth-form-panel">
        <div className="auth-form-card" style={{ textAlign: step === 2 || step === 4 ? "center" : "left" }}>
          <button className="auth-close-btn" onClick={() => navigate("/login")} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>

          {/* Step indicator */}
          {step < 4 && (
            <div className="auth-steps" style={{ marginBottom: 24 }}>
              <div className={`auth-step-dot ${step >= 1 ? (step > 1 ? "completed" : "active") : ""}`}></div>
              <div className={`auth-step-line ${step > 1 ? "completed" : ""}`}></div>
              <div className={`auth-step-dot ${step >= 2 ? (step > 2 ? "completed" : "active") : ""}`}></div>
              <div className={`auth-step-line ${step > 2 ? "completed" : ""}`}></div>
              <div className={`auth-step-dot ${step >= 3 ? "active" : ""}`}></div>
            </div>
          )}

          <div style={{ marginBottom: 8, textAlign: "center" }}>
            <i className={`fa-solid ${current.icon}`} style={{ fontSize: step === 4 ? 56 : 44, color: step === 4 ? "#22c55e" : "#219653", opacity: 0.85 }}></i>
          </div>
          <h2 style={{ textAlign: "center" }}>{current.title}</h2>
          <p className="auth-subtitle" style={{ textAlign: "center" }}>{current.subtitle}</p>

          {/* Messages */}
          {success && message && step !== 4 && (
            <div className="auth-message success">
              <i className="fa-solid fa-circle-check"></i><span>{message}</span>
            </div>
          )}
          {error && message && (
            <div className="auth-message error">
              <i className="fa-solid fa-circle-exclamation"></i><span>{message}</span>
            </div>
          )}

          {/* ── STEP 1: Email Input ── */}
          {step === 1 && (
            <form onSubmit={handleRequestOTP} noValidate>
              <div className="auth-field">
                <label htmlFor="fp-email">Email Address <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-envelope auth-input-icon"></i>
                  <input
                    id="fp-email"
                    className="auth-input"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>
              <button className="auth-btn auth-btn-primary" type="submit" disabled={loading}>
                {loading ? (<><span className="auth-spinner"></span> Sending...</>) : (<>Send Reset Code <i className="fa-solid fa-paper-plane"></i></>)}
              </button>
              <div className="auth-link-row">
                <Link to="/login"><i className="fa-solid fa-arrow-left" style={{ marginRight: 4 }}></i> Back to Login</Link>
              </div>
            </form>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === 2 && (
            <div>
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
                    disabled={loading}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
              <button
                className="auth-btn auth-btn-primary"
                onClick={() => handleVerifyOTP()}
                disabled={loading || digits.join("").length < OTP_LENGTH}
                style={{ marginBottom: 20 }}
              >
                {loading ? (<><span className="auth-spinner"></span> Verifying...</>) : "Verify Code"}
              </button>
              <div className="auth-timer">
                <p>Didn&apos;t receive the code?</p>
                {resendCooldown > 0 ? (
                  <p>Resend in <strong>{resendCooldown}s</strong></p>
                ) : (
                  <button type="button" onClick={handleResend} disabled={loading} className="auth-timer-btn">
                    Resend Code
                  </button>
                )}
              </div>
              <div className="auth-link-row">
                <span className="auth-link" onClick={() => { setStep(1); setError(false); setMessage(""); setSuccess(false); }}>
                  <i className="fa-solid fa-arrow-left" style={{ marginRight: 4 }}></i> Change email
                </span>
              </div>
            </div>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} noValidate>
              <div className="auth-field">
                <label htmlFor="fp-new-password">New Password <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-lock auth-input-icon"></i>
                  <input
                    id="fp-new-password"
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters, letters & numbers"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button type="button" className="auth-pwd-toggle" onClick={() => setShowPassword(!showPassword)}>
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
                {strength && (
                  <div className="pwd-strength">
                    <div className="pwd-strength-bar"><div className={`pwd-strength-fill ${strength}`}></div></div>
                    <span className={`pwd-strength-label ${strength}`}>
                      {strength === "weak" ? "Weak" : strength === "medium" ? "Medium" : "Strong"}
                    </span>
                  </div>
                )}
              </div>
              <div className="auth-field">
                <label htmlFor="fp-confirm">Confirm Password <span className="required-star">*</span></label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-lock auth-input-icon"></i>
                  <input
                    id="fp-confirm"
                    className={`auth-input ${confirmPassword && !isMatch(newPassword, confirmPassword) ? "has-error" : ""}`}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" className="auth-pwd-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                    <i className={`fa-solid ${showConfirm ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
                {confirmPassword && !isMatch(newPassword, confirmPassword) && (
                  <div className="auth-field-error"><i className="fa-solid fa-circle-exclamation"></i> Passwords do not match</div>
                )}
              </div>
              <button className="auth-btn auth-btn-primary" type="submit" disabled={loading}>
                {loading ? (<><span className="auth-spinner"></span> Resetting...</>) : (<>Reset Password <i className="fa-solid fa-check"></i></>)}
              </button>
            </form>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 4 && (
            <div>
              <p style={{ color: "#16a34a", fontSize: 15, fontWeight: 600, marginBottom: 24 }}>
                {message || "Your password has been updated successfully."}
              </p>
              <button className="auth-btn auth-btn-primary" onClick={() => navigate("/login")}>
                <i className="fa-solid fa-right-to-bracket"></i> Continue to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
