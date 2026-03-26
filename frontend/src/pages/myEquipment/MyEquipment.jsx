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
    const navigate = useNavigate();

    useEffect(() => {
        if (!Cookies.get("access-token")) {
            navigate("/login");
            return;
        }
        fetchEquipments();
    }, [navigate]);

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

    async function handleDelete(id) {
        if (!window.confirm("Are you sure you want to delete this equipment? This action cannot be undone.")) return;
        try {
            await deleteEquipment(id);
            setEquipments((prev) => prev.filter((eq) => eq.id !== id));
        } catch (err) {
            alert("Failed to delete equipment. Please try again.");
        }
    }

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
        });
    }

    async function handleEditSave() {
        try {
            await updateEquipment(editItem.id, editForm);
            setEditItem(null);
            fetchEquipments();
        } catch (err) {
            alert("Failed to update equipment. Please try again.");
        }
    }

    const getImageSrc = (eq) => {
        if (eq.image) return eq.image;
        if (eq.image_1) return eq.image_1;
        if (eq.image_2) return eq.image_2;
        if (eq.image_3) return eq.image_3;
        return item1;
    };

    if (loading) {
        return (
            <div className="my-equipment-container">
                <div className="loading-state">Loading your equipment...</div>
            </div>
        );
    }

    return (
        <div className="my-equipment-container">
            <div className="my-equipment-header">
                <h1>My Equipment</h1>
                <button className="add-equipment-btn" onClick={() => navigate("/addProduct")}>
                    + Add New Equipment
                </button>
            </div>

            {equipments.length === 0 ? (
                <div className="empty-state">
                    <h2>No equipment listed yet</h2>
                    <p>Start by adding your first equipment for rental.</p>
                    <button className="add-equipment-btn" onClick={() => navigate("/addProduct")}>
                        + Add Equipment
                    </button>
                </div>
            ) : (
                <div className="equipment-grid">
                    {equipments.map((eq) => (
                        <div key={eq.id} className="equipment-card">
                            <img
                                src={getImageSrc(eq)}
                                alt={eq.title}
                                className="equipment-card-image"
                                onError={(e) => { e.target.src = item1; }}
                            />
                            <div className="equipment-card-body">
                                <h3 className="equipment-card-title">{eq.title}</h3>
                                <p className="equipment-card-model">
                                    {eq.manufacturer || ""} {eq.model ? `• ${eq.model}` : ""} {eq.manufacturing_year ? `(${eq.manufacturing_year})` : ""}
                                </p>
                                {eq.equipment_location && (
                                    <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>📍 {eq.equipment_location}</p>
                                )}
                                <span className={`equipment-card-status ${eq.is_available ? "status-available" : "status-unavailable"}`}>
                                    {eq.is_available ? "Not Booked" : "Booked"}
                                </span>
                                <div className="equipment-card-details">
                                    <span>Daily: <strong>₹{eq.daily_rental}</strong></span>
                                    <span>Hourly: <strong>₹{eq.hourly_rental}</strong></span>
                                </div>
                                <div className="equipment-card-actions">
                                    <button className="btn-view" onClick={() => navigate(`/product/${eq.eq_id}`)}>
                                        View
                                    </button>
                                    <button className="btn-edit" onClick={() => openEdit(eq)}>
                                        Edit
                                    </button>
                                    <button className="btn-delete" onClick={() => handleDelete(eq.id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editItem && (
                <div className="edit-modal-overlay" onClick={() => setEditItem(null)}>
                    <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Edit Equipment</h2>
                        <label>Title</label>
                        <input
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        />
                        <label>Description</label>
                        <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                        <label>Daily Rental (₹)</label>
                        <input
                            type="number"
                            value={editForm.daily_rental}
                            onChange={(e) => setEditForm({ ...editForm, daily_rental: e.target.value })}
                        />
                        <label>Hourly Rental (₹)</label>
                        <input
                            type="number"
                            value={editForm.hourly_rental}
                            onChange={(e) => setEditForm({ ...editForm, hourly_rental: e.target.value })}
                        />
                        <label>Location</label>
                        <input
                            value={editForm.equipment_location}
                            onChange={(e) => setEditForm({ ...editForm, equipment_location: e.target.value })}
                        />
                        <label>Condition</label>
                        <select
                            value={editForm.condition}
                            onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                        >
                            <option value="New">New</option>
                            <option value="Used">Used</option>
                        </select>
                        <label>Weight (lbs)</label>
                        <input
                            type="number"
                            value={editForm.weight}
                            onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                        />
                        <label>Horsepower</label>
                        <input
                            type="number"
                            value={editForm.horsepower}
                            onChange={(e) => setEditForm({ ...editForm, horsepower: e.target.value })}
                        />
                        <div className="edit-modal-actions">
                            <button className="btn-cancel" onClick={() => setEditItem(null)}>Cancel</button>
                            <button className="btn-save" onClick={handleEditSave}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyEquipment;
