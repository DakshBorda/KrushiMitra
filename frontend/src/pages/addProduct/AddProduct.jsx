import React, { useState, useEffect } from "react";
import "./AddProduct.css";
import { createEquipment, getBrands, getEquipsList } from "../../api/equipments";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const STEPS = ["Basic Info", "Pricing & Dates", "Specs & Location", "Photos", "Review"];
const CURRENT_YEAR = new Date().getFullYear();

const AddProduct = () => {
  const navigate = useNavigate();
  const authState = useSelector((state) => state.authReducer);
  const user = authState?.user?.data || {};
  const requiredFields = ["first_name", "last_name", "address", "city", "state", "pin_code"];
  const isProfileComplete = requiredFields.every((f) => user[f] && String(user[f]).trim());

  const [step, setStep] = useState(0);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [data, setData] = useState({
    manufacturer: "", title: "", description: "", equipment_type: "",
    available_start_time: "", available_end_time: "",
    equipment_location: "", daily_rental: "", hourly_rental: "",
    manufacturing_year: "", model: "", condition: "New",
    horsepower: "", width: "", height: "", weight: "",
    show_phone_number: false,
  });

  const [images, setImages] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});

  useEffect(() => {
    if (!Cookies.get("access-token")) navigate("/");
  }, [navigate]);

  useEffect(() => {
    async function load() {
      try {
        const [t, b] = await Promise.all([getEquipsList(), getBrands()]);
        if (t?.data) setEquipmentTypes(t.data);
        if (b?.data) setBrands(b.data);
      } catch (e) { console.log(e); }
    }
    load();
  }, []);

  const updateField = (field, value) => {
    setData((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const handleImageChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErrors((p) => ({ ...p, [key]: "Max 5MB" })); return; }
    if (!["image/jpeg", "image/png"].includes(file.type)) { setErrors((p) => ({ ...p, [key]: "JPG/PNG only" })); return; }
    setImages((p) => ({ ...p, [key]: file }));
    setImagePreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }));
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  const removeImage = (key) => {
    setImages((p) => { const n = { ...p }; delete n[key]; return n; });
    setImagePreviews((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Validation per step ──
  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!data.title || data.title.trim().length < 3) e.title = "Title must be at least 3 characters";
      if (!data.description || data.description.trim().length < 10) e.description = "Description must be at least 10 characters";
      if (!data.equipment_type) e.equipment_type = "Select equipment type";
      if (!data.manufacturer) e.manufacturer = "Select manufacturer";
      if (data.manufacturing_year && (data.manufacturing_year < 1950 || data.manufacturing_year > CURRENT_YEAR))
        e.manufacturing_year = `Year must be 1950-${CURRENT_YEAR}`;
    }
    if (s === 1) {
      const daily = parseInt(data.daily_rental) || 0;
      const hourly = parseInt(data.hourly_rental) || 0;
      if (daily <= 0 && hourly <= 0) e.daily_rental = "At least one rental price must be > ₹0";
      if (!data.available_start_time || !data.available_end_time) e.available_start_time = "Select availability dates";
      if (data.available_start_time && data.available_end_time && data.available_end_time <= data.available_start_time)
        e.available_end_time = "End date must be after start date";
    }
    if (s === 2) {
      if (!data.equipment_location || data.equipment_location.trim().length < 3)
        e.equipment_location = "Enter equipment location";
    }
    if (s === 3) {
      if (!images.image_1) e.image_1 = "At least one photo is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep(3)) { setStep(3); return; }
    setSubmitting(true);
    try {
      const res = await createEquipment(data, images);
      if (res?.data?.success) {
        navigate("/my-equipment");
      }
    } catch (err) {
      const errData = err?.response?.data;
      const errs = errData?.errors;
      const msg = errData?.message || errData?.msg || "Failed to create equipment.";
      if (errs && typeof errs === "object") {
        setErrors(errs);
        // Go back to first step with error
        const errorKeys = Object.keys(errs);
        if (errorKeys.some(k => ["title", "description", "equipment_type", "manufacturer"].includes(k))) setStep(0);
        else if (errorKeys.some(k => ["daily_rental", "hourly_rental", "available_start_time", "available_end_time"].includes(k))) setStep(1);
        else if (errorKeys.some(k => ["equipment_location"].includes(k))) setStep(2);
        else if (errorKeys.some(k => k.includes("image"))) setStep(3);
      } else {
        setErrors({ _global: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Profile Gate ──
  if (!isProfileComplete) {
    return (
      <div className="ap-page">
        <div className="ap-gate">
          <div className="ap-gate-icon">🚜</div>
          <h2>Complete Your Profile First</h2>
          <p>You need to fill in all required profile fields before listing equipment.</p>
          <button className="ap-btn-primary" onClick={() => navigate("/update-profile")}>
            Complete Profile
          </button>
        </div>
      </div>
    );
  }

  const getBrandName = (id) => brands.find((b) => String(b.id) === String(id))?.name || "—";
  const getTypeName = (id) => equipmentTypes.find((t) => String(t.id) === String(id))?.name || "—";

  return (
    <div className="ap-page">
      <div className="ap-container">
        {/* ── Header ── */}
        <div className="ap-header">
          <h1>List Your Equipment</h1>
          <p>Fill in the details to make your equipment available for rent</p>
        </div>

        {/* ── Progress Stepper ── */}
        <div className="ap-stepper">
          {STEPS.map((label, i) => (
            <div key={i} className={`ap-step ${i < step ? "done" : ""} ${i === step ? "active" : ""}`}>
              <div className="ap-step-circle">
                {i < step ? "✓" : i + 1}
              </div>
              <span className="ap-step-label">{label}</span>
              {i < STEPS.length - 1 && <div className="ap-step-line"></div>}
            </div>
          ))}
        </div>

        {/* ── Global Error ── */}
        {errors._global && <div className="ap-error-banner">{errors._global}</div>}

        {/* ── Step Content ── */}
        <div className="ap-card">
          {/* STEP 0: Basic Info */}
          {step === 0 && (
            <div className="ap-step-content">
              <h2 className="ap-card-title">Basic Information</h2>
              <div className="ap-field-grid">
                <div className="ap-field full">
                  <label>Equipment Title *</label>
                  <input type="text" placeholder="e.g. Mahindra 575 DI Tractor" value={data.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    className={errors.title ? "error" : ""} />
                  {errors.title && <span className="ap-field-error">{errors.title}</span>}
                </div>
                <div className="ap-field full">
                  <label>Description *</label>
                  <textarea placeholder="Describe your equipment in detail — condition, features, history, etc."
                    value={data.description} rows={4}
                    onChange={(e) => updateField("description", e.target.value)}
                    className={errors.description ? "error" : ""} />
                  {errors.description && <span className="ap-field-error">{errors.description}</span>}
                </div>
                <div className="ap-field">
                  <label>Equipment Type *</label>
                  <select value={data.equipment_type} onChange={(e) => updateField("equipment_type", e.target.value)}
                    className={errors.equipment_type ? "error" : ""}>
                    <option value="">Select Type</option>
                    {equipmentTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {errors.equipment_type && <span className="ap-field-error">{errors.equipment_type}</span>}
                </div>
                <div className="ap-field">
                  <label>Manufacturer *</label>
                  <select value={data.manufacturer} onChange={(e) => updateField("manufacturer", e.target.value)}
                    className={errors.manufacturer ? "error" : ""}>
                    <option value="">Select Brand</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {errors.manufacturer && <span className="ap-field-error">{errors.manufacturer}</span>}
                </div>
                <div className="ap-field">
                  <label>Condition</label>
                  <select value={data.condition} onChange={(e) => updateField("condition", e.target.value)}>
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                  </select>
                </div>
                <div className="ap-field">
                  <label>Model</label>
                  <input type="text" placeholder="e.g. 575 DI" value={data.model}
                    onChange={(e) => updateField("model", e.target.value)} />
                </div>
                <div className="ap-field">
                  <label>Manufacturing Year</label>
                  <input type="number" placeholder={`e.g. ${CURRENT_YEAR - 2}`} value={data.manufacturing_year}
                    min={1950} max={CURRENT_YEAR}
                    onChange={(e) => updateField("manufacturing_year", e.target.value)}
                    className={errors.manufacturing_year ? "error" : ""} />
                  {errors.manufacturing_year && <span className="ap-field-error">{errors.manufacturing_year}</span>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Pricing & Dates */}
          {step === 1 && (
            <div className="ap-step-content">
              <h2 className="ap-card-title">Pricing & Availability</h2>
              <div className="ap-field-grid">
                <div className="ap-field">
                  <label>Daily Rental (₹) *</label>
                  <div className="ap-input-icon">
                    <span>₹</span>
                    <input type="number" placeholder="e.g. 1500" value={data.daily_rental} min={0}
                      onChange={(e) => updateField("daily_rental", e.target.value)}
                      className={errors.daily_rental ? "error" : ""} />
                  </div>
                  {errors.daily_rental && <span className="ap-field-error">{errors.daily_rental}</span>}
                </div>
                <div className="ap-field">
                  <label>Hourly Rental (₹)</label>
                  <div className="ap-input-icon">
                    <span>₹</span>
                    <input type="number" placeholder="e.g. 200" value={data.hourly_rental} min={0}
                      onChange={(e) => updateField("hourly_rental", e.target.value)} />
                  </div>
                </div>
                <div className="ap-field">
                  <label>Available From *</label>
                  <input type="date" value={data.available_start_time} min={todayStr}
                    onChange={(e) => updateField("available_start_time", e.target.value)}
                    className={errors.available_start_time ? "error" : ""} />
                  {errors.available_start_time && <span className="ap-field-error">{errors.available_start_time}</span>}
                </div>
                <div className="ap-field">
                  <label>Available Until *</label>
                  <input type="date" value={data.available_end_time}
                    min={data.available_start_time || todayStr}
                    onChange={(e) => updateField("available_end_time", e.target.value)}
                    className={errors.available_end_time ? "error" : ""} />
                  {errors.available_end_time && <span className="ap-field-error">{errors.available_end_time}</span>}
                </div>
                <div className="ap-field full">
                  <div className="ap-toggle-row">
                    <div>
                      <label style={{ marginBottom: 0 }}>Show Phone Number</label>
                      <p className="ap-toggle-hint">Allow renters to see your phone number on this listing</p>
                    </div>
                    <label className="ap-toggle">
                      <input type="checkbox" checked={data.show_phone_number}
                        onChange={(e) => updateField("show_phone_number", e.target.checked)} />
                      <span className="ap-toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Specs & Location */}
          {step === 2 && (
            <div className="ap-step-content">
              <h2 className="ap-card-title">Specifications & Location</h2>
              <div className="ap-field-grid">
                <div className="ap-field full">
                  <label>Equipment Location *</label>
                  <input type="text" placeholder="e.g. Ahmedabad, Gujarat" value={data.equipment_location}
                    onChange={(e) => updateField("equipment_location", e.target.value)}
                    className={errors.equipment_location ? "error" : ""} />
                  {errors.equipment_location && <span className="ap-field-error">{errors.equipment_location}</span>}
                </div>
                <div className="ap-field">
                  <label>Horsepower (HP)</label>
                  <input type="number" placeholder="e.g. 50" value={data.horsepower} min={0}
                    onChange={(e) => updateField("horsepower", e.target.value)} />
                </div>
                <div className="ap-field">
                  <label>Weight (kg)</label>
                  <input type="number" placeholder="e.g. 2500" value={data.weight} min={0}
                    onChange={(e) => updateField("weight", e.target.value)} />
                </div>
                <div className="ap-field">
                  <label>Height (cm)</label>
                  <input type="number" placeholder="e.g. 150" value={data.height} min={0}
                    onChange={(e) => updateField("height", e.target.value)} />
                </div>
                <div className="ap-field">
                  <label>Width (cm)</label>
                  <input type="number" placeholder="e.g. 200" value={data.width} min={0}
                    onChange={(e) => updateField("width", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Photos */}
          {step === 3 && (
            <div className="ap-step-content">
              <h2 className="ap-card-title">Equipment Photos</h2>
              <p className="ap-card-subtitle">Upload at least 1 photo. Clear photos increase your rental chances!</p>
              {errors.image_1 && <div className="ap-error-banner">{errors.image_1}</div>}
              <div className="ap-image-grid">
                {["image_1", "image_2", "image_3", "image_4", "image_5"].map((key, i) => (
                  <div key={key} className={`ap-image-slot ${i === 0 ? "primary" : ""}`}>
                    {imagePreviews[key] ? (
                      <div className="ap-image-preview">
                        <img src={imagePreviews[key]} alt={`Photo ${i + 1}`} />
                        <button type="button" className="ap-image-remove" onClick={() => removeImage(key)}>✕</button>
                        {i === 0 && <span className="ap-image-badge">Main Photo</span>}
                      </div>
                    ) : (
                      <label className="ap-image-upload">
                        <input type="file" accept="image/jpeg,image/png" onChange={(e) => handleImageChange(e, key)} />
                        <div className="ap-image-placeholder">
                          <span className="ap-image-icon">📷</span>
                          <span>{i === 0 ? "Main Photo *" : `Photo ${i + 1}`}</span>
                        </div>
                      </label>
                    )}
                    {errors[key] && <span className="ap-field-error">{errors[key]}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="ap-step-content">
              <h2 className="ap-card-title">Review Your Listing</h2>
              <p className="ap-card-subtitle">Verify everything looks correct before publishing</p>

              <div className="ap-review-grid">
                <div className="ap-review-section">
                  <h3>Basic Info <button type="button" className="ap-btn-link" onClick={() => setStep(0)}>Edit</button></h3>
                  <div className="ap-review-row"><span>Title</span><strong>{data.title || "—"}</strong></div>
                  <div className="ap-review-row"><span>Type</span><strong>{getTypeName(data.equipment_type)}</strong></div>
                  <div className="ap-review-row"><span>Manufacturer</span><strong>{getBrandName(data.manufacturer)}</strong></div>
                  <div className="ap-review-row"><span>Condition</span><strong>{data.condition}</strong></div>
                  <div className="ap-review-row"><span>Model</span><strong>{data.model || "—"}</strong></div>
                  <div className="ap-review-row"><span>Mfg Year</span><strong>{data.manufacturing_year || "—"}</strong></div>
                  <div className="ap-review-row full"><span>Description</span><strong>{data.description || "—"}</strong></div>
                </div>

                <div className="ap-review-section">
                  <h3>Pricing & Dates <button type="button" className="ap-btn-link" onClick={() => setStep(1)}>Edit</button></h3>
                  <div className="ap-review-row"><span>Daily Rental</span><strong>₹{data.daily_rental || 0}</strong></div>
                  <div className="ap-review-row"><span>Hourly Rental</span><strong>₹{data.hourly_rental || 0}</strong></div>
                  <div className="ap-review-row"><span>Available</span><strong>{data.available_start_time} → {data.available_end_time}</strong></div>
                  <div className="ap-review-row"><span>Show Phone</span><strong>{data.show_phone_number ? "Yes" : "No"}</strong></div>
                </div>

                <div className="ap-review-section">
                  <h3>Location & Specs <button type="button" className="ap-btn-link" onClick={() => setStep(2)}>Edit</button></h3>
                  <div className="ap-review-row"><span>Location</span><strong>{data.equipment_location || "—"}</strong></div>
                  <div className="ap-review-row"><span>Horsepower</span><strong>{data.horsepower || "—"} HP</strong></div>
                  <div className="ap-review-row"><span>Weight</span><strong>{data.weight || "—"} kg</strong></div>
                  <div className="ap-review-row"><span>Dimensions</span><strong>{data.height || "—"}cm × {data.width || "—"}cm</strong></div>
                </div>

                <div className="ap-review-section">
                  <h3>Photos <button type="button" className="ap-btn-link" onClick={() => setStep(3)}>Edit</button></h3>
                  <div className="ap-review-photos">
                    {Object.entries(imagePreviews).map(([key, url]) => (
                      <img key={key} src={url} alt={key} className="ap-review-thumb" />
                    ))}
                    {Object.keys(imagePreviews).length === 0 && <span style={{ color: "#d1d5db" }}>No photos uploaded</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="ap-nav">
            {step > 0 && (
              <button type="button" className="ap-btn-outline" onClick={prevStep}>
                ← Previous
              </button>
            )}
            <div className="ap-nav-spacer"></div>
            {step < STEPS.length - 1 ? (
              <button type="button" className="ap-btn-primary" onClick={nextStep}>
                Next →
              </button>
            ) : (
              <button type="button" className="ap-btn-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Publishing..." : "🚀 Publish Equipment"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
