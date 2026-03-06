import React from "react";

export const SuccessMsg = ({ msg, onClose }) => {
  return (
    <div className="success-msg">
      <span>{msg}</span>
      {onClose && (
        <button
          type="button"
          className="toast-close"
          aria-label="Close notification"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
};

export const ErrorMsg = ({ msg, onClose }) => {
  return (
    <div className="error-msg">
      <span>{msg}</span>
      {onClose && (
        <button
          type="button"
          className="toast-close"
          aria-label="Close notification"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
};

