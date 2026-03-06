import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Cookies from "js-cookie";

//Components
import InputField from "../components/input/InputField";
import { ErrorMsg, SuccessMsg } from "../components/alerts";
import Loader from "../components/loader/";

//Functions
import { postRegisterData } from "../api/authAPI";
import { isEmail, isEmpty, isValidPassword, isPhoneNumber, isPincode, isMatch } from "../utils/validation";

//Images
import cross_black from "../img/cross_black.svg";
import logo from "../img/logo.png";

/** Get display message from API error (never show raw HTML) */
function getErrorMessage(err) {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") {
    if (err.trim().startsWith("<")) return "Server error. Please try again later.";
    return err;
  }
  if (err?.msg) return err.msg;
  if (typeof err?.detail === "string") return err.detail;
  if (typeof err?.message === "string") return err.message;

  const phoneErr = err?.phone_number?.[0];
  if (phoneErr) {
    if (typeof phoneErr === "string") {
      if (phoneErr.toLowerCase().includes("exists")) {
        return "User already exists with this phone number.";
      }
      return phoneErr;
    }
    if (phoneErr.msg) return phoneErr.msg;
    if (phoneErr.message) return phoneErr.message;
    return "User already exists with this phone number.";
  }

  const emailErr = err?.email?.[0];
  if (emailErr) {
    if (typeof emailErr === "string") {
      if (emailErr.toLowerCase().includes("exists")) {
        return "User already exists with this email.";
      }
      return emailErr;
    }
    if (emailErr.msg) return emailErr.msg;
    if (emailErr.message) return emailErr.message;
    return "User already exists with this email.";
  }

  // Fallback: scan raw error text for duplicate messages
  try {
    const raw = JSON.stringify(err).toLowerCase();
    if (raw.includes("email already exists")) {
      return "User already exists with this email.";
    }
    if (raw.includes("phone number already exists") || raw.includes("user already exists")) {
      return "User already exists with this phone number.";
    }
  } catch (_e) {
    // ignore JSON stringify issues
  }

  return "Registration failed. Please try again.";
}

const Register = ({ onClick }) => {
  const [email, setEmail] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin_code, setPincode] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const isPageRoute = typeof onClick !== "function";

  useEffect(() => {
    if (isPageRoute && Cookies.get("refresh-token")) {
      navigate("/", { replace: true });
    }
  }, [isPageRoute, navigate]);

  async function handleRegister(e) {
    e.preventDefault();
    setMessage("");
    setError(false);
    setSuccess(false);

    if (
      isEmpty(first_name) ||
      isEmpty(last_name) ||
      isEmpty(email) ||
      isEmpty(password) ||
      isEmpty(pin_code) ||
      isEmpty(phone_number)
    ) {
      setError(true);
      setMessage("Please fill in all the required fields.");
      return;
    }

    if (!isEmail(email)) {
      setError(true);
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!isValidPassword(password)) {
      setError(true);
      setMessage("Password must be at least 8 characters long and include letters and numbers.");
      return;
    }

    if (!isMatch(password, confirmPassword)) {
      setError(true);
      setMessage("Passwords do not match.");
      return;
    }

    if (!isPincode(pin_code)) {
      setError(true);
      setMessage("Please enter a valid 6-digit pincode.");
      return;
    }

    if (!isPhoneNumber(phone_number)) {
      setError(true);
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);
      const data = await postRegisterData({
        first_name,
        email,
        password,
        last_name,
        pin_code,
        phone_number
      });
      if (data.success && data.next === "VERIFY_OTP") {
        setSuccess(true);
        setError(false);
        setMessage("OTP sent to your mobile number for verification.");
        setLoading(false);
        sessionStorage.setItem("otp_phone_number", phone_number);
        if (typeof onClick === "function") onClick(false);
        navigate("/verify-otp", { replace: true });
      }
    } catch (error) {
      setLoading(false);
      setError(true);
      setMessage(getErrorMessage(error) || "Server issue. Try again later.");
      console.log(error);
    }
  }

  const handleClose = () => {
    if (typeof onClick === "function") onClick(false);
    else navigate("/");
  };

  return (
    <div className="relative flex flex-col bg-[#219653] z-50 w-full min-h-screen overflow-x-hidden">
      {error && message && (
        <ErrorMsg
          msg={message}
          onClose={() => {
            setError(false);
            setMessage("");
          }}
        />
      )}
      {success && message && (
        <SuccessMsg
          msg={message}
          onClose={() => {
            setSuccess(false);
            setMessage("");
          }}
        />
      )}
      <div className="absolute top-2 right-2 z-10">
        <img
          src={cross_black}
          className="cursor-pointer hover:opacity-90 bg-[#E5E5E5] rounded-full p-2 shadow-xl"
          alt="Close"
          onClick={handleClose}
        />
      </div>
      {loading && <Loader />}
      <div className="flex justify-center py-9 px-4 box-border w-full max-w-full min-h-screen">
        <div
          className="w-full max-w-md relative box-border"
          style={{
            backgroundColor: "#219653",
            paddingTop: "3rem",
            paddingBottom: "3rem",
            paddingLeft: "1.5rem",
            paddingRight: "1.5rem",
            borderRadius: "1rem"
          }}
        >
          <form
            onSubmit={handleRegister}
            className="bg-white relative p-6 sm:p-9 pt-3 mx-auto drop-shadow-md rounded-3xl flex flex-col justify-center text-center w-full max-w-lg box-border"
            style={{ maxWidth: "28rem" }}
          >
            <div className="absolute -top-12 float-center flex flex-col left-1/2 -translate-x-1/2">
              <img
                className="h-24 w-24 border-full mx-auto"
                style={{
                  filter: "drop-shadow(0px 4px 4px rgba(104, 172, 93, 0.25))"
                }}
                src={logo}
                alt="logo"
              />
            </div>
            <h1 className="text-2xl font-bold" style={{ marginTop: "3rem" }}>
              Register Here
            </h1>
            <p className="font-semibold mb-4">Enter your details</p>
            <InputField
              placeholder="First Name*"
              value={first_name}
              onChange={(e) => setFirstName(e.target.value)}
              type="text"
              required={true}
            />
            <InputField
              placeholder="Last Name*"
              value={last_name}
              onChange={(e) => setLastName(e.target.value)}
              type="text"
              required={true}
            />
            <InputField
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="text"
              required={false}
            />
            <InputField
              placeholder="Password*"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required={true}
            />
            <InputField
              placeholder="Confirm Password*"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              required={true}
            />
            <InputField
              placeholder="Pincode*"
              value={pin_code}
              onChange={(e) => setPincode(e.target.value)}
              type="text"
              required={true}
            />
            <InputField
              placeholder="Phone Number*"
              value={phone_number}
              onChange={(e) => setPhoneNumber(e.target.value)}
              type="text"
              required={true}
            />
            <button
              className="px-6 py-1 w-32 mx-auto rounded-lg text-white text-xl font-semibold bg-[#219653] hover:opacity-90"
              type="submit"
              disabled={loading}
            >
              Register
            </button>
            <p className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-[#219653] font-semibold underline">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
