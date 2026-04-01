import React, { useEffect, useState, useMemo } from 'react'
import './BookingRequest.css';
import { getBookingDetail, BookingUpdate } from '../../api/bookingAPI';
import { useNavigate, useParams } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useSelector } from 'react-redux';

// ── Error extraction utility — handles all DRF ValidationError shapes ──
const extractErrorMsg = (err) => {
    const d = err?.response?.data;
    if (!d) return 'Something went wrong. Please try again.';
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d[0];
    if (d.detail) return d.detail;
    if (d.message) return Array.isArray(d.message) ? d.message[0] : d.message;
    if (d.non_field_errors) return Array.isArray(d.non_field_errors) ? d.non_field_errors[0] : d.non_field_errors;
    // Flatten first key's first error (skip 'status' boolean)
    const firstKey = Object.keys(d).find(k => k !== 'status');
    if (firstKey && d[firstKey]) {
        const val = d[firstKey];
        return Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : JSON.stringify(val));
    }
    return 'Failed to update booking.';
};

// ── Status configuration — clean, professional ──
const STATUS_CONFIG = {
    Pending:          { label: 'Pending',            color: '#d97706', bg: '#fef3c7', icon: 'fa-clock' },
    Accepted:         { label: 'Confirmed',          color: '#16a34a', bg: '#dcfce7', icon: 'fa-circle-check' },
    Rejected:         { label: 'Declined',           color: '#dc2626', bg: '#fee2e2', icon: 'fa-circle-xmark' },
    AutoRejected:     { label: 'Auto Declined',      color: '#ea580c', bg: '#fed7aa', icon: 'fa-rotate' },
    Cancelled:        { label: 'Cancelled',          color: '#6b7280', bg: '#f3f4f6', icon: 'fa-ban' },
    CancelledByOwner: { label: 'Owner Cancelled',    color: '#be123c', bg: '#fce7f3', icon: 'fa-rectangle-xmark' },
    Expired:          { label: 'Expired',            color: '#9ca3af', bg: '#f3f4f6', icon: 'fa-hourglass-end' },
    Inprogress:       { label: 'In Progress',        color: '#ea580c', bg: '#fff7ed', icon: 'fa-spinner' },
    Completed:        { label: 'Completed',          color: '#2563eb', bg: '#dbeafe', icon: 'fa-flag-checkered' },
};

const REJECTION_REASONS = {
    1: "Equipment not available on these dates",
    2: "Equipment under maintenance/repair",
    3: "Location too far",
    4: "Booking duration too short/long",
    5: "Other",
};

const OWNER_CANCEL_REASONS = {
    1: "Equipment breakdown",
    2: "Personal/family emergency",
    3: "Scheduling conflict / double booking",
    4: "Other",
};

const TERMINAL_STATUSES = ['Completed', 'Rejected', 'AutoRejected', 'Cancelled', 'CancelledByOwner', 'Expired'];

// Clean stepper config — numbered steps, no emoji
const STEP_LABELS = ['Request Sent', 'Confirmed', 'In Progress', 'Completed'];
const STEP_ICONS = ['fa-paper-plane', 'fa-circle-check', 'fa-truck', 'fa-flag-checkered'];

