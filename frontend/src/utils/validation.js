export const isEmpty = (value) => {
  if (!value) return true;
  return false;
};

export const isEmail = (email) => {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
};

export const isValidPassword = (password) => {
  if (!password || password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
};

export const isMatch = (password, cfPassword) => {
  return password === cfPassword;
};

/** Indian mobile: 10 digits, optional +91 or 0 prefix */
export const isPhoneNumber = (value) => {
  if (!value || typeof value !== "string") return false;
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length !== 10) return false;
  // Match backend validator: ^[1-9]\d{9}$
  return /^[1-9]\d{9}$/.test(cleaned);
};

/** Indian pincode: 6 digits */
export const isPincode = (value) => {
  if (!value) return false;
  const cleaned = String(value).replace(/\D/g, "");
  return cleaned.length === 6;
};
