import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { updateProfile } from "../../api/authAPI";
import { getProfile } from "../../api/profileAPI";
import { getSaveProfileAction } from "../../redux/actions";
import userIcon from "../../img/user_icon.svg";
import "./Profile.css";

// ── Indian States ──
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.authReducer);
  const tokenState = useSelector((state) => state.tokenReducer);
  const user = authState.user?.data || {};

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    address: "",
    city: "",
    state: "",
    pin_code: "",
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!Cookies.get("access-token")) navigate("/");
  }, [navigate]);

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        pin_code: user.pin_code || "",
      });
    }
  }, [user.first_name, user.last_name, user.address, user.city, user.state, user.pin_code]);

  // Build profile photo URL
  const profilePicUrl = user.profile_picture
    ? (user.profile_picture.startsWith("http") ? user.profile_picture : `http://127.0.0.1:8000${user.profile_picture}`)
    : null;

  // ── Profile Completion ──
  const requiredFields = ["first_name", "last_name", "address", "city", "state", "pin_code"];
  const filledCount = requiredFields.filter((f) => user[f] && String(user[f]).trim()).length;
  const completionPercent = Math.round((filledCount / requiredFields.length) * 100);
  const isComplete = completionPercent === 100;

  // ── Image Handling ──
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "Image must be under 5MB", type: "error" });
      return;
    }
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setMessage({ text: "Only JPG and PNG images are allowed", type: "error" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ── Save Handler ──
  const handleSave = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    // Validate pin code
    if (formData.pin_code && (String(formData.pin_code).length !== 6 || isNaN(formData.pin_code))) {
      setMessage({ text: "Pin code must be exactly 6 digits", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      if (imageFile) payload.profile_picture = imageFile;

      const data = await updateProfile({
        formData: payload,
        accessToken: tokenState.token.accessToken,
      });

      if (data.success) {
        setMessage({ text: "Profile updated successfully! ✅", type: "success" });
        setEditing(false);
        setImageFile(null);
        setImagePreview(null);

        // Refresh Redux profile state
        const uuid = Cookies.get("uuid");
        const access = Cookies.get("access-token");
        if (uuid && access) {
          const refreshed = await getProfile({ uuid, accessToken: access });
          dispatch(getSaveProfileAction(refreshed));
        }
      }
    } catch (err) {
      const errMsg = err?.message || err?.msg || "Failed to update profile";
      setMessage({ text: errMsg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setImageFile(null);
    setImagePreview(null);
    setMessage({ text: "", type: "" });
    // Reset form to current user data
    setFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      pin_code: user.pin_code || "",
    });
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.maxWidth}>
        {/* ── Header ── */}
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>My Profile</h1>
          <p style={styles.pageSubtitle}>Manage your account information</p>
        </div>

        {/* ── Completion Banner ── */}
        {!isComplete && (
          <div style={styles.completionBanner}>
            <div style={styles.completionBannerInner}>
              <div>
                <span style={{ fontSize: "20px", marginRight: "10px" }}>⚠️</span>
                <strong style={{ color: "#92400e" }}>Complete your profile</strong>
                <span style={{ color: "#a16207", marginLeft: "8px" }}>
                  — required to list equipment and create bookings
                </span>
              </div>
              {!editing && (
                <button style={styles.completeBtnSmall} onClick={() => setEditing(true)}>
                  Complete Now
                </button>
              )}
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${completionPercent}%` }}></div>
            </div>
            <p style={styles.progressText}>{completionPercent}% complete — {6 - filledCount} field{6 - filledCount !== 1 ? "s" : ""} remaining</p>
          </div>
        )}

        {/* ── Message Toast ── */}
        {message.text && (
          <div style={{
            ...styles.toast,
            background: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            borderColor: message.type === "success" ? "#6ee7b7" : "#fca5a5",
            color: message.type === "success" ? "#065f46" : "#991b1b",
          }}>
            {message.text}
          </div>
        )}

        <div style={styles.profileGrid}>
          {/* ── Left Column: Photo + Quick Info ── */}
          <div style={styles.leftColumn}>
            <div style={styles.photoCard}>
              <div style={styles.photoWrapper}>
                <img
                  src={imagePreview || profilePicUrl || userIcon}
                  alt="Profile"
                  style={styles.photoImg}
                />
                {editing && (
                  <label style={styles.photoOverlay}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleImageSelect}
                      style={{ display: "none" }}
                    />
                    <i className="fa-solid fa-camera" style={{ fontSize: "20px" }}></i>
                    <span style={{ fontSize: "11px", marginTop: "4px" }}>Change Photo</span>
                  </label>
                )}
              </div>
              <h2 style={styles.userName}>
                {user.first_name || "—"} {user.last_name || ""}
              </h2>
              <p style={styles.userEmail}>{user.email || "No email"}</p>
              <p style={styles.userPhone}>
                <i className="fa-solid fa-phone" style={{ marginRight: "6px", fontSize: "12px" }}></i>
                {user.phone_number || "No phone"}
              </p>
              <div style={styles.userIdBadge}>ID: {user.user_id || "—"}</div>

              {/* Completion chip */}
              <div style={{
                ...styles.completionChip,
                background: isComplete ? "#ecfdf5" : "#fef3c7",
                color: isComplete ? "#065f46" : "#92400e",
                borderColor: isComplete ? "#6ee7b7" : "#fcd34d",
              }}>
                {isComplete ? "✅ Profile Complete" : `⚠️ ${completionPercent}% Complete`}
              </div>
            </div>
          </div>

          {/* ── Right Column: Details ── */}
          <div style={styles.rightColumn}>
            <div style={styles.detailsCard}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>
                  <i className="fa-solid fa-user-pen" style={{ marginRight: "10px", color: "#68AC5D" }}></i>
                  Personal Information
                </h2>
                {!editing ? (
                  <button style={styles.editBtn} onClick={() => setEditing(true)}>
                    <i className="fa-solid fa-pencil" style={{ marginRight: "6px" }}></i>
                    Edit Profile
                  </button>
                ) : (
                  <button style={styles.cancelBtn} onClick={handleCancel}>
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSave}>
                <div style={styles.fieldGrid}>
                  {/* First Name */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>First Name *</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        style={styles.input}
                        placeholder="Enter first name"
                        required
                      />
                    ) : (
                      <p style={styles.fieldValue}>{user.first_name || <span style={styles.emptyField}>Not set</span>}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>Last Name *</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        style={styles.input}
                        placeholder="Enter last name"
                        required
                      />
                    ) : (
                      <p style={styles.fieldValue}>{user.last_name || <span style={styles.emptyField}>Not set</span>}</p>
                    )}
                  </div>

                  {/* Email (read-only) */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>
                      Email
                      <span style={styles.readOnlyTag}>Read-Only</span>
                    </label>
                    <p style={styles.fieldValueReadOnly}>{user.email || "—"}</p>
                  </div>

                  {/* Phone (read-only) */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>
                      Phone Number
                      <span style={styles.readOnlyTag}>Read-Only</span>
                    </label>
                    <p style={styles.fieldValueReadOnly}>{user.phone_number || "—"}</p>
                  </div>

                  {/* Address */}
                  <div style={{ ...styles.fieldGroup, gridColumn: "1 / -1" }}>
                    <label style={styles.fieldLabel}>Address *</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        style={styles.input}
                        placeholder="e.g. 123 Farm Road, Village Name"
                        required
                      />
                    ) : (
                      <p style={styles.fieldValue}>{user.address || <span style={styles.emptyField}>Not set</span>}</p>
                    )}
                  </div>

                  {/* City */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>City *</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        style={styles.input}
                        placeholder="e.g. Ahmedabad"
                        required
                      />
                    ) : (
                      <p style={styles.fieldValue}>{user.city || <span style={styles.emptyField}>Not set</span>}</p>
                    )}
                  </div>

                  {/* State */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>State *</label>
                    {editing ? (
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        style={styles.input}
                        required
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <p style={styles.fieldValue}>{user.state || <span style={styles.emptyField}>Not set</span>}</p>
                    )}
                  </div>

                  {/* Pin Code */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>Pin Code *</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.pin_code}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setFormData({ ...formData, pin_code: val });
                        }}
                        style={styles.input}
                        placeholder="e.g. 380015"
                        maxLength={6}
                        required
                      />
                    ) : (
                      <p style={styles.fieldValue}>{user.pin_code || <span style={styles.emptyField}>Not set</span>}</p>
                    )}
                  </div>
                </div>

                {/* Save button */}
                {editing && (
                  <div style={styles.actionRow}>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        ...styles.saveBtn,
                        opacity: saving ? 0.6 : 1,
                        cursor: saving ? "not-allowed" : "pointer"
                      }}
                    >
                      {saving ? (
                        <>Saving...</>
                      ) : (
                        <><i className="fa-solid fa-check" style={{ marginRight: "8px" }}></i>Save Changes</>
                      )}
                    </button>
                    <button type="button" style={styles.discardBtn} onClick={handleCancel}>
                      Discard
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Styles ──
const styles = {
  pageContainer: {
    minHeight: "80vh",
    background: "linear-gradient(180deg, #f8faf8 0%, #f0f7ef 100%)",
    padding: "32px 20px 60px 20px",
  },
  maxWidth: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  pageHeader: {
    marginBottom: "24px",
  },
  pageTitle: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#1f2937",
    margin: "0 0 4px 0",
  },
  pageSubtitle: {
    fontSize: "15px",
    color: "#6b7280",
    margin: 0,
  },
  completionBanner: {
    background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    border: "1px solid #fcd34d",
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "24px",
  },
  completionBannerInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  completeBtnSmall: {
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    padding: "8px 20px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
  },
  progressBar: {
    height: "6px",
    background: "#fde68a",
    borderRadius: "3px",
    marginTop: "12px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #f59e0b 0%, #68AC5D 100%)",
    borderRadius: "3px",
    transition: "width 0.5s ease",
  },
  progressText: {
    fontSize: "12px",
    color: "#92400e",
    marginTop: "6px",
    fontWeight: "500",
  },
  toast: {
    padding: "12px 20px",
    borderRadius: "10px",
    border: "1px solid",
    marginBottom: "20px",
    fontWeight: "600",
    fontSize: "14px",
    textAlign: "center",
  },
  profileGrid: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: "24px",
    alignItems: "start",
  },
  leftColumn: {},
  rightColumn: {},
  photoCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "32px 24px",
    textAlign: "center",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  photoWrapper: {
    position: "relative",
    width: "140px",
    height: "140px",
    margin: "0 auto 16px auto",
    borderRadius: "50%",
    overflow: "hidden",
    border: "4px solid #68AC5D",
    boxShadow: "0 4px 14px rgba(104, 172, 93, 0.2)",
  },
  photoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },
  userName: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1f2937",
    margin: "0 0 4px 0",
  },
  userEmail: {
    fontSize: "13px",
    color: "#6b7280",
    margin: "0 0 4px 0",
  },
  userPhone: {
    fontSize: "13px",
    color: "#6b7280",
    margin: "0 0 12px 0",
  },
  userIdBadge: {
    display: "inline-block",
    background: "#f3f4f6",
    color: "#6b7280",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "12px",
  },
  completionChip: {
    display: "inline-block",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "700",
    border: "1px solid",
  },
  detailsCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "28px 32px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid #f3f4f6",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1f2937",
    margin: 0,
  },
  editBtn: {
    background: "linear-gradient(135deg, #68AC5D 0%, #5a9c4f 100%)",
    color: "#fff",
    border: "none",
    padding: "8px 20px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  cancelBtn: {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    padding: "8px 20px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  fieldGroup: {},
  fieldLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "6px",
  },
  readOnlyTag: {
    display: "inline-block",
    background: "#f3f4f6",
    color: "#9ca3af",
    padding: "1px 8px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: "600",
    marginLeft: "8px",
    textTransform: "none",
    letterSpacing: "0",
  },
  fieldValue: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#1f2937",
    margin: 0,
    padding: "10px 14px",
    background: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #f3f4f6",
  },
  fieldValueReadOnly: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#9ca3af",
    margin: 0,
    padding: "10px 14px",
    background: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #f3f4f6",
    fontStyle: "italic",
  },
  emptyField: {
    color: "#d1d5db",
    fontStyle: "italic",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "2px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "500",
    color: "#1f2937",
    outline: "none",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
    background: "#fff",
  },
  actionRow: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #f3f4f6",
  },
  saveBtn: {
    background: "linear-gradient(135deg, #68AC5D 0%, #5a9c4f 100%)",
    color: "#fff",
    border: "none",
    padding: "12px 32px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(104, 172, 93, 0.25)",
    transition: "all 0.2s ease",
  },
  discardBtn: {
    background: "#fff",
    color: "#6b7280",
    border: "1px solid #d1d5db",
    padding: "12px 24px",
    borderRadius: "10px",
    fontWeight: "600",
    fontSize: "15px",
    cursor: "pointer",
  },
};

export default Profile;
