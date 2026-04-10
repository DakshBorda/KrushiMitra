import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createEquipmentReport } from "../api/equipments";

const EquipmentReport = () => {
  const [equipment, setEquipment] = useState("");
  const [report_reason, setReportReason] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    setEquipment(params.id);
  }, [params.id]);

  async function submitEquipmentReport(e) {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (!report_reason || report_reason === "0") {
      setError("Please select a reason for reporting.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the issue.");
      return;
    }

    setLoading(true);
    try {
      const data = await createEquipmentReport({
        equipment,
        report_reason,
        description,
      });
      if (data.data.success) {
        setSuccess(true);
        setMessage("Your report has been submitted. Our team will review this listing within 24-48 hours.");
      }
    } catch (err) {
      setError("Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "80vh", background: "#fafbfa" }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #78350f 0%, #d97706 50%, #fbbf24 100%)",
        padding: "48px 20px 64px 20px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "200px", height: "200px", borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}></div>
        <h1 style={{
          fontSize: "28px", fontWeight: 800, color: "#fff",
          margin: "0 0 8px 0",
        }}>
          <i className="fa-solid fa-flag" style={{ marginRight: "10px" }}></i>
          Report Equipment
        </h1>
        <p style={{
          fontSize: "15px", color: "rgba(255,255,255,0.85)",
          margin: 0,
        }}>
          Help us maintain quality by reporting issues with listings
        </p>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: "560px", margin: "-32px auto 0 auto",
        padding: "0 20px 60px 20px", position: "relative", zIndex: 2,
      }}>
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
              Report Submitted
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.6, margin: "0 0 24px 0" }}>
              {message}
            </p>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "linear-gradient(135deg, #68AC5D, #4a9c3f)",
                color: "#fff", border: "none", padding: "12px 32px",
                borderRadius: "10px", fontWeight: 700, cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Go Back
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
              Report Details
            </h2>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 20px 0" }}>
              Equipment Ref: <strong style={{ color: "#374151" }}>#{equipment}</strong>
            </p>

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

            <form onSubmit={submitEquipmentReport}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Reason <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { value: "20", label: "Belongs to another person", icon: "fa-user-slash" },
                    { value: "30", label: "Misleading or false information", icon: "fa-triangle-exclamation" },
                    { value: "40", label: "Harassment or inappropriate content", icon: "fa-shield-halved" },
                    { value: "10", label: "Other reason", icon: "fa-circle-question" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "12px 14px", borderRadius: "10px",
                        border: report_reason === option.value
                          ? "2px solid #d97706"
                          : "1px solid #e5e7eb",
                        background: report_reason === option.value ? "#fffbeb" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={option.value}
                        checked={report_reason === option.value}
                        onChange={(e) => setReportReason(e.target.value)}
                        style={{ accentColor: "#d97706" }}
                      />
                      <i className={`fa-solid ${option.icon}`} style={{
                        color: report_reason === option.value ? "#d97706" : "#9ca3af",
                        fontSize: "14px",
                      }}></i>
                      <span style={{
                        fontSize: "14px", fontWeight: 600,
                        color: report_reason === option.value ? "#92400e" : "#374151",
                      }}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Description <span style={{ color: "#ef4444" }}>*</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  placeholder="Describe the issue in detail..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: "100px",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || success}
                style={{
                  width: "100%",
                  padding: "13px 24px",
                  borderRadius: "12px",
                  border: "none",
                  background: loading ? "#9ca3af" : "linear-gradient(135deg, #d97706 0%, #92400e 100%)",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(217, 119, 6, 0.25)",
                  transition: "all 0.3s ease",
                }}
              >
                {loading ? "Submitting..." : "Submit Report"}
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

export default EquipmentReport;
