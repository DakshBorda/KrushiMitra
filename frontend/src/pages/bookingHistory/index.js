import React, { useState, useEffect, useMemo } from "react";
import Cookies from "js-cookie";
import { format } from "date-fns";
import { getBooking, getBookingOwner, BookingUpdate } from "../../api/bookingAPI";
import { useNavigate } from "react-router-dom";
import "./BookingHistory.css";

// ── Error extraction utility — handles all DRF ValidationError shapes ──
const extractErrorMsg = (err) => {
    const d = err?.response?.data;
    if (!d) return 'Something went wrong. Please try again.';
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d[0];
    if (d.detail) return d.detail;
    if (d.message) return Array.isArray(d.message) ? d.message[0] : d.message;
    if (d.non_field_errors) return Array.isArray(d.non_field_errors) ? d.non_field_errors[0] : d.non_field_errors;
    const firstKey = Object.keys(d).find(k => k !== 'status');
    if (firstKey && d[firstKey]) {
        const val = d[firstKey];
        return Array.isArray(val) ? val[0] : val;
    }
    return 'Operation failed. Please try again.';
};

// ── Status configuration — clean, no emoji ──
const STATUS_CONFIG = {
  Pending:         { label: "Pending",            color: "#d97706", bg: "#fef3c7", icon: "fa-clock" },
  Accepted:        { label: "Confirmed",          color: "#16a34a", bg: "#dcfce7", icon: "fa-circle-check" },
  Rejected:        { label: "Declined",           color: "#dc2626", bg: "#fee2e2", icon: "fa-circle-xmark" },
  AutoRejected:    { label: "Auto Declined",      color: "#ea580c", bg: "#fed7aa", icon: "fa-rotate" },
  Cancelled:       { label: "Cancelled",          color: "#6b7280", bg: "#f3f4f6", icon: "fa-ban" },
  CancelledByOwner:{ label: "Owner Cancelled",    color: "#be123c", bg: "#fce7f3", icon: "fa-rectangle-xmark" },
  Expired:         { label: "Expired",            color: "#9ca3af", bg: "#f3f4f6", icon: "fa-hourglass-end" },
  Inprogress:      { label: "In Progress",        color: "#ea580c", bg: "#fff7ed", icon: "fa-spinner" },
  Completed:       { label: "Completed",          color: "#2563eb", bg: "#dbeafe", icon: "fa-flag-checkered" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

const REJECTION_REASONS = {
  1: "Equipment not available on these dates",
  2: "Equipment under maintenance/repair",
  3: "Location too far",
  4: "Booking duration too short/long",
  5: "Other",
};

const BookingHistory = () => {
  const [tab, setTab] = useState("customer");
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerPendingCount, setOwnerPendingCount] = useState(0);

  // Quick-action state
  const [actionLoading, setActionLoading] = useState(null); // booking id being acted on
  const [showRejectModal, setShowRejectModal] = useState(null); // booking item for rejection
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    if (!Cookies.get("access-token")) navigate("/");
  }, [navigate]);

  useEffect(() => {
    fetchCustomerBookings();
    getBookingOwner().then(res => {
      const ownerData = res?.data?.results || res?.data || [];
      const pending = ownerData.filter(b => b.status === "Pending").length;
      setOwnerPendingCount(pending);
    }).catch(() => {});
  }, []);

  async function fetchCustomerBookings() {
    setLoading(true);
    try {
      const { data } = await getBooking();
      setBookings(data?.results || data || []);
    } catch (err) {
      console.log("Error fetching customer bookings:", err);
      setBookings([]);
    } finally {
      setLoading(false);
      setActiveStatus("All");
      setSearchQuery("");
    }
  }

  async function fetchOwnerBookings() {
    setLoading(true);
    try {
      const { data } = await getBookingOwner();
      const ownerData = data?.results || data || [];
      setBookings(ownerData);
      setOwnerPendingCount(ownerData.filter(b => b.status === "Pending").length);
    } catch (err) {
      console.log("Error fetching owner bookings:", err);
      setBookings([]);
    } finally {
      setLoading(false);
      setActiveStatus("All");
      setSearchQuery("");
    }
  }

  function switchTab(newTab) {
    setTab(newTab);
    setActionError("");
    setActionSuccess("");
    if (newTab === "customer") fetchCustomerBookings();
    else fetchOwnerBookings();
  }

  // ── Quick Actions ──
  const handleQuickAccept = async (item) => {
    // ── Frontend guard: check if booking window has passed ──
    const endDate = item.end_date ? new Date(item.end_date + 'T00:00:00') : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (endDate && today > endDate) {
      setActionError(`Cannot accept — the booking window has passed (ended ${item.end_date}). Please decline it instead.`);
      return;
    }
    if (!window.confirm(`Accept booking ${item.booking_id} from ${item.customer?.first_name} ${item.customer?.last_name}?`)) return;
    setActionLoading(item.id);
    setActionError("");
    setActionSuccess("");
    try {
      await BookingUpdate("Accepted", item.id);
      setActionSuccess(`Booking ${item.booking_id} has been confirmed.`);
      fetchOwnerBookings();
    } catch (err) {
      setActionError(extractErrorMsg(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickReject = async () => {
    if (!rejectionReason) { setActionError("Please select a reason."); return; }
    if (parseInt(rejectionReason) === 5 && !rejectionNote.trim()) { setActionError("Please provide a note for 'Other'."); return; }
    setActionLoading(showRejectModal.id);
    setActionError("");
    try {
      await BookingUpdate("Rejected", showRejectModal.id, {
        rejection_reason: parseInt(rejectionReason),
        rejection_note: rejectionNote,
      });
      setActionSuccess(`Booking ${showRejectModal.booking_id} has been declined.`);
      setShowRejectModal(null);
      setRejectionReason("");
      setRejectionNote("");
      fetchOwnerBookings();
    } catch (err) {
      setActionError(extractErrorMsg(err));
    } finally {
      setActionLoading(null);
    }
  };

  // ── Filtered data ──
  const filtered = useMemo(() => {
    return bookings.filter((item) => {
      const matchStatus = activeStatus === "All" || item.status === activeStatus;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        item.booking_id?.toLowerCase().includes(q) ||
        item.equipment?.title?.toLowerCase().includes(q) ||
        item.equipment?.manufacturer?.toLowerCase().includes(q) ||
        item.customer?.first_name?.toLowerCase().includes(q) ||
        item.customer?.last_name?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [bookings, activeStatus, searchQuery]);

  // ── Stats ──
  const pendingCount = bookings.filter(b => b.status === "Pending").length;
  const activeCount = bookings.filter(b => b.status === "Accepted" || b.status === "Inprogress").length;
  const completedCount = bookings.filter(b => b.status === "Completed").length;
  const totalAmount = bookings.reduce((sum, item) => {
    if (item.total_daily_rent) return sum + parseFloat(item.total_daily_rent);
    if (item.start_date && item.end_date && item.equipment?.daily_rental) {
      const days = Math.max(
        Math.ceil((new Date(item.end_date) - new Date(item.start_date)) / (1000 * 60 * 60 * 24)) + 1, 1
      );
      return sum + days * parseFloat(item.equipment.daily_rental);
    }
    return sum;
  }, 0);

  const statusCounts = useMemo(() => {
    const counts = { All: bookings.length };
    ALL_STATUSES.forEach(s => { counts[s] = bookings.filter(b => b.status === s).length; });
    return counts;
  }, [bookings]);

  return (
    <div className="bh-page">
      <div className="bh-container">
        {/* ── Tab Switcher ── */}
        <div className="bh-tabs">
          <button
            className={`bh-tab ${tab === "customer" ? "active" : ""}`}
            onClick={() => switchTab("customer")}
          >
            <i className="fa-solid fa-receipt" style={{ marginRight: '8px' }}></i>
            My Bookings
          </button>
          <button
            className={`bh-tab ${tab === "owner" ? "active" : ""}`}
            onClick={() => switchTab("owner")}
          >
            <i className="fa-solid fa-inbox" style={{ marginRight: '8px' }}></i>
            Incoming Requests
            {ownerPendingCount > 0 && (
              <span className="bh-tab-badge">{ownerPendingCount}</span>
            )}
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div className="bh-stats">
          <div className="bh-stat-card">
            <div className="bh-stat-value">{bookings.length}</div>
            <div className="bh-stat-label">Total</div>
          </div>
          <div className={`bh-stat-card ${pendingCount > 0 ? "pending" : ""}`}>
            <div className="bh-stat-value">{pendingCount}</div>
            <div className="bh-stat-label">Pending</div>
          </div>
          <div className={`bh-stat-card ${activeCount > 0 ? "active" : ""}`}>
            <div className="bh-stat-value">{activeCount}</div>
            <div className="bh-stat-label">Active</div>
          </div>
          <div className="bh-stat-card completed">
            <div className="bh-stat-value">{completedCount}</div>
            <div className="bh-stat-label">Completed</div>
          </div>
          <div className="bh-stat-card revenue">
            <div className="bh-stat-value">₹{totalAmount.toLocaleString("en-IN")}</div>
            <div className="bh-stat-label">{tab === "owner" ? "Earned" : "Spent"}</div>
          </div>
        </div>

        {/* ── Action Messages ── */}
        {actionError && <div className="bh-action-msg error"><i className="fa-solid fa-circle-exclamation"></i> {actionError}</div>}
        {actionSuccess && <div className="bh-action-msg success"><i className="fa-solid fa-circle-check"></i> {actionSuccess}</div>}

        {/* ── Search + Status Pills ── */}
        <div className="bh-toolbar">
          <div className="bh-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search by booking ID, equipment, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="bh-filter-pills">
            <button
              className={`bh-pill ${activeStatus === "All" ? "active" : ""}`}
              onClick={() => setActiveStatus("All")}
            >
              All ({statusCounts.All})
            </button>
            {ALL_STATUSES.filter(s => statusCounts[s] > 0).map(s => (
              <button
                key={s}
                className={`bh-pill ${activeStatus === s ? "active" : ""}`}
                onClick={() => setActiveStatus(s)}
                style={activeStatus === s ? { background: STATUS_CONFIG[s].bg, color: STATUS_CONFIG[s].color, borderColor: STATUS_CONFIG[s].color } : {}}
              >
                <i className={`fa-solid ${STATUS_CONFIG[s].icon}`} style={{ marginRight: '4px', fontSize: '10px' }}></i>
                {STATUS_CONFIG[s].label} ({statusCounts[s]})
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="bh-loading">
            <div className="bh-spinner"></div>
            <p>Loading bookings...</p>
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && filtered.length === 0 && (
          <div className="bh-empty">
            <i className={`fa-solid ${bookings.length === 0 ? "fa-inbox" : "fa-magnifying-glass"}`} style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px', display: 'block' }}></i>
            <h2>{bookings.length === 0 ? "No bookings yet" : "No matching bookings"}</h2>
            <p>{bookings.length === 0
              ? (tab === "customer" ? "Start by browsing equipment and making your first booking." : "No one has booked your equipment yet.")
              : "Try adjusting your search or filter."
            }</p>
            {bookings.length === 0 && tab === "customer" && (
              <button onClick={() => navigate("/dashboard")} className="bh-btn-primary">
                Browse Equipment
              </button>
            )}
          </div>
        )}

        {/* ── Booking Table ── */}
        {!loading && filtered.length > 0 && (
          <div className="bh-table-wrap">
            <div className="bh-table-header">
              <h2>
                {tab === "owner" ? "Incoming Requests" : "Booking History"}
                <span className="bh-table-count">({filtered.length})</span>
              </h2>
            </div>
            <table className="bh-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Booking ID</th>
                  <th>Equipment</th>
                  {tab === "owner" && <th>Customer</th>}
                  <th>Period</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: "#999", bg: "#f3f4f6", icon: "fa-circle-question" };
                  const days = item.number_of_days || (item.start_date && item.end_date
                    ? Math.max(Math.ceil((new Date(item.end_date) - new Date(item.start_date)) / (1000 * 60 * 60 * 24)) + 1, 1)
                    : 1);
                  const cost = item.total_daily_rent || (item.equipment?.daily_rental ? days * item.equipment.daily_rental : 0);
                  const isPending = item.status === "Pending";
                  const isActing = actionLoading === item.id;
                  // Check if booking window has passed (for disabling quick-accept)
                  const itemEndDate = item.end_date ? new Date(item.end_date + 'T00:00:00') : null;
                  const itemNow = new Date(); itemNow.setHours(0, 0, 0, 0);
                  const isWindowPassed = itemEndDate ? itemNow > itemEndDate : false;

                  return (
                    <tr key={item.id}
                      className={tab === "owner" && isPending ? "highlight" : ""}
                    >
                      <td className="bh-td-date">
                        {item.created_at ? format(new Date(item.created_at), "dd MMM yyyy") : "—"}
                      </td>
                      <td>
                        <span className="bh-booking-id">{item.booking_id}</span>
                      </td>
                      <td className="bh-td-equipment">
                        {item.equipment?.title || "—"}
                      </td>
                      {tab === "owner" && (
                        <td className="bh-td-customer">
                          {item.customer?.first_name} {item.customer?.last_name}
                        </td>
                      )}
                      <td className="bh-td-period">
                        <span className="bh-dates">
                          {item.start_date} → {item.end_date}
                        </span>
                        <span className="bh-days">{days}d</span>
                      </td>
                      <td className="bh-td-cost">
                        ₹{parseFloat(cost).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className="bh-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                          <i className={`fa-solid ${cfg.icon}`} style={{ fontSize: '10px', marginRight: '4px' }}></i>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="bh-td-actions">
                        {/* Owner pending: show inline quick actions */}
                        {tab === "owner" && isPending ? (
                          <div className="bh-inline-actions">
                            <button
                              className="bh-action-accept"
                              disabled={isActing || isWindowPassed}
                              onClick={(e) => { e.stopPropagation(); handleQuickAccept(item); }}
                              title={isWindowPassed ? 'Booking window has passed' : 'Accept this booking'}
                            >
                              <i className="fa-solid fa-check"></i>
                            </button>
                            <button
                              className="bh-action-decline"
                              disabled={isActing}
                              onClick={(e) => { e.stopPropagation(); setActionError(""); setShowRejectModal(item); }}
                              title="Decline this booking"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                            <button
                              onClick={() => navigate(`/bookingRequest/${item.id}`)}
                              className="bh-btn-details"
                              title="View full details"
                            >
                              Details
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => navigate(`/bookingRequest/${item.id}`)}
                            className="bh-btn-details"
                          >
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════ */}
      {/*  REJECTION MODAL                          */}
      {/* ══════════════════════════════════════════ */}
      {showRejectModal && (
        <div className="bh-modal-overlay" onClick={() => { setShowRejectModal(null); setRejectionReason(""); setRejectionNote(""); setActionError(""); }}>
          <div className="bh-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="bh-modal-title">Decline Booking</h2>
            <p className="bh-modal-subtitle">
              {showRejectModal.booking_id} — {showRejectModal.equipment?.title}
            </p>
            <p className="bh-modal-label">
              Reason for declining <span style={{ color: '#dc2626' }}>*</span>
            </p>
            <div className="bh-radio-group">
              {Object.entries(REJECTION_REASONS).map(([key, label]) => (
                <label key={key} className={`bh-radio-option ${rejectionReason === key ? 'selected' : ''}`}>
                  <input type="radio" name="rejectionReason" value={key}
                    checked={rejectionReason === key}
                    onChange={(e) => setRejectionReason(e.target.value)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="bh-modal-label">
                Additional note {parseInt(rejectionReason) === 5 ? <span style={{ color: '#dc2626' }}>*</span> : '(optional)'}:
              </label>
              <textarea className="bh-textarea" value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Provide more details..." maxLength={500} rows={3} />
            </div>
            {actionError && <div className="bh-action-msg error" style={{ marginBottom: '12px' }}><i className="fa-solid fa-circle-exclamation"></i> {actionError}</div>}
            <div className="bh-modal-actions">
              <button className="bh-modal-btn secondary" onClick={() => { setShowRejectModal(null); setRejectionReason(""); setRejectionNote(""); setActionError(""); }}>
                Cancel
              </button>
              <button className="bh-modal-btn primary-danger" disabled={actionLoading} onClick={handleQuickReject}>
                {actionLoading ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHistory;
