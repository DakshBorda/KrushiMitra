/**
 * Extracts a user-friendly error message from DRF/Axios error responses.
 *
 * Handles all Django REST Framework ValidationError shapes:
 *   - String response
 *   - Array response
 *   - { detail: "..." }
 *   - { message: "..." }
 *   - { non_field_errors: [...] }
 *   - { field_name: ["error1", ...] }
 *
 * @param {Error} err - Axios error object
 * @param {string} [fallback] - Optional fallback message
 * @returns {string} Human-readable error message
 */
export const extractErrorMsg = (err, fallback = 'Something went wrong. Please try again.') => {
    const d = err?.response?.data;
    if (!d) return fallback;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d[0];
    if (d.detail) return d.detail;
    if (d.message) return Array.isArray(d.message) ? d.message[0] : d.message;
    if (d.non_field_errors) return Array.isArray(d.non_field_errors) ? d.non_field_errors[0] : d.non_field_errors;
    // Flatten first key's first error (skip 'status' boolean field)
    const firstKey = Object.keys(d).find(k => k !== 'status');
    if (firstKey && d[firstKey]) {
        const val = d[firstKey];
        if (Array.isArray(val)) return val[0];
        if (typeof val === 'string') return val;
        return JSON.stringify(val);
    }
    return fallback;
};
