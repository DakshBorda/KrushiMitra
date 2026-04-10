/**
 * Shared booking constants used across BookingHistory, BookingRequest, and Product pages.
 * Single source of truth — keep in sync with backend booking/models.py.
 */

// ── Status display configuration ──
export const STATUS_CONFIG = {
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

export const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// ── Terminal (final) statuses — no further actions possible ──
export const TERMINAL_STATUSES = [
    'Completed', 'Rejected', 'AutoRejected', 'Cancelled', 'CancelledByOwner', 'Expired',
];

// ── Rejection reasons (must match backend REJECTION_REASONS) ──
export const REJECTION_REASONS = {
    1: 'Equipment not available on these dates',
    2: 'Equipment under maintenance/repair',
    3: 'Location too far',
    4: 'Booking duration too short/long',
    5: 'Other',
};

// ── Owner cancellation reasons (must match backend OWNER_CANCEL_REASONS) ──
export const OWNER_CANCEL_REASONS = {
    1: 'Equipment breakdown',
    2: 'Personal/family emergency',
    3: 'Scheduling conflict / double booking',
    4: 'Other',
};

// ── Human-readable success messages per status transition ──
export const STATUS_SUCCESS_MESSAGES = {
    Accepted:        'Booking has been confirmed. The customer has been notified.',
    Rejected:        'Booking has been declined. The customer has been notified.',
    Cancelled:       'Booking has been cancelled successfully.',
    CancelledByOwner:'Booking has been cancelled. The customer has been notified.',
    Inprogress:      'Equipment has been marked as handed over. Rental is now in progress.',
    Completed:       'Rental has been marked as completed. Thank you!',
};
