import React, { useState } from "react";
import Cookies from "js-cookie";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { postCancellationData } from "../../api/authAPI";

const CancellationPolicy = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!Cookies.get("access-token");

  useEffect(() => {
    if (!isLoggedIn) navigate("/", { replace: true });
  }, [isLoggedIn, navigate]);

  // Cancellation form state
  const [booking_id, setBookingId] = useState("");
  const [cancel_reason, setCancelReason] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submitCancellation(e) {
    e.preventDefault();
    if (loading) return;
    setMessage("");
    setIsError(false);

    if (!booking_id.trim()) {
      setMessage("Please enter your Booking ID.");
      setIsError(true);
      return;
    }
    if (!cancel_reason || cancel_reason === "0") {
      setMessage("Please select a cancellation reason.");
      setIsError(true);
      return;
    }

    setLoading(true);
    try {
      const data = await postCancellationData({
        booking_id,
        cancel_reason,
        description,
        token: Cookies.get("access-token"),
      });
      if (data.success) {
        setSuccess(true);
        setMessage(data.message || "Cancellation request submitted successfully.");
        setIsError(false);
      }
    } catch (err) {
      setMessage("Failed to submit. Please check the Booking ID and try again.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  const POLICIES = [
    {
      icon: "fa-user",
      iconColor: "#3b82f6",
      iconBg: "#dbeafe",
      title: "For Farmers (Customers)",
      points: [
        "Cancel a pending booking at any time — no questions asked.",
        "Confirmed bookings can be cancelled up to 24 hours before the start date.",
        "Late cancellations (within 24 hours) may not be eligible for a refund.",
      ],
    },
    {
      icon: "fa-tractor",
      iconColor: "#68AC5D",
      iconBg: "#dcfce7",
      title: "For Equipment Owners",
      points: [
        "You may cancel a confirmed booking with a valid reason.",
        "A cancellation reason must be provided for all owner-initiated cancellations.",
        "Frequent cancellations may affect your response rate and profile visibility.",
      ],
    },
    {
      icon: "fa-clock",
      iconColor: "#d97706",
      iconBg: "#fef3c7",
      title: "Auto-Expiry",
      points: [
        "If an owner does not respond within 48 hours, the booking automatically expires.",
        "You will be notified and can rebook with another owner immediately.",
      ],
    },
    {
      icon: "fa-ban",
      iconColor: "#ef4444",
      iconBg: "#fee2e2",
      title: "Important Rules",
      points: [
        "Bookings cannot be partially cancelled — the entire period is cancelled as a unit.",
        "Completed or in-progress bookings cannot be cancelled.",
        "For disputes, use the Raise a Dispute form or contact support.",
      ],
    },
  ];

  const CANCEL_REASONS = [
    { value: "20", label: "Quality / Equipment issues" },
    { value: "30", label: "Found a better option" },
    { value: "40", label: "Owner-related issue" },
    { value: "10", label: "Other reason" },
  ];

  return (
    <div style={{ minHeight: "80vh", background: "#fafbfa" }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #166534 0%, #68AC5D 50%, #22c55e 100%)",
        padding: "52px 20px 70px 20px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "200px", height: "200px", borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}></div>
        <div style={{
          position: "absolute", bottom: "-60px", left: "-30px",
          width: "160px", height: "160px", borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
        }}></div>
        <h1 style={{
          fontSize: "32px", fontWeight: 800, color: "#fff",
          margin: "0 0 8px 0",
        }}>
          <i className="fa-solid fa-file-contract" style={{ marginRight: "12px" }}></i>
          Cancellation Policy
        </h1>
        <p style={{
          fontSize: "15px", color: "rgba(255,255,255,0.85)",
          margin: 0, maxWidth: "500px", marginLeft: "auto", marginRight: "auto",
        }}>
          Fair and transparent rules for managing booking cancellations on KrushiMitra
        </p>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: "900px", margin: "-36px auto 0 auto",
        padding: "0 20px 60px 20px", position: "relative", zIndex: 2,
      }}>

        {/* ── Policy Cards ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}>
          {POLICIES.map((policy, idx) => (
            <div key={idx} style={{
              background: "#fff", borderRadius: "14px",
              padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "12px",
                  background: policy.iconBg, color: policy.iconColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", flexShrink: 0,
                }}>
                  <i className={`fa-solid ${policy.icon}`}></i>
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937", margin: 0 }}>
                  {policy.title}
                </h3>
              </div>
              <ul style={{
                margin: 0, paddingLeft: "20px",
                fontSize: "14px", color: "#4b5563", lineHeight: 1.8,
              }}>
                {policy.points.map((point, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Timeline Visual ── */}
        <div style={{
          background: "#fff", borderRadius: "14px",
          padding: "28px 24px", marginBottom: "32px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          border: "1px solid #e5e7eb",
        }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937", margin: "0 0 20px 0", textAlign: "center" }}>
            <i className="fa-solid fa-route" style={{ color: "#68AC5D", marginRight: "8px" }}></i>
            Booking Lifecycle
          </h3>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "0", flexWrap: "wrap",
          }}>
            {[
              { label: "Pending", sub: "Cancel freely", color: "#d97706", bg: "#fef3c7" },
              { label: "Confirmed", sub: "Cancel 24h before", color: "#16a34a", bg: "#dcfce7" },
              { label: "In Progress", sub: "Cannot cancel", color: "#ea580c", bg: "#fff7ed" },
              { label: "Completed", sub: "Cannot cancel", color: "#2563eb", bg: "#dbeafe" },
            ].map((step, i) => (
              <React.Fragment key={i}>
                <div style={{
                  textAlign: "center", padding: "12px 16px",
                  borderRadius: "12px", background: step.bg,
                  minWidth: "130px",
                }}>
                  <div style={{
                    fontSize: "13px", fontWeight: 700, color: step.color,
                    marginBottom: "4px",
                  }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
                    {step.sub}
                  </div>
                </div>
                {i < 3 && (
                  <i className="fa-solid fa-chevron-right" style={{
                    color: "#d1d5db", fontSize: "14px",
                    margin: "0 8px", flexShrink: 0,
                  }}></i>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Cancellation Request Form ── */}
        <div style={{
          background: "#fff", borderRadius: "16px",
          padding: "32px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
        }}>
          <h2 style={{
            fontSize: "18px", fontWeight: 700, color: "#1f2937",
            margin: "0 0 4px 0",
          }}>
            <i className="fa-solid fa-paper-plane" style={{ color: "#ef4444", marginRight: "10px" }}></i>
            Request a Cancellation
          </h2>
          <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 20px 0" }}>
            You can also cancel directly from your <span
              style={{ color: "#68AC5D", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => navigate("/booking-history")}
            >Booking History</span> page.
          </p>

          {/* Success State */}
          {success ? (
            <div style={{
              textAlign: "center", padding: "24px 16px",
            }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "#ecfdf5", display: "flex",
                alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px auto",
              }}>
                <i className="fa-solid fa-circle-check" style={{ fontSize: "28px", color: "#16a34a" }}></i>
              </div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#065f46", margin: "0 0 6px 0" }}>
                Request Submitted
              </p>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 16px 0" }}>
                {message}
              </p>
              <button
                onClick={() => navigate("/booking-history")}
                style={{
                  background: "linear-gradient(135deg, #68AC5D, #4a9c3f)",
                  color: "#fff", border: "none", padding: "10px 28px",
                  borderRadius: "10px", fontWeight: 700, cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                View Bookings
              </button>
            </div>
          ) : (
            <form onSubmit={submitCancellation}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Booking ID <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text" value={booking_id}
                    onChange={(e) => setBookingId(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. BK00001"
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Reason <span style={{ color: "#ef4444" }}>*</span></label>
                  <select
                    value={cancel_reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                    style={{
                      ...inputStyle,
                      color: cancel_reason && cancel_reason !== "0" ? "#1f2937" : "#9ca3af",
                      cursor: "pointer",
                    }}
                  >
                    <option value="0" disabled>Select a reason</option>
                    {CANCEL_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Additional Details <span style={{ color: "#9ca3af" }}>(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Provide any additional details..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: "80px",
                  }}
                />
              </div>

              {/* Error/Message */}
              {message && (
                <div style={{
                  background: isError ? "#fef2f2" : "#ecfdf5",
                  border: `1px solid ${isError ? "#fca5a5" : "#6ee7b7"}`,
                  borderRadius: "10px", padding: "12px 16px",
                  marginBottom: "16px", textAlign: "center",
                  fontSize: "14px", fontWeight: 600,
                  color: isError ? "#991b1b" : "#065f46",
                }}>
                  <i className={`fa-solid ${isError ? "fa-circle-exclamation" : "fa-circle-check"}`}
                    style={{ marginRight: "8px" }}
                  ></i>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px 24px",
                  borderRadius: "12px",
                  border: "none",
                  background: loading ? "#9ca3af" : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)",
                  transition: "all 0.3s ease",
                }}
              >
                {loading ? "Submitting..." : "Submit Cancellation Request"}
              </button>
            </form>
          )}
        </div>

        {/* ── Help Link ── */}
        <div style={{
          textAlign: "center", marginTop: "24px",
          fontSize: "13px", color: "#9ca3af",
        }}>
          Need help? Visit our{" "}
          <span
            style={{ color: "#68AC5D", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => navigate("/help")}
          >Help Center</span>
          {" "}or{" "}
          <span
            style={{ color: "#68AC5D", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => navigate("/contact")}
          >Contact Support</span>
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

export default CancellationPolicy;
