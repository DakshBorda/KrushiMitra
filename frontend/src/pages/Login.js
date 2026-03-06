import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import Cookies from "js-cookie";

//Components
import InputField from "../components/input/InputField";
import Loader from "../components/loader/";

//Functions
import { SuccessMsg, ErrorMsg } from "../components/alerts";
import {
  postLoginDataEmail,
  postLoginDataPhone
} from "../api/authAPI";
import {
  getLoginAction,
  getSaveTokenAction,
  getSaveProfileAction
} from "../redux/actions";
import { isEmail, isEmpty, isPhoneNumber } from "../utils/validation";
import logo from "../img/logo.png";
import cross_black from "../img/cross_black.svg";

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

  const emailErr = err?.email?.[0];
  if (emailErr) {
    if (typeof emailErr === "string") return emailErr;
    if (emailErr.msg) return emailErr.msg;
    if (emailErr.message) return emailErr.message;
  }

  const pwdErr = err?.password?.[0];
  if (pwdErr) {
    if (typeof pwdErr === "string") return pwdErr;
    if (pwdErr.msg) return pwdErr.msg;
    if (pwdErr.message) return pwdErr.message;
  }

  return "Invalid email or password";
}

const Login = ({ onClick }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isPageRoute = typeof onClick !== "function";

  useEffect(() => {
    if (isPageRoute && Cookies.get("refresh-token")) {
      navigate("/", { replace: true });
    }
  }, [isPageRoute, navigate]);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setMessage("");
    setError(false);
    if (isEmpty(email) || isEmpty(password)) {
      setError(true);
      setMessage("Please enter email and password.");
      return;
    }
    if (!isEmail(email)) {
      setError(true);
      setMessage("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const data2 = await postLoginDataEmail({ email, password });
      if (data2.success) {
        setLoading(false);
        setSuccess(true);
        setMessage(data2.message);
        saveData(data2);
      }
    } catch (err) {
      setLoading(false);
      setSuccess(false);
      setError(true);
      setMessage(getErrorMessage(err));
      console.log("Email login error:", err);
    }
  }

  async function handleLoginPhone() {
    setMessage("");
    setError(false);
    if (isEmpty(phone_number)) {
      setError(true);
      setMessage("Please enter your mobile number.");
      return;
    }
    if (!isPhoneNumber(phone_number)) {
      setError(true);
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const data = await postLoginDataPhone({ phone_number: phone_number });
      if (data.success) {
        sessionStorage.setItem("login_otp_phone", phone_number);
        setLoading(false);
        navigate("/login/verify-otp", { replace: true });
      }
    } catch (err) {
      setSuccess(false);
      setLoading(false);
      setError(true);
      setMessage(getErrorMessage(err) || "Server issue. Try again later.");
      console.log(err);
    }
  }

  async function saveData(data) {
    setSuccess(data.success);
    setMessage(data.message);
    localStorage.setItem("isLoggedIn", true);
    Cookies.set("access-token", data.data.tokens.access, {
      path: "/",
      expires: new Date().setDate(new Date().getDate() + 1)
    });
    Cookies.set("refresh-token", data.data.tokens.refresh, {
      path: "/",
      expires: new Date().setDate(new Date().getDate() + 1)
    });
    console.log(data);
    Cookies.set("uuid", data.data.uuid, {
      path: "/",
      expires: new Date().setDate(new Date().getDate() + 1)
    });
    Cookies.set("user", data);
    console.log(Cookies.get("user"));
    dispatch(getLoginAction());
    dispatch(
      getSaveTokenAction({
        accessToken: data.data.tokens.access,
        refreshToken: data.data.tokens.refresh
      })
    );
    dispatch(getSaveProfileAction(data));
    setLoading(false);
    navigate("/");
  }

  const handleClose = () => {
    if (typeof onClick === "function") onClick(false);
    else navigate("/");
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 w-full bg-[#219653] min-h-screen overflow-y-auto">
      {success && (
        <SuccessMsg
          msg={message}
          onClose={() => {
            setSuccess(false);
            setMessage("");
          }}
        />
      )}
      {error && message && (
        <ErrorMsg
          msg={message}
          onClose={() => {
            setError(false);
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

      {/* LOGIN FORM */}

      <div className={`${loading && "blur-sm"} flex flex-col min-h-screen w-full box-border`}>
        <div className="flex justify-center py-6 sm:py-9 px-4 rounded-2xl box-border w-full">
          <div
            className="w-full max-w-md relative bg-[#219653] box-border rounded-2xl"
            style={{
              paddingTop: "3rem",
              paddingBottom: "3rem",
              paddingLeft: "1.5rem",
              paddingRight: "1.5rem"
            }}
          >
            <form
              onSubmit={handleEmailLogin}
              className="bg-white mx-auto relative p-6 sm:p-9 pt-3 drop-shadow-md rounded-3xl flex flex-col justify-center text-center w-full max-w-lg box-border"
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
                Login Here
              </h1>
              <p className="font mb-4">Login Using Email</p>
              <InputField
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="text"
              />
              <InputField
                placeholder="Password*"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />
              <button
                className="px-6 py-1 w-32 mx-auto rounded-lg text-white text-xl font-semibold bg-[#219653] hover:opacity-90"
                type="submit"
              >
                Login
              </button>
              <div
                className="flex flex-col my-7 relative"
                style={{ borderTop: "1px solid #4F4F4F" }}
              >
                <h1
                  className="rounded-full bg-white w-10 text-center p-2 absolute left-1/2 -top-6 -translate-x-1/2"
                  style={{ boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)" }}
                >
                  OR
                </h1>
              </div>
              <p className="mb-3">Login Using Mobile No.</p>
              <InputField
                placeholder="Mobile No."
                value={phone_number}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                }}
                type="text"
              />
              <button
                type="button"
                className="px-6 py-1 mx-auto rounded-lg text-white text-xl font-semibold bg-[#219653] hover:opacity-90"
                onClick={() => handleLoginPhone()}
              >
                Login with OTP
              </button>
              {phone_number && (
                <p className="my-3 text-sm">
                  An OTP will be sent to your mobile number. You&apos;ll be taken to verify it.
                </p>
              )}
              <p className="mt-4 text-center text-sm">
                New user?{" "}
                <Link to="/register" className="text-[#219653] font-semibold underline">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
