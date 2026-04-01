import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { getMyEquipments, updateEquipment, deleteEquipment } from "../../api/equipments";
import item1 from "../../img/item1.png";
import "./MyEquipment.css";

const MyEquipment = () => {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editImages, setEditImages] = useState({});
  const [editPreviews, setEditPreviews] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!Cookies.get("access-token")) { navigate("/"); return; }
    fetchEquipments();
  }, [navigate]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchEquipments() {
    try {
      setLoading(true);
      const res = await getMyEquipments();
      setEquipments(res?.data?.results || res?.data || []);
    } catch (err) {
      console.log("Error fetching my equipment:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Stats ──
  const totalCount = equipments.length;
  const availableCount = equipments.filter((e) => e.is_available).length;
  const unavailableCount = equipments.filter((e) => !e.is_available).length;

  // ── Filter + Search ──
  const filtered = equipments.filter((eq) => {
    const matchSearch = !searchQuery || eq.title?.toLowerCase().includes(searchQuery.toLowerCase())
      || eq.equipment_location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all"
      || (filterStatus === "available" && eq.is_available)
      || (filterStatus === "unavailable" && !eq.is_available);
    return matchSearch && matchStatus;
  });

  // ── Availability Toggle ──
  async function toggleAvailability(eq) {
    // Optimistic update
    const newVal = !eq.is_available;
    setEquipments((prev) =>
      prev.map((e) => (e.id === eq.id ? { ...e, is_available: newVal } : e))
    );
    try {
      await updateEquipment(eq.id, { is_available: newVal });
      setToast({ type: "success", msg: `${eq.title} is now ${newVal ? "available" : "unavailable"}` });
    } catch (err) {
      // Rollback on failure
      setEquipments((prev) =>
        prev.map((e) => (e.id === eq.id ? { ...e, is_available: !newVal } : e))
      );
      const msg = err?.response?.data?.msg || err?.response?.data?.message || "Failed to update availability.";
      setToast({ type: "error", msg });
    }
  }

  // ── Delete ──
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this equipment?\n\nThis action cannot be undone.")) return;
    try {
      await deleteEquipment(id);
      setEquipments((prev) => prev.filter((eq) => eq.id !== id));
      setToast({ type: "success", msg: "Equipment deleted successfully" });
    } catch (err) {
      const msg = err?.response?.data?.msg || err?.response?.data?.message || "Failed to delete equipment.";
      setToast({ type: "error", msg });
    }
  }

  // ── Edit ──
  function openEdit(eq) {
    setEditItem(eq);
    setEditForm({
      title: eq.title || "",
      description: eq.description || "",
      daily_rental: eq.daily_rental || 0,
      hourly_rental: eq.hourly_rental || 0,
      equipment_location: eq.equipment_location || "",
      condition: eq.condition || "New",
      weight: eq.weight || 0,
      horsepower: eq.horsepower || 0,
      model: eq.model || "",
      manufacturing_year: eq.manufacturing_year || "",
      height: eq.height || 0,
      width: eq.width || 0,
      available_start_time: eq.available_start_time || "",
      available_end_time: eq.available_end_time || "",
      show_phone_number: eq.show_phone_number || false,
    });
    setEditImages({});
    setEditPreviews({});
    setEditErrors({});
  }

  function handleEditImageChange(e, key) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setEditErrors((p) => ({ ...p, [key]: "Image must be under 5MB" }));
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setEditErrors((p) => ({ ...p, [key]: "JPG/PNG only" }));
      return;
    }
    setEditImages((p) => ({ ...p, [key]: file }));
    setEditPreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }));
    setEditErrors((p) => ({ ...p, [key]: "" }));
  }

  function validateEditForm() {
    const errs = {};
    if (!editForm.title || editForm.title.trim().length < 3)
      errs.title = "Title must be at least 3 characters";
    if (editForm.description && editForm.description.trim().length > 0 && editForm.description.trim().length < 10)
      errs.description = "Description must be at least 10 characters";
    const daily = parseInt(editForm.daily_rental) || 0;
    const hourly = parseInt(editForm.hourly_rental) || 0;
    if (daily <= 0 && hourly <= 0)
      errs.daily_rental = "At least one rental price must be > ₹0";
    if (editForm.available_start_time && editForm.available_end_time &&
        editForm.available_end_time <= editForm.available_start_time)
      errs.available_end_time = "End date must be after start date";
    if (editForm.equipment_location && editForm.equipment_location.trim().length < 3)
      errs.equipment_location = "Location must be at least 3 characters";
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleEditSave() {
    if (!validateEditForm()) return;
    setSaving(true);
    try {
      await updateEquipment(editItem.id, editForm, editImages);
      setEditItem(null);
      setToast({ type: "success", msg: "Equipment updated successfully!" });
      await fetchEquipments();
    } catch (err) {
      const errData = err?.response?.data;
      const errs = errData?.errors;
      const msg = errData?.msg || errData?.message || "Failed to update equipment.";
      if (errs && typeof errs === "object") {
        // Map backend errors to form fields
        const fieldErrors = {};
        Object.entries(errs).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val.join(", ") : String(val);
        });
        setEditErrors(fieldErrors);
      } else {
        setEditErrors({ _global: msg });
      }
    } finally {
      setSaving(false);
    }
  }

  const getImageSrc = (eq) => eq.image || eq.image_1 || eq.image_2 || eq.image_3 || item1;

  if (loading) {
    return (
      <div className="me-page">
        <div className="me-container">
          <div className="me-loading">
            <div className="me-spinner"></div>
            <p>Loading your equipment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="me-page">
      <div className="me-container">
        {/* ── Toast ── */}
        {toast && (
          <div className={`me-toast ${toast.type}`} onClick={() => setToast(null)}>
            <span>{toast.type === "success" ? "✓" : "✕"}</span>
            {toast.msg}
          </div>
        )}

        {/* ── Header ── */}
        <div className="me-header">
          <div>
            <h1>My Equipment</h1>
            <p>Manage your listed equipment</p>
          </div>
          <button className="me-btn-add" onClick={() => navigate("/addProduct")}>
            <i className="fa-solid fa-plus" style={{ marginRight: "8px" }}></i>
            Add Equipment
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="me-stats">
          <div className="me-stat-card">
            <span className="me-stat-value">{totalCount}</span>
            <span className="me-stat-label">Total Listed</span>
          </div>
          <div className="me-stat-card available">
            <span className="me-stat-value">{availableCount}</span>
            <span className="me-stat-label">Available</span>
          </div>
          <div className="me-stat-card unavailable">
            <span className="me-stat-value">{unavailableCount}</span>
            <span className="me-stat-label">Unavailable</span>
          </div>
        </div>

        {/* ── Search & Filter ── */}
        <div className="me-toolbar">
          <div className="me-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" placeholder="Search equipment..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="me-filter-btns">
            {[["all", "All"], ["available", "Available"], ["unavailable", "Unavailable"]].map(([val, label]) => (
              <button key={val} className={`me-filter-btn ${filterStatus === val ? "active" : ""}`}
                onClick={() => setFilterStatus(val)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Equipment Grid ── */}
        {filtered.length === 0 ? (
          <div className="me-empty">
            <div className="me-empty-icon">🚜</div>
            <h2>{equipments.length === 0 ? "No equipment listed yet" : "No matching equipment"}</h2>
            <p>{equipments.length === 0 ? "Start by adding your first equipment for rental." : "Try adjusting your search or filters."}</p>
            {equipments.length === 0 && (
              <button className="me-btn-add" onClick={() => navigate("/addProduct")}>
                + Add Equipment
              </button>
            )}
          </div>
        ) : (
          <div className="me-grid">
            {filtered.map((eq) => (
              <div key={eq.id} className="me-card">
                <div className="me-card-image-wrap">
                  <img src={getImageSrc(eq)} alt={eq.title} className="me-card-image"
                    onError={(e) => { e.target.src = item1; }} />
                  <div className={`me-card-badge ${eq.is_available ? "available" : "unavailable"}`}>
                    {eq.is_available ? "Available" : "Unavailable"}
                  </div>
                </div>
                <div className="me-card-body">
                  <h3 className="me-card-title">{eq.title}</h3>
                  <p className="me-card-meta">
                    {eq.manufacturer || ""} {eq.model ? `• ${eq.model}` : ""}
                  </p>
                  {eq.equipment_location && (
                    <p className="me-card-location">📍 {eq.equipment_location}</p>
                  )}
                  <div className="me-card-pricing">
                    {eq.daily_rental > 0 && <span>₹{eq.daily_rental}<small>/day</small></span>}
                    {eq.hourly_rental > 0 && <span>₹{eq.hourly_rental}<small>/hr</small></span>}
                  </div>

                  {/* Availability Toggle */}
                  <div className="me-card-toggle">
                    <span>Availability</span>
                    <label className="me-toggle">
                      <input type="checkbox" checked={eq.is_available} onChange={() => toggleAvailability(eq)} />
                      <span className="me-toggle-slider"></span>
                    </label>
                  </div>

                  <div className="me-card-actions">
                    <button className="me-btn-view" onClick={() => navigate(`/product/${eq.eq_id}`)}>
                      View
                    </button>
                    <button className="me-btn-edit" onClick={() => openEdit(eq)}>
                      Edit
                    </button>
                    <button className="me-btn-delete" onClick={() => handleDelete(eq.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Edit Modal ── */}
        {editItem && (
          <div className="me-modal-overlay" onClick={() => setEditItem(null)}>
            <div className="me-modal" onClick={(e) => e.stopPropagation()}>
              <div className="me-modal-header">
                <h2>Edit Equipment</h2>
                <button className="me-modal-close" onClick={() => setEditItem(null)}>✕</button>
              </div>
              <div className="me-modal-body">
                {/* Global error */}
                {editErrors._global && (
                  <div className="me-modal-error-banner">{editErrors._global}</div>
                )}

                <div className="me-modal-grid">
                  {/* Title */}
                  <div className="me-modal-field full">
                    <label>Title *</label>
                    <input value={editForm.title}
                      className={editErrors.title ? "field-error" : ""}
                      onChange={(e) => {
                        setEditForm({ ...editForm, title: e.target.value });
                        setEditErrors((p) => ({ ...p, title: "" }));
                      }} />
                    {editErrors.title && <span className="me-field-error">{editErrors.title}</span>}
                  </div>

                  {/* Description */}
                  <div className="me-modal-field full">
                    <label>Description</label>
                    <textarea value={editForm.description} rows={3}
                      className={editErrors.description ? "field-error" : ""}
                      onChange={(e) => {
                        setEditForm({ ...editForm, description: e.target.value });
                        setEditErrors((p) => ({ ...p, description: "" }));
                      }} />
                    {editErrors.description && <span className="me-field-error">{editErrors.description}</span>}
                  </div>

                  {/* Daily Rental */}
                  <div className="me-modal-field">
                    <label>Daily Rental (₹) *</label>
                    <input type="number" value={editForm.daily_rental}
                      className={editErrors.daily_rental ? "field-error" : ""}
                      onChange={(e) => {
                        setEditForm({ ...editForm, daily_rental: e.target.value });
                        setEditErrors((p) => ({ ...p, daily_rental: "" }));
                      }} />
                    {editErrors.daily_rental && <span className="me-field-error">{editErrors.daily_rental}</span>}
                  </div>

                  {/* Hourly Rental */}
                  <div className="me-modal-field">
                    <label>Hourly Rental (₹)</label>
                    <input type="number" value={editForm.hourly_rental}
                      onChange={(e) => setEditForm({ ...editForm, hourly_rental: e.target.value })} />
                  </div>

                  {/* Available From */}
                  <div className="me-modal-field">
                    <label>Available From</label>
                    <input type="date" value={editForm.available_start_time}
                      onChange={(e) => {
                        setEditForm({ ...editForm, available_start_time: e.target.value });
                        setEditErrors((p) => ({ ...p, available_start_time: "", available_end_time: "" }));
                      }} />
                    {editErrors.available_start_time && <span className="me-field-error">{editErrors.available_start_time}</span>}
                  </div>

                  {/* Available Until */}
                  <div className="me-modal-field">
                    <label>Available Until</label>
                    <input type="date" value={editForm.available_end_time}
                      min={editForm.available_start_time || ""}
                      className={editErrors.available_end_time ? "field-error" : ""}
                      onChange={(e) => {
                        setEditForm({ ...editForm, available_end_time: e.target.value });
                        setEditErrors((p) => ({ ...p, available_end_time: "" }));
                      }} />
                    {editErrors.available_end_time && <span className="me-field-error">{editErrors.available_end_time}</span>}
                  </div>

                  {/* Location */}
                  <div className="me-modal-field full">
                    <label>Location</label>
                    <input value={editForm.equipment_location}
                      className={editErrors.equipment_location ? "field-error" : ""}
                      onChange={(e) => {
                        setEditForm({ ...editForm, equipment_location: e.target.value });
                        setEditErrors((p) => ({ ...p, equipment_location: "" }));
                      }} />
                    {editErrors.equipment_location && <span className="me-field-error">{editErrors.equipment_location}</span>}
                  </div>

                  {/* Model */}
                  <div className="me-modal-field">
                    <label>Model</label>
                    <input value={editForm.model}
                      onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} />
                  </div>

                  {/* Manufacturing Year */}
                  <div className="me-modal-field">
                    <label>Manufacturing Year</label>
                    <input type="number" value={editForm.manufacturing_year}
                      onChange={(e) => setEditForm({ ...editForm, manufacturing_year: e.target.value })} />
                  </div>

                  {/* Condition */}
                  <div className="me-modal-field">
                    <label>Condition</label>
                    <select value={editForm.condition}
                      onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}>
                      <option value="New">New</option>
                      <option value="Used">Used</option>
                    </select>
                  </div>

                  {/* Horsepower */}
                  <div className="me-modal-field">
                    <label>Horsepower (HP)</label>
                    <input type="number" value={editForm.horsepower}
                      onChange={(e) => setEditForm({ ...editForm, horsepower: e.target.value })} />
                  </div>

                  {/* Weight */}
                  <div className="me-modal-field">
                    <label>Weight (kg)</label>
                    <input type="number" value={editForm.weight}
                      onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} />
                  </div>

                  {/* Height */}
                  <div className="me-modal-field">
                    <label>Height (cm)</label>
                    <input type="number" value={editForm.height}
                      onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} />
                  </div>

                  {/* Width */}
                  <div className="me-modal-field">
                    <label>Width (cm)</label>
                    <input type="number" value={editForm.width}
                      onChange={(e) => setEditForm({ ...editForm, width: e.target.value })} />
                  </div>

                  {/* Show Phone Number Toggle */}
                  <div className="me-modal-field full">
                    <div className="me-modal-toggle-row">
                      <div>
                        <label>Show Phone Number</label>
                        <p className="me-modal-field-hint">Allow renters to see your phone number on this listing</p>
                      </div>
                      <label className="me-toggle">
                        <input type="checkbox" checked={editForm.show_phone_number}
                          onChange={(e) => setEditForm({ ...editForm, show_phone_number: e.target.checked })} />
                        <span className="me-toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  {/* Image uploads */}
                  <div className="me-modal-field full">
                    <label>Update Photos</label>
                    <div className="me-modal-images">
                      {["image_1", "image_2", "image_3", "image_4", "image_5"].map((key, i) => (
                        <div key={key} className="me-modal-img-slot">
                          {editPreviews[key] ? (
                            <img src={editPreviews[key]} alt={`Photo ${i + 1}`} />
                          ) : (
                            <label className="me-modal-img-upload">
                              <input type="file" accept="image/jpeg,image/png"
                                onChange={(e) => handleEditImageChange(e, key)} />
                              <span>📷 {i + 1}</span>
                            </label>
                          )}
                          {editErrors[key] && <span className="me-field-error">{editErrors[key]}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="me-modal-actions">
                <button className="me-btn-cancel" onClick={() => setEditItem(null)}>Cancel</button>
                <button className="me-btn-save" onClick={handleEditSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEquipment;