const BookingRequest = () => {
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showRulesPanel, setShowRulesPanel] = useState(false);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showOwnerCancelModal, setShowOwnerCancelModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionNote, setRejectionNote] = useState('');
    const [ownerCancelReason, setOwnerCancelReason] = useState('');
    const [ownerCancelNote, setOwnerCancelNote] = useState('');

    const navigate = useNavigate();
    const params = useParams();
    const authState = useSelector((state) => state.authReducer);
    const currentUserId = authState?.user?.data?.id || authState?.user?.id || null;

    useEffect(() => {
        if (!Cookies.get('access-token')) navigate('/');
    }, [navigate]);

    useEffect(() => {
        if (params.id) {
            setLoading(true);
            getBookingDetail(params.id)
                .then(res => setBooking(res?.data))
                .catch(() => setError('Could not load booking details.'))
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    const isOwner = currentUserId != null && booking?.owner?.id != null && String(currentUserId) === String(booking.owner.id);
    const isCustomer = currentUserId != null && booking?.customer?.id != null && String(currentUserId) === String(booking.customer.id);
    const statusCfg = STATUS_CONFIG[booking?.status] || { label: booking?.status, color: '#999', bg: '#f3f4f6', icon: 'fa-circle-question' };
    const isTerminal = booking && TERMINAL_STATUSES.includes(booking.status);

    // ── Smart Date Flags (drive UI state) ──
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = useMemo(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    }, [todayStr]); // eslint-disable-line react-hooks/exhaustive-deps
    const startDate = booking?.start_date ? new Date(booking.start_date + 'T00:00:00') : null;
    const endDate = booking?.end_date ? new Date(booking.end_date + 'T00:00:00') : null;
    const isBookingWindowPassed = endDate ? today > endDate : false;
    const isStartDateReached = startDate ? today >= startDate : false;
    const isStartDatePassed = startDate ? today > startDate : false;
    const isOverdue = booking?.status === 'Inprogress' && isBookingWindowPassed;
    const hoursUntilStart = startDate ? (startDate.getTime() - Date.now()) / (1000 * 60 * 60) : 999;
    const canCustomerCancel = booking?.status === 'Pending' || (booking?.status === 'Accepted' && hoursUntilStart >= 24);
    const canOwnerAccept = !isBookingWindowPassed;
    const canOwnerStart = isStartDateReached && !isBookingWindowPassed;

    const numberOfDays = booking?.number_of_days || (booking?.start_date && booking?.end_date
        ? Math.max(Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / (1000 * 60 * 60 * 24)) + 1, 1) : 1);
    const totalCost = booking?.total_daily_rent || (booking?.equipment?.daily_rental ? numberOfDays * booking.equipment.daily_rental : 0);

    // Stepper index
    const getStepIndex = (status) => {
        switch (status) {
            case 'Pending': return 0;
            case 'Accepted': return 1;
            case 'Inprogress': return 2;
            case 'Completed': return 3;
            default: return -1;
        }
    };

    // Deadline
    const getDeadlineInfo = () => {
        if (!booking?.response_deadline || booking.status !== 'Pending') return null;
        const deadline = new Date(booking.response_deadline);
        const now = new Date();
        const hoursLeft = Math.max(0, (deadline - now) / (1000 * 60 * 60));
        if (hoursLeft <= 0) return { text: 'Deadline passed', urgent: true };
        if (hoursLeft <= 12) return { text: `${Math.ceil(hoursLeft)}h remaining`, urgent: true };
        return { text: `Respond by ${deadline.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`, urgent: false };
    };

    // ── Status update handler ──
    const handleStatusUpdate = async (newStatus, extras = {}) => {
        setError(''); setSuccessMsg(''); setUpdating(true);
        try {
            await BookingUpdate(newStatus, params.id, extras);
            setSuccessMsg(`Booking has been ${newStatus.toLowerCase()}.`);
            const { data } = await getBookingDetail(params.id);
            setBooking(data);
        } catch (err) {
            setError(extractErrorMsg(err));
        } finally { setUpdating(false); }
    };

    const handleReject = async () => {
        if (!rejectionReason) { setError('Please select a rejection reason.'); return; }
        if (parseInt(rejectionReason) === 5 && !rejectionNote.trim()) { setError('Please provide a note for "Other".'); return; }
        await handleStatusUpdate('Rejected', { rejection_reason: parseInt(rejectionReason), rejection_note: rejectionNote });
        setShowRejectModal(false); setRejectionReason(''); setRejectionNote('');
    };

    const handleOwnerCancel = async () => {
        if (!ownerCancelReason) { setError('Please select a cancellation reason.'); return; }
        if (parseInt(ownerCancelReason) === 4 && !ownerCancelNote.trim()) { setError('Please provide a note for "Other".'); return; }
        await handleStatusUpdate('CancelledByOwner', { owner_cancellation_reason: parseInt(ownerCancelReason), owner_cancellation_note: ownerCancelNote });
        setShowOwnerCancelModal(false); setOwnerCancelReason(''); setOwnerCancelNote('');
    };

    const deadlineInfo = booking ? getDeadlineInfo() : null;
    const stepIndex = booking ? getStepIndex(booking.status) : -1;

    // ── Business Rules — context-aware ──
    const businessRules = useMemo(() => {
        if (!booking) return [];
        const rules = [];
        const status = booking.status;

        // ── Platform-wide rules (always shown) ──
        rules.push({
            id: 'R-SYS-1',
            icon: 'fa-shield-halved',
            type: 'info',
            title: 'Maximum Booking Duration',
            text: 'Each booking is limited to a maximum of 30 consecutive days to ensure fair access for all users.',
        });
        rules.push({
            id: 'R-SYS-2',
            icon: 'fa-layer-group',
            type: 'info',
            title: 'Pending Request Limit',
            text: 'Customers can have at most 5 pending booking requests at any time. Additional requests require existing ones to be resolved or cancelled.',
        });
        rules.push({
            id: 'R-SYS-3',
            icon: 'fa-calendar-plus',
            type: 'info',
            title: 'Advance Booking Required',
            text: 'Bookings must be made at least 1 day in advance. Same-day bookings are not allowed, as equipment owners need preparation time.',
        });

        // ── Owner-specific rules ──
        if (isOwner) {
            if (status === 'Pending') {
                rules.push({
                    id: 'R-OWN-1',
                    icon: 'fa-hourglass-half',
                    type: 'warning',
                    title: '48-Hour Response Window',
                    text: 'You must respond to this booking request within 48 hours of its creation. If no action is taken, the booking will automatically expire.',
                });
                rules.push({
                    id: 'R-OWN-2',
                    icon: 'fa-rotate',
                    type: 'info',
                    title: 'Automatic Conflict Resolution',
                    text: 'Accepting this booking will automatically decline all other pending requests that have overlapping dates for this equipment.',
                });
                rules.push({
                    id: 'R-OWN-3',
                    icon: 'fa-clipboard-list',
                    type: 'info',
                    title: 'Rejection Requires a Reason',
                    text: 'If you decline this request, you must select a reason. This helps the customer understand and find alternatives.',
                });
                // C2: Expired window warning
                if (isBookingWindowPassed) {
                    rules.push({
                        id: 'R-OWN-7',
                        icon: 'fa-calendar-xmark',
                        type: 'danger',
                        title: 'Booking Window Has Passed',
                        text: `This booking's rental period (${booking.start_date} to ${booking.end_date}) has already passed. You can only decline this request.`,
                    });
                }
                // C3: Equipment availability check
                rules.push({
                    id: 'R-OWN-8',
                    icon: 'fa-toggle-on',
                    type: 'info',
                    title: 'Equipment Availability Cross-Check',
                    text: 'When you accept a booking, the system verifies your equipment is still marked as available. If you\'ve toggled it off, you must re-enable it first.',
                });
            }
            if (status === 'Accepted') {
                rules.push({
                    id: 'R-OWN-4',
                    icon: 'fa-calendar-check',
                    type: 'warning',
                    title: 'Start Date Enforcement',
                    text: `Equipment can only be marked as "In Progress" on or after the scheduled start date (${booking.start_date}). Early activation is not permitted.`,
                });
                // C4: Window closure guard
                if (isBookingWindowPassed) {
                    rules.push({
                        id: 'R-OWN-9',
                        icon: 'fa-calendar-xmark',
                        type: 'danger',
                        title: 'Booking Window Closed',
                        text: `The rental window ended on ${booking.end_date}. The "In Progress" action is no longer available. Please cancel or contact the customer.`,
                    });
                }
                rules.push({
                    id: 'R-OWN-5',
                    icon: 'fa-triangle-exclamation',
                    type: 'danger',
                    title: 'Owner Cancellation Impact',
                    text: 'Cancelling a confirmed booking negatively impacts your reliability score. A mandatory reason must be provided, and the customer will be notified immediately.',
                });
            }
            if (status === 'Inprogress') {
                rules.push({
                    id: 'R-OWN-6',
                    icon: 'fa-forward',
                    type: 'info',
                    title: 'One-Way Progression',
                    text: 'Once in progress, the booking can only be moved to "Completed". This action is irreversible. Ensure the rental period is fully concluded before completing.',
                });
                // C5: Overdue detection
                if (isOverdue) {
                    const overdueDays = endDate ? Math.floor((today - endDate) / (1000 * 60 * 60 * 24)) : 0;
                    rules.push({
                        id: 'R-OWN-10',
                        icon: 'fa-clock',
                        type: 'danger',
                        title: `Rental Overdue by ${overdueDays} Day${overdueDays !== 1 ? 's' : ''}`,
                        text: `The scheduled end date (${booking.end_date}) has passed. Please mark this booking as completed immediately to close the rental cycle.`,
                    });
                }
            }
        }

        // ── Customer-specific rules ──
        if (isCustomer) {
            if (status === 'Pending') {
                rules.push({
                    id: 'R-CUST-1',
                    icon: 'fa-ban',
                    type: 'info',
                    title: 'Free Cancellation',
                    text: 'Pending requests can be cancelled at any time without penalty. The equipment owner has not yet committed to this booking.',
                });
            }
            if (status === 'Accepted') {
                // C6: Smart cancellation display
                if (canCustomerCancel) {
                    const hoursLeft = Math.floor(hoursUntilStart - 24);
                    rules.push({
                        id: 'R-CUST-2',
                        icon: 'fa-clock-rotate-left',
                        type: 'warning',
                        title: '24-Hour Cancellation Policy',
                        text: `Confirmed bookings can only be cancelled at least 24 hours before the start date (${booking.start_date}). You have approximately ${hoursLeft > 0 ? hoursLeft + ' hours' : 'limited time'} left to cancel.`,
                    });
                } else {
                    rules.push({
                        id: 'R-CUST-2',
                        icon: 'fa-lock',
                        type: 'danger',
                        title: 'Cancellation Window Closed',
                        text: `The start date (${booking.start_date}) is less than 24 hours away. Cancellation is no longer possible. Contact the owner via chat if you need assistance.`,
                    });
                }
                rules.push({
                    id: 'R-CUST-3',
                    icon: 'fa-handshake',
                    type: 'info',
                    title: 'Binding Confirmation',
                    text: 'This booking has been confirmed by the owner. The equipment is reserved exclusively for you during the booked period.',
                });
            }
            if (status === 'Inprogress') {
                rules.push({
                    id: 'R-CUST-4',
                    icon: 'fa-truck',
                    type: 'info',
                    title: 'Rental Active',
                    text: 'The equipment is currently with you. Cancellation is no longer possible. Contact the owner via chat for any issues.',
                });
                if (isOverdue) {
                    rules.push({
                        id: 'R-CUST-5',
                        icon: 'fa-clock',
                        type: 'warning',
                        title: 'Rental Period Exceeded',
                        text: `The scheduled end date (${booking.end_date}) has passed. Please return the equipment to the owner as soon as possible.`,
                    });
                }
            }
        }

        // ── Terminal status rules ──
        if (TERMINAL_STATUSES.includes(status)) {
            rules.push({
                id: 'R-TERM-1',
                icon: 'fa-lock',
                type: 'neutral',
                title: 'Final Status',
                text: 'This booking is in a terminal state. No further status changes or actions are possible. All parties have been notified.',
            });
        }
        if (status === 'Completed') {
            rules.push({
                id: 'R-TERM-2',
                icon: 'fa-star',
                type: 'info',
                title: 'Leave a Review',
                text: 'Now that the rental is complete, consider rating the equipment to help other farmers make informed decisions.',
            });
        }
        if (status === 'AutoRejected') {
            rules.push({
                id: 'R-TERM-3',
                icon: 'fa-circle-info',
                type: 'neutral',
                title: 'Why Auto-Declined?',
                text: 'This booking was automatically declined because the owner accepted another request with overlapping dates. The equipment has limited availability.',
            });
        }
        if (status === 'Expired') {
            rules.push({
                id: 'R-TERM-4',
                icon: 'fa-hourglass-end',
                type: 'neutral',
                title: 'Why Did It Expire?',
                text: 'The equipment owner did not respond within the 48-hour response window. You may submit a new booking request for this equipment.',
            });
        }
        if (status === 'CancelledByOwner') {
            rules.push({
                id: 'R-TERM-5',
                icon: 'fa-user-xmark',
                type: 'neutral',
                title: 'Owner-Initiated Cancellation',
                text: 'This booking was cancelled by the equipment owner. This typically occurs due to equipment issues or scheduling conflicts. You may book alternative equipment.',
            });
        }

        return rules;
    }, [booking, isOwner, isCustomer, isBookingWindowPassed, isOverdue, canCustomerCancel, hoursUntilStart, today, endDate]);

    // Timeline events — clean icons
    const timelineEvents = booking ? [
        { label: 'Request Created', time: booking.created_at, icon: 'fa-paper-plane' },
        { label: 'Confirmed by Owner', time: booking.accepted_at, icon: 'fa-circle-check' },
        { label: 'Declined', time: booking.rejected_at, icon: 'fa-circle-xmark' },
        { label: 'Rental Started', time: booking.started_at, icon: 'fa-truck' },
        { label: 'Rental Completed', time: booking.completed_at, icon: 'fa-flag-checkered' },
        { label: 'Cancelled', time: booking.cancelled_at, icon: 'fa-ban' },
        { label: 'Expired', time: booking.expired_at, icon: 'fa-hourglass-end' },
    ].filter(e => e.time) : [];

    const fmtTime = (t) => new Date(t).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // ── Loading / Error ──
    if (loading) {
        return <div className="br-page"><div className="br-loading"><div className="br-spinner"></div><p style={{ color: '#9ca3af' }}>Loading booking...</p></div></div>;
    }
    if (!booking) {
        return (
            <div className="br-page"><div className="br-loading">
                <p style={{ color: '#dc2626', fontSize: '18px', fontWeight: '600' }}>{error || 'Booking not found.'}</p>
                <button onClick={() => navigate('/booking-history')} className="br-back-btn">
                    <i className="fa-solid fa-arrow-left"></i> Back to History
                </button>
            </div></div>
        );
    }

    return (
        <div className="br-page">
            <div className="br-container">
                {/* ── Top Bar ── */}
                <div className="br-topbar">
                    <button onClick={() => navigate('/booking-history')} className="br-back-btn">
                        <i className="fa-solid fa-arrow-left"></i> Back to History
                    </button>
                    <span className={`br-role-badge ${isOwner ? 'owner-badge' : 'customer'}`}>
                        <i className={`fa-solid ${isOwner ? 'fa-tractor' : 'fa-user'}`} style={{ marginRight: '6px' }}></i>
                        {isOwner ? 'Equipment Owner' : 'Customer'}
                    </span>
                </div>

                {/* ── Main Card ── */}
                <div className="br-card">
                    <div className="br-card-header">
                        <div className="br-card-header-left">
                            <span className="br-booking-id">{booking.booking_id}</span>
                            <span className="br-status-badge" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                                <i className={`fa-solid ${statusCfg.icon}`} style={{ fontSize: '11px', marginRight: '5px' }}></i>
                                {statusCfg.label}
                            </span>
                        </div>
                        {deadlineInfo && (
                            <span className={`br-deadline-badge ${deadlineInfo.urgent ? 'urgent' : 'normal'}`}>
                                <i className="fa-solid fa-clock" style={{ marginRight: '4px', fontSize: '11px' }}></i>
                                {deadlineInfo.text}
                            </span>
                        )}
                    </div>

                    <div className="br-card-body">
                        {/* ── Info Cards ── */}
                        <div className="br-info-grid">
                            <div className="br-info-card">
                                <div className="br-info-card-title">
                                    <i className="fa-solid fa-user"></i> Customer
                                </div>
                                <div className="br-info-name">{booking.customer?.first_name} {booking.customer?.last_name}</div>
                                {booking.customer?.phone_number && (
                                    <div className="br-info-detail"><i className="fa-solid fa-phone"></i> {booking.customer.phone_number}</div>
                                )}
                                {(booking.customer?.address || booking.customer?.city) && (
                                    <div className="br-info-detail"><i className="fa-solid fa-location-dot"></i> {booking.customer?.address}{booking.customer?.city ? `, ${booking.customer.city}` : ''}</div>
                                )}
                            </div>

                            <div className="br-info-card">
                                <div className="br-info-card-title">
                                    <i className="fa-solid fa-tractor"></i> Owner
                                </div>
                                <div className="br-info-name">{booking.owner?.first_name} {booking.owner?.last_name}</div>
                                {booking.owner?.phone_number && (
                                    <div className="br-info-detail"><i className="fa-solid fa-phone"></i> {booking.owner.phone_number}</div>
                                )}
                                {(booking.owner?.address || booking.owner?.city) && (
                                    <div className="br-info-detail"><i className="fa-solid fa-location-dot"></i> {booking.owner?.address}{booking.owner?.city ? `, ${booking.owner.city}` : ''}</div>
                                )}
                            </div>

                            <div className="br-info-card">
                                <div className="br-info-card-title">
                                    <i className="fa-solid fa-indian-rupee-sign"></i> Rent Details
                                </div>
                                <div className="br-rent-row">
                                    <span className="br-rent-label">Daily Rate</span>
                                    <span className="br-rent-value">₹{booking.equipment?.daily_rental || 0}</span>
                                </div>
                                <div className="br-rent-row">
                                    <span className="br-rent-label">Duration</span>
                                    <span className="br-rent-value">{numberOfDays} day{numberOfDays > 1 ? 's' : ''}</span>
                                </div>
                                <div className="br-rent-row">
                                    <span className="br-rent-label">Period</span>
                                    <span className="br-rent-value" style={{ fontSize: '11px' }}>{booking.start_date} → {booking.end_date}</span>
                                </div>
                                <div className="br-rent-total">
                                    <span className="br-rent-total-label">Total</span>
                                    <span className="br-rent-total-value">₹{parseFloat(totalCost).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Messages ── */}
                        {error && <div className="br-msg error"><i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}</div>}
                        {successMsg && <div className="br-msg success"><i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>{successMsg}</div>}

                        {/* ══════════════════════════════════════ */}
                        {/*  ACTION BUTTONS                        */}
                        {/* ══════════════════════════════════════ */}

                        {/* ── Overdue Warning Banner (C5) ── */}
                        {isOverdue && (
                            <div className="br-overdue-banner">
                                <i className="fa-solid fa-triangle-exclamation"></i>
                                <div>
                                    <strong>Overdue Rental</strong>
                                    <p>This booking's scheduled end date ({booking.end_date}) has passed but the rental is still marked as "In Progress". Please mark it as completed.</p>
                                </div>
                            </div>
                        )}

                        {/* Owner: Accept/Reject (Pending) */}
                        {isOwner && booking.status === 'Pending' && (
                            <div className="br-actions">
                                <div className="br-actions-title">Review this Booking Request</div>
                                {isBookingWindowPassed && (
                                    <p className="br-action-hint" style={{ marginBottom: '12px', color: '#dc2626' }}>
                                        <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '4px' }}></i>
                                        The booking window has passed (ended {booking.end_date}). You can only decline this request.
                                    </p>
                                )}
                                {isStartDatePassed && !isBookingWindowPassed && (
                                    <p className="br-action-hint" style={{ marginBottom: '12px', color: '#d97706' }}>
                                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i>
                                        The start date ({booking.start_date}) has already passed. The rental period has partially elapsed.
                                    </p>
                                )}
                                <div className="br-actions-row">
                                    <button
                                        className="br-btn accept"
                                        disabled={updating || !canOwnerAccept}
                                        title={!canOwnerAccept ? 'Booking window has passed' : 'Accept this booking request'}
                                        onClick={() => handleStatusUpdate('Accepted')}
                                    >
                                        <i className="fa-solid fa-check"></i> Approve Request
                                    </button>
                                    <button className="br-btn reject" disabled={updating} onClick={() => { setError(''); setShowRejectModal(true); }}>
                                        <i className="fa-solid fa-xmark"></i> Decline
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Owner: Start / Cancel (Accepted) */}
                        {isOwner && booking.status === 'Accepted' && (
                            <div className="br-actions">
                                <div className="br-actions-title">Manage Booking</div>
                                {isBookingWindowPassed && (
                                    <p className="br-action-hint" style={{ marginBottom: '12px', color: '#dc2626' }}>
                                        <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '4px' }}></i>
                                        The booking window has closed (ended {booking.end_date}). Equipment can no longer be started.
                                    </p>
                                )}
                                <div className="br-actions-row">
                                    <button
                                        className="br-btn progress"
                                        disabled={updating || !canOwnerStart}
                                        title={
                                            !isStartDateReached
                                                ? `Cannot start before ${booking.start_date}`
                                                : isBookingWindowPassed
                                                    ? 'Booking window has closed'
                                                    : 'Mark equipment as handed over to customer'
                                        }
                                        onClick={() => handleStatusUpdate('Inprogress')}
                                    >
                                        <i className="fa-solid fa-play"></i> Mark as In Progress
                                    </button>
                                    <button className="br-btn cancel-btn" disabled={updating} onClick={() => { setError(''); setShowOwnerCancelModal(true); }}>
                                        Cancel Booking
                                    </button>
                                </div>
                                {!isStartDateReached && (
                                    <p className="br-action-hint">
                                        <i className="fa-solid fa-info-circle" style={{ marginRight: '4px' }}></i>
                                        "In Progress" can only be set on or after the start date ({booking.start_date})
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Owner: Complete (Inprogress) */}
                        {isOwner && booking.status === 'Inprogress' && (
                            <div className="br-actions">
                                <div className="br-actions-title">Complete Rental</div>
                                <div className="br-actions-row">
                                    <button className="br-btn complete" disabled={updating} onClick={() => {
                                        const confirmMsg = isOverdue
                                            ? `This rental is overdue (ended ${booking.end_date}). Are you sure you want to mark it as completed now?`
                                            : 'Are you sure the equipment has been returned and the rental is complete?';
                                        if (window.confirm(confirmMsg)) {
                                            handleStatusUpdate('Completed');
                                        }
                                    }}>
                                        <i className="fa-solid fa-flag-checkered"></i> Mark as Completed
                                    </button>
                                </div>
                                {isOverdue && (
                                    <p className="br-action-hint" style={{ color: '#dc2626' }}>
                                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i>
                                        This rental is overdue. Please complete it as soon as possible.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Customer: Cancel (Pending or Accepted) */}
                        {isCustomer && (booking.status === 'Pending' || booking.status === 'Accepted') && (
                            <div className="br-actions">
                                <div className="br-actions-title">Cancel Booking</div>
                                {booking.status === 'Accepted' && !canCustomerCancel && (
                                    <p className="br-action-hint" style={{ marginBottom: '12px', color: '#dc2626' }}>
                                        <i className="fa-solid fa-lock" style={{ marginRight: '4px' }}></i>
                                        Cancellation is locked — the start date is less than 24 hours away. Contact the owner via chat for assistance.
                                    </p>
                                )}
                                {booking.status === 'Accepted' && canCustomerCancel && (
                                    <p className="br-action-hint" style={{ marginBottom: '12px', color: '#d97706' }}>
                                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i>
                                        Confirmed bookings can only be cancelled 24+ hours before the start date ({booking.start_date}).
                                    </p>
                                )}
                                <div className="br-actions-row">
                                    <button
                                        className="br-btn danger"
                                        disabled={updating || !canCustomerCancel}
                                        title={!canCustomerCancel ? 'Cancellation window has passed (less than 24h before start)' : 'Cancel this booking'}
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                                                handleStatusUpdate('Cancelled');
                                            }
                                        }}
                                    >
                                        {canCustomerCancel ? 'Cancel Booking' : 'Cancellation Locked'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Terminal */}
                        {isTerminal && (
                            <div className="br-terminal">
                                This booking is <span style={{ color: statusCfg.color, fontWeight: '700' }}>
                                    {statusCfg.label}
                                </span>. No further actions available.
                            </div>
                        )}

                        {/* Chat Button */}
                        {(isOwner || isCustomer) && (
                            <div style={{ textAlign: 'center', margin: '16px 0' }}>
                                <button className="br-btn-chat" onClick={() => {
                                    const chatUserId = isOwner ? booking.customer?.id : booking.owner?.id;
                                    if (chatUserId) navigate(`/chat?userId=${chatUserId}&bookingId=${params.id}`);
                                }}>
                                    <i className="fa-solid fa-comment"></i>
                                    {isOwner ? 'Chat with Customer' : 'Chat with Owner'}
                                </button>
                            </div>
                        )}

                        {/* ══════════════════════════════════════ */}
                        {/*  BUSINESS RULES & POLICIES PANEL      */}
                        {/* ══════════════════════════════════════ */}
                        {businessRules.length > 0 && (
                            <div className="br-rules-panel">
                                <button
                                    className="br-rules-toggle"
                                    onClick={() => setShowRulesPanel(!showRulesPanel)}
                                >
                                    <div className="br-rules-toggle-left">
                                        <i className="fa-solid fa-scale-balanced" style={{ color: '#68AC5D' }}></i>
                                        <span>Business Rules & Policies</span>
                                        <span className="br-rules-count">{businessRules.length}</span>
                                    </div>
                                    <i className={`fa-solid fa-chevron-${showRulesPanel ? 'up' : 'down'}`}
                                        style={{ fontSize: '12px', color: '#9ca3af' }}></i>
                                </button>
                                {showRulesPanel && (
                                    <div className="br-rules-list">
                                        {businessRules.map((rule) => (
                                            <div key={rule.id} className={`br-rule-item ${rule.type}`}>
                                                <div className="br-rule-icon-wrap">
                                                    <i className={`fa-solid ${rule.icon}`}></i>
                                                </div>
                                                <div className="br-rule-content">
                                                    <div className="br-rule-header">
                                                        <span className="br-rule-title">{rule.title}</span>
                                                        <span className="br-rule-id">{rule.id}</span>
                                                    </div>
                                                    <p className="br-rule-text">{rule.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════════════════════════════════ */}
                        {/*  STATUS REASON DISPLAYS                 */}
                        {/* ══════════════════════════════════════ */}
                        {booking.status === 'Rejected' && (
                            <div className="br-reason-card" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                <div className="br-reason-title" style={{ color: '#dc2626' }}>
                                    <i className="fa-solid fa-circle-xmark" style={{ marginRight: '6px' }}></i> Booking Declined
                                </div>
                                <div className="br-reason-text"><strong>Reason:</strong> {booking.rejection_reason_display || REJECTION_REASONS[booking.rejection_reason] || 'Not specified'}</div>
                                {booking.rejection_note && <div className="br-reason-note">"{booking.rejection_note}"</div>}
                                {booking.rejected_at && <div className="br-reason-time">{fmtTime(booking.rejected_at)}</div>}
                            </div>
                        )}

                        {booking.status === 'AutoRejected' && (
                            <div className="br-reason-card" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                                <div className="br-reason-title" style={{ color: '#ea580c' }}>
                                    <i className="fa-solid fa-rotate" style={{ marginRight: '6px' }}></i> Auto Declined
                                </div>
                                <div className="br-reason-text">{booking.auto_rejection_note || 'Another booking was accepted for overlapping dates.'}</div>
                            </div>
                        )}

                        {booking.status === 'CancelledByOwner' && (
                            <div className="br-reason-card" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                <div className="br-reason-title" style={{ color: '#be123c' }}>
                                    <i className="fa-solid fa-rectangle-xmark" style={{ marginRight: '6px' }}></i> Cancelled By Owner
                                </div>
                                <div className="br-reason-text"><strong>Reason:</strong> {booking.owner_cancellation_reason_display || OWNER_CANCEL_REASONS[booking.owner_cancellation_reason] || 'Not specified'}</div>
                                {booking.owner_cancellation_note && <div className="br-reason-note">"{booking.owner_cancellation_note}"</div>}
                                {booking.cancelled_at && <div className="br-reason-time">{fmtTime(booking.cancelled_at)}</div>}
                            </div>
                        )}

                        {booking.status === 'Cancelled' && (
                            <div className="br-reason-card" style={{ background: '#f9fafb', border: '1px solid #d1d5db' }}>
                                <div className="br-reason-title" style={{ color: '#6b7280' }}>
                                    <i className="fa-solid fa-ban" style={{ marginRight: '6px' }}></i> Cancelled by Customer
                                </div>
                                {booking.cancelled_at && <div className="br-reason-time">{fmtTime(booking.cancelled_at)}</div>}
                            </div>
                        )}

                        {booking.status === 'Expired' && (
                            <div className="br-reason-card" style={{ background: '#f9fafb', border: '1px solid #d1d5db' }}>
                                <div className="br-reason-title" style={{ color: '#9ca3af' }}>
                                    <i className="fa-solid fa-hourglass-end" style={{ marginRight: '6px' }}></i> Booking Expired
                                </div>
                                <div className="br-reason-text">The owner did not respond within the deadline.</div>
                            </div>
                        )}

                        {/* ══════════════════════════════════════ */}
                        {/*  STEPPER — clean numbered steps        */}
                        {/* ══════════════════════════════════════ */}
                        {stepIndex >= 0 && (
                            <div className="br-stepper">
                                {STEP_LABELS.map((label, idx) => (
                                    <React.Fragment key={idx}>
                                        <div className="br-step">
                                            <div className={`br-step-circle ${stepIndex >= idx ? 'active' : 'inactive'}`}>
                                                {stepIndex > idx
                                                    ? <i className="fa-solid fa-check" style={{ fontSize: '14px', color: 'white' }}></i>
                                                    : stepIndex === idx
                                                        ? <i className={`fa-solid ${STEP_ICONS[idx]}`} style={{ fontSize: '14px', color: 'white' }}></i>
                                                        : <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 700 }}>{idx + 1}</span>
                                                }
                                            </div>
                                            <div className="br-step-label">{label}</div>
                                        </div>
                                        {idx < STEP_LABELS.length - 1 && (
                                            <div className={`br-step-line ${stepIndex > idx ? 'active' : 'inactive'}`}></div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        {/* ══════════════════════════════════════ */}
                        {/*  TIMELINE                               */}
                        {/* ══════════════════════════════════════ */}
                        {timelineEvents.length > 0 && (
                            <div className="br-timeline">
                                <div className="br-timeline-title">
                                    <i className="fa-solid fa-timeline" style={{ marginRight: '8px', color: '#68AC5D' }}></i>
                                    Booking Timeline
                                </div>
                                {timelineEvents.map((ev, idx) => (
                                    <div key={idx} className="br-timeline-item">
                                        <span className="br-timeline-icon">
                                            <i className={`fa-solid ${ev.icon}`}></i>
                                        </span>
                                        <span className="br-timeline-label">{ev.label}</span>
                                        <span className="br-timeline-time">{fmtTime(ev.time)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ══════════════════════════════════════ */}
                        {/*  EQUIPMENT TABLE                        */}
                        {/* ══════════════════════════════════════ */}
                        <div style={{ marginTop: '8px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                                <i className="fa-solid fa-tractor" style={{ color: '#68AC5D', marginRight: '8px' }}></i>
                                Equipment Details
                            </h3>
                            <table className="br-eq-table">
                                <thead>
                                    <tr>
                                        <th>Product ID</th>
                                        <th>Equipment</th>
                                        <th>Daily Price</th>
                                        <th>Manufacturer</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{booking.equipment?.eq_id || '—'}</td>
                                        <td style={{ fontWeight: '600' }}>{booking.equipment?.title || '—'}</td>
                                        <td>₹{booking.equipment?.daily_rental || 0}</td>
                                        <td>{booking.equipment?.manufacturer || '—'}</td>
                                        <td>
                                            <button className="br-eq-link" onClick={() => navigate(`/product/${booking.equipment?.eq_id}`)}>
                                                View Details →
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════ */}
            {/*  REJECTION MODAL                               */}
            {/* ══════════════════════════════════════════════ */}
            {showRejectModal && (
                <div className="br-modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="br-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="br-modal-title">Decline Booking</h2>
                        <p className="br-modal-label">
                            Why are you declining this booking? <span style={{ color: '#dc2626' }}>*</span>
                        </p>
                        <div className="br-radio-group">
                            {Object.entries(REJECTION_REASONS).map(([key, label]) => (
                                <label key={key} className={`br-radio-option ${rejectionReason === key ? 'selected' : ''}`}>
                                    <input type="radio" name="rejectionReason" value={key}
                                        checked={rejectionReason === key}
                                        onChange={(e) => setRejectionReason(e.target.value)} />
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label className="br-modal-label">
                                Additional note {parseInt(rejectionReason) === 5 ? <span style={{ color: '#dc2626' }}>*</span> : '(optional)'}:
                            </label>
                            <textarea className="br-textarea" value={rejectionNote}
                                onChange={(e) => setRejectionNote(e.target.value)}
                                placeholder="Provide more details..." maxLength={500} rows={3} />
                        </div>
                        <div className="br-modal-actions">
                            <button className="br-modal-btn secondary" onClick={() => { setShowRejectModal(false); setRejectionReason(''); setRejectionNote(''); setError(''); }}>
                                Cancel
                            </button>
                            <button className="br-modal-btn primary-danger" disabled={updating} onClick={handleReject}>
                                {updating ? 'Declining...' : 'Confirm Decline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════ */}
            {/*  OWNER CANCELLATION MODAL                      */}
            {/* ══════════════════════════════════════════════ */}
            {showOwnerCancelModal && (
                <div className="br-modal-overlay" onClick={() => setShowOwnerCancelModal(false)}>
                    <div className="br-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="br-modal-title">Cancel Booking</h2>
                        <div className="br-modal-warning">
                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                            You are cancelling a confirmed booking. The customer is counting on this equipment.
                        </div>
                        <p className="br-modal-label">
                            Why are you cancelling? <span style={{ color: '#dc2626' }}>*</span>
                        </p>
                        <div className="br-radio-group">
                            {Object.entries(OWNER_CANCEL_REASONS).map(([key, label]) => (
                                <label key={key} className={`br-radio-option ${ownerCancelReason === key ? 'selected-danger' : ''}`}>
                                    <input type="radio" name="ownerCancelReason" value={key}
                                        checked={ownerCancelReason === key}
                                        onChange={(e) => setOwnerCancelReason(e.target.value)}
                                        style={{ accentColor: '#dc2626' }} />
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label className="br-modal-label">
                                Additional note {parseInt(ownerCancelReason) === 4 ? <span style={{ color: '#dc2626' }}>*</span> : '(optional)'}:
                            </label>
                            <textarea className="br-textarea" value={ownerCancelNote}
                                onChange={(e) => setOwnerCancelNote(e.target.value)}
                                placeholder="Explain to the customer..." maxLength={500} rows={3} />
                        </div>
                        <div className="br-modal-actions">
                            <button className="br-modal-btn secondary" onClick={() => { setShowOwnerCancelModal(false); setOwnerCancelReason(''); setOwnerCancelNote(''); setError(''); }}>
                                Go Back
                            </button>
                            <button className="br-modal-btn primary-red" disabled={updating} onClick={handleOwnerCancel}>
                                {updating ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default BookingRequest