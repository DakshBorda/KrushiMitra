import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      {/* Background decoration */}
      <div style={styles.bgCircle1}></div>
      <div style={styles.bgCircle2}></div>

      <div style={styles.content}>
        {/* Farm illustration */}
        <div style={styles.illustration}>
          <i className="fa-solid fa-tractor" style={{ fontSize: "80px", color: "#68AC5D" }}></i>
        </div>

        {/* 404 text */}
        <h1 style={styles.errorCode}>404</h1>
        <h2 style={styles.title}>Lost in the Fields!</h2>
        <p style={styles.description}>
          The page you're looking for seems to have wandered off the farm.
          <br />
          Let's get you back on track.
        </p>

        {/* Action buttons */}
        <div style={styles.buttonGroup}>
          <button
            onClick={() => navigate("/")}
            style={styles.primaryBtn}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(104, 172, 93, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 2px 8px rgba(104, 172, 93, 0.25)";
            }}
          >
            <i className="fa-solid fa-house" style={{ marginRight: "8px" }}></i>
            Go Home
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            style={styles.secondaryBtn}
            onMouseEnter={(e) => {
              e.target.style.background = "#f0fdf4";
              e.target.style.borderColor = "#68AC5D";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#fff";
              e.target.style.borderColor = "#d1d5db";
            }}
          >
            <i className="fa-solid fa-grid-2" style={{ marginRight: "8px" }}></i>
            Dashboard
          </button>
          <button
            onClick={() => navigate("/help")}
            style={styles.secondaryBtn}
            onMouseEnter={(e) => {
              e.target.style.background = "#f0fdf4";
              e.target.style.borderColor = "#68AC5D";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#fff";
              e.target.style.borderColor = "#d1d5db";
            }}
          >
            <i
              className="fa-solid fa-circle-question"
              style={{ marginRight: "8px" }}
            ></i>
            Help
          </button>
        </div>

        {/* Branding */}
        <p style={styles.branding}>
          <span style={{ color: "#68AC5D", fontWeight: "700" }}>KrushiMitra</span>{" "}
          — Connecting Farmers with Equipment
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "80vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #f8faf8 0%, #f0fdf4 50%, #ecfdf5 100%)",
    position: "relative",
    overflow: "hidden",
    padding: "40px 20px",
  },
  bgCircle1: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(104,172,93,0.08) 0%, transparent 70%)",
    top: "-100px",
    right: "-100px",
  },
  bgCircle2: {
    position: "absolute",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(104,172,93,0.06) 0%, transparent 70%)",
    bottom: "-50px",
    left: "-50px",
  },
  content: {
    textAlign: "center",
    maxWidth: "520px",
    position: "relative",
    zIndex: 1,
  },
  illustration: {
    marginBottom: "8px",
    animation: "bounce 2s ease-in-out infinite",
  },
  errorCode: {
    fontSize: "120px",
    fontWeight: "900",
    background: "linear-gradient(135deg, #68AC5D 0%, #4a8a42 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: "1",
    margin: "0",
    letterSpacing: "-4px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1f2937",
    margin: "12px 0 8px 0",
  },
  description: {
    fontSize: "15px",
    color: "#6b7280",
    lineHeight: "1.6",
    margin: "0 0 32px 0",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #68AC5D 0%, #5a9c4f 100%)",
    color: "#fff",
    border: "none",
    padding: "12px 28px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(104, 172, 93, 0.25)",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    padding: "12px 24px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  branding: {
    marginTop: "48px",
    fontSize: "13px",
    color: "#9ca3af",
    fontWeight: "500",
  },
};

export default NotFound;
