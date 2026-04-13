import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiServer from "../../api/config";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

const Feedback = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // ── Client-side validation ──
  const validate = () => {
    const errs = {};

    if (!name.trim()) errs.name = "Name is required";
    else if (name.trim().length < 2) errs.name = "Name must be at least 2 characters";

    if (!phone_number.trim()) errs.phone_number = "Phone number is required";
    else if (!/^\d{10}$/.test(phone_number.trim())) errs.phone_number = "Enter a valid 10-digit phone number";

    if (!description.trim()) errs.description = "Please share your feedback";
    else if (description.trim().length < 10) errs.description = "Please provide more detail (at least 10 characters)";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (!validate()) return;

    setLoading(true);
    try {
      await apiServer.post("/enquiry/feedback", {
        name: name.trim(),
        phone_number: phone_number.trim(),
        description: `${category ? `[${category}] ` : ""}${rating ? `Rating: ${rating}/5 — ` : ""}${description.trim()}`,
      });
      setSuccess(true);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData && typeof errData === 'object') {
        const backendErrors = {};
        Object.entries(errData).forEach(([key, val]) => {
          backendErrors[key] = Array.isArray(val) ? val[0] : String(val);
        });
        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors(backendErrors);
          setError("Please fix the errors below.");
        } else {
          setError("Failed to submit feedback. Please try again.");
        }
      } else {
        setError("Failed to submit feedback. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "80vh", background: "#fafbfa" }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 50%, #60a5fa 100%)",
        padding: "52px 20px 70px 20px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "200px", height: "200px", borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}></div>
        <h1 style={{
          fontSize: "32px", fontWeight: 800, color: "#fff",
          margin: "0 0 8px 0",
        }}>
          <i className="fa-solid fa-comments" style={{ marginRight: "12px" }}></i>
          Share Your Feedback
        </h1>
        <p style={{
          fontSize: "15px", color: "rgba(255,255,255,0.85)",
          margin: 0, maxWidth: "460px", marginLeft: "auto", marginRight: "auto",
        }}>
          Your feedback helps us build a better experience for farmers across India
        </p>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: "580px", margin: "-36px auto 0 auto",
        padding: "0 20px 60px 20px", position: "relative", zIndex: 2,
      }}>
        {/* Success State */}
        {success ? (
          <div style={{
            background: "#fff", borderRadius: "16px",
            padding: "48px 32px", textAlign: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: "#ecfdf5", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px auto",
            }}>
              <i className="fa-solid fa-heart" style={{ fontSize: "32px", color: "#16a34a" }}></i>
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1f2937", margin: "0 0 8px 0" }}>
              Thank You!
            </h2>
            <p style={{ fontSize: "15px", color: "#6b7280", lineHeight: 1.6, margin: "0 0 24px 0" }}>
              Your feedback has been submitted. We truly appreciate you taking the time to help us improve.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                background: "linear-gradient(135deg, #68AC5D, #4a9c3f)",
                color: "#fff", border: "none", padding: "12px 32px",
                borderRadius: "10px", fontWeight: 700, cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div style={{
            background: "#fff", borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}>
            {/* Star Rating */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#374151", margin: "0 0 8px 0" }}>
                How would you rate your experience?
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "32px", padding: "2px",
                      color: star <= (hoverRating || rating) ? "#f59e0b" : "#e5e7eb",
                      transition: "color 0.15s ease, transform 0.15s ease",
                      transform: star <= (hoverRating || rating) ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    <i className="fa-solid fa-star"></i>
                  </button>
                ))}
              </div>
              {(hoverRating || rating) > 0 && (
                <p style={{
                  fontSize: "13px", color: "#f59e0b",
                  fontWeight: 600, margin: "6px 0 0 0",
                }}>
                  {RATING_LABELS[hoverRating || rating]}
                </p>
              )}
            </div>

            {/* Category Quick Tags */}
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                What's your feedback about?
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { label: "Booking", icon: "fa-calendar-check" },
                  { label: "Equipment", icon: "fa-tractor" },
                  { label: "App Design", icon: "fa-palette" },
                  { label: "Support", icon: "fa-headset" },
                  { label: "General", icon: "fa-star" },
                ].map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => setCategory(category === tag.label ? "" : tag.label)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "8px 14px", borderRadius: "8px",
                      border: category === tag.label ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                      background: category === tag.label ? "#eff6ff" : "#fff",
                      color: category === tag.label ? "#1d4ed8" : "#6b7280",
                      fontWeight: 600, fontSize: "12px", cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <i className={`fa-solid ${tag.icon}`} style={{ fontSize: "11px" }}></i>
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: "10px", padding: "12px 16px",
                marginBottom: "16px", fontSize: "14px",
                color: "#991b1b", fontWeight: 600,
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: "8px" }}></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Name <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text" value={name}
                    onChange={(e) => { setName(e.target.value); clearError('name'); }}
                    style={{ ...inputStyle, borderColor: fieldErrors.name ? '#ef4444' : '#e5e7eb' }}
                    placeholder="Your name"
                    id="feedback-name"
                  />
                  {fieldErrors.name && <span style={errorStyle}>{fieldErrors.name}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Phone Number <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text" value={phone_number}
                    onChange={(e) => { setPhoneNumber(e.target.value); clearError('phone_number'); }}
                    style={{ ...inputStyle, borderColor: fieldErrors.phone_number ? '#ef4444' : '#e5e7eb' }}
                    placeholder="10-digit number"
                    id="feedback-phone"
                    maxLength={10}
                  />
                  {fieldErrors.phone_number && <span style={errorStyle}>{fieldErrors.phone_number}</span>}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Your Feedback <span style={{ color: "#ef4444" }}>*</span></label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearError('description'); }}
                  rows={5}
                  id="feedback-description"
                  placeholder="Tell us what you liked, what could be improved, or any suggestions..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: "120px",
                    borderColor: fieldErrors.description ? '#ef4444' : '#e5e7eb',
                  }}
                />
                {fieldErrors.description && <span style={errorStyle}>{fieldErrors.description}</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  borderRadius: "12px",
                  border: "none",
                  background: loading ? "#9ca3af" : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
                  transition: "all 0.3s ease",
                }}
              >
                {loading ? "Submitting..." : (
                  <>
                    <i className="fa-solid fa-paper-plane" style={{ marginRight: "8px" }}></i>
                    Submit Feedback
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Help Link */}
        <div style={{
          textAlign: "center", marginTop: "20px",
          fontSize: "13px", color: "#9ca3af",
        }}>
          Having an issue instead? Visit our{" "}
          <span
            style={{ color: "#68AC5D", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => navigate("/help")}
          >Help Center</span>
          {" "}or{" "}
          <span
            style={{ color: "#68AC5D", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => navigate("/partner-dispute")}
          >raise a dispute</span>
        </div>
      </div>
    </div>
  );
};

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "10px",
  border: "2px solid #e5e7eb",
  fontSize: "14px",
  fontWeight: 500,
  color: "#1f2937",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
  transition: "border-color 0.2s ease",
};

const errorStyle = {
  display: "block",
  fontSize: "12px",
  color: "#ef4444",
  fontWeight: 600,
  marginTop: "4px",
};

export default Feedback;