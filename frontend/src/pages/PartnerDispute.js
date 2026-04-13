import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import apiServer from "../api/config";

const PartnerDispute = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!Cookies.get("refresh-token");

  const [partner_id, setPartnerId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setFullName] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [description, setDescription] = useState("");
  const [equipment_id, setEquipmentId] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Client-side validation ──
  const validate = () => {
    const errs = {};

    if (!name.trim()) errs.name = "Name is required";
    else if (name.trim().length < 2) errs.name = "Name must be at least 2 characters";

    if (!phone_number.trim()) errs.phone_number = "Phone number is required";
    else if (!/^\d{10}$/.test(phone_number.trim())) errs.phone_number = "Enter a valid 10-digit phone number";

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Enter a valid email address";

    if (!topic) errs.topic = "Please select a dispute category";

    if (!description.trim()) errs.description = "Please describe the issue";
    else if (description.trim().length < 20) errs.description = "Please provide more detail (at least 20 characters)";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  async function submitDispute(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setMessage("");

    if (!validate()) return;

    setLoading(true);
    try {
      await apiServer.post('/enquiry/partner-dispute', {
        partner_id: partner_id.trim() || "N/A",
        email: email.trim() || null,
        name: name.trim(),
        phone_number: phone_number.trim(),
        description: description.trim(),
        topic: parseInt(topic, 10),
        equipment_id: equipment_id.trim() || "N/A",
      });
      setSuccess(true);
      setMessage("Your dispute has been submitted successfully. Our team will review it and get back to you within 48 hours.");
    } catch (err) {
      const errData = err?.response?.data;
      if (errData && typeof errData === 'object') {
        // Show field-level errors from backend
        const backendErrors = {};
        Object.entries(errData).forEach(([key, val]) => {
          backendErrors[key] = Array.isArray(val) ? val[0] : String(val);
        });
        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors(backendErrors);
          setError("Please fix the errors below.");
        } else {
          setError("Failed to submit dispute. Please try again.");
        }
      } else {
        setError("Failed to submit dispute. Please try again or contact us directly at krushimitra@gmail.com");
      }
    } finally {
      setLoading(false);
    }
  }

  // Clear field error on change
  const clearError = (field) => {
    setFieldErrors(prev => ({ ...prev, [field]: "" }));
  };

  return (
    <div style={{ minHeight: "80vh", background: "#fafbfa" }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #f87171 100%)",
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
          <i className="fa-solid fa-scale-balanced" style={{ marginRight: "12px" }}></i>
          Raise a Dispute
        </h1>
        <p style={{
          fontSize: "15px", color: "rgba(255,255,255,0.85)",
          margin: 0, maxWidth: "500px", marginLeft: "auto", marginRight: "auto",
        }}>
          Had an issue with an equipment owner or a transaction? Submit a formal complaint and our team will investigate.
        </p>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: "700px", margin: "-36px auto 0 auto",
        padding: "0 20px 60px 20px", position: "relative", zIndex: 2,
      }}>
        {/* Info Banner */}
        <div style={{
          background: "#fff", borderRadius: "14px",
          padding: "20px 24px", marginBottom: "20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
          display: "flex", gap: "14px", alignItems: "flex-start",
        }}>
          <i className="fa-solid fa-circle-info" style={{
            color: "#3b82f6", fontSize: "20px", marginTop: "2px", flexShrink: 0,
          }}></i>
          <div>
            <p style={{ fontSize: "14px", color: "#374151", fontWeight: 600, margin: "0 0 4px 0" }}>
              When should I raise a dispute?
            </p>
            <ul style={{
              fontSize: "13px", color: "#6b7280", margin: 0,
              paddingLeft: "16px", lineHeight: 1.7,
            }}>
              <li>Financial disagreements (overcharges, refund issues)</li>
              <li>Equipment not as described or damaged</li>
              <li>Breach of booking agreement</li>
              <li>Unresolved issues after contacting the owner</li>
            </ul>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "8px 0 0 0" }}>
              For general questions, visit our <span
                style={{ color: "#68AC5D", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => navigate("/help")}
              >Help Center</span> instead.
            </p>
          </div>
        </div>

        {/* Success State */}
        {success ? (
          <div style={{
            background: "#fff", borderRadius: "16px",
            padding: "40px 32px", textAlign: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "#ecfdf5", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px auto",
            }}>
              <i className="fa-solid fa-circle-check" style={{
                fontSize: "32px", color: "#16a34a",
              }}></i>
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2937", margin: "0 0 8px 0" }}>
              Dispute Submitted
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.6, margin: "0 0 24px 0" }}>
              {message}
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
          /* Form */
          <div style={{
            background: "#fff", borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}>
            <h2 style={{
              fontSize: "18px", fontWeight: 700, color: "#1f2937",
              margin: "0 0 4px 0",
            }}>
              Dispute Details
            </h2>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 24px 0" }}>
              Provide as much detail as possible so we can investigate effectively.
            </p>

            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: "10px", padding: "12px 16px",
                marginBottom: "20px", fontSize: "14px",
                color: "#991b1b", fontWeight: 600,
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: "8px" }}></i>
                {error}
              </div>
            )}

            <form onSubmit={submitDispute}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Your Name <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text" value={name}
                    onChange={(e) => { setFullName(e.target.value); clearError('name'); }}
                    style={{ ...inputStyle, borderColor: fieldErrors.name ? '#ef4444' : '#e5e7eb' }}
                    placeholder="Enter your full name"
                  />
                  {fieldErrors.name && <span style={errorStyle}>{fieldErrors.name}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Phone Number <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text" value={phone_number}
                    onChange={(e) => { setPhoneNumber(e.target.value); clearError('phone_number'); }}
                    style={{ ...inputStyle, borderColor: fieldErrors.phone_number ? '#ef4444' : '#e5e7eb' }}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                  {fieldErrors.phone_number && <span style={errorStyle}>{fieldErrors.phone_number}</span>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                    style={{ ...inputStyle, borderColor: fieldErrors.email ? '#ef4444' : '#e5e7eb' }}
                    placeholder="your@email.com"
                  />
                  {fieldErrors.email && <span style={errorStyle}>{fieldErrors.email}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Equipment Name</label>
                  <input
                    type="text" value={equipment_id}
                    onChange={(e) => setEquipmentId(e.target.value)}
                    style={inputStyle} placeholder="Name of the equipment involved"
                  />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Other Party (Name or Phone) </label>
                <input
                  type="text" value={partner_id}
                  onChange={(e) => setPartnerId(e.target.value)}
                  style={inputStyle} placeholder="Name or phone number of the other person"
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Dispute Category <span style={{ color: "#ef4444" }}>*</span></label>
                <select
                  value={topic}
                  onChange={(e) => { setTopic(e.target.value); clearError('topic'); }}
                  style={{
                    ...inputStyle,
                    color: topic ? "#1f2937" : "#9ca3af",
                    cursor: "pointer",
                    borderColor: fieldErrors.topic ? '#ef4444' : '#e5e7eb',
                  }}
                >
                  <option value="" disabled>Select a category</option>
                  <option value={10}>Financial / Payment issue</option>
                  <option value={20}>Equipment / Product issue</option>
                  <option value={30}>Breach of agreement</option>
                </select>
                {fieldErrors.topic && <span style={errorStyle}>{fieldErrors.topic}</span>}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Describe the Issue <span style={{ color: "#ef4444" }}>*</span></label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearError('description'); }}
                  rows={5}
                  placeholder="Explain what happened, include dates, booking IDs, and any relevant details..."
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
                  background: loading ? "#9ca3af" : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(220, 38, 38, 0.25)",
                  transition: "all 0.3s ease",
                }}
              >
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane" style={{ marginRight: "8px" }}></i>
                    Submit Dispute
                  </>
                )}
              </button>
            </form>
          </div>
        )}
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

export default PartnerDispute;
