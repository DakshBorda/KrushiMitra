import "./App.css";
import Home from "./pages/Home";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getProfile } from "./api/profileAPI";
import {
  getLoginAction,
  getSaveProfileAction,
  getSaveTokenAction
} from "./redux/actions";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Cookies from "js-cookie";

//Pages
import Register from "./pages/Register";
import Login from "./pages/Login";
import Help from "./pages/Help";
import Header from "./components/header/Header";
import FAQ from "./pages/FAQ";
import Dashboard from "./pages/dashboard/Dashboard";
import AddProduct from "./pages/addProduct/AddProduct";
import VerifyOTP from "./components/verify-otp";
import Product from "./pages/product/Product";
import PartnerDispute from "./pages/PartnerDispute";
import ContactUs from "./pages/ContactUs/ContactUs";
import Chat from "./pages/chat/Chat";
import BookingRequest from "./pages/bookingRequest/BookingRequest";
import CancellationPolicy from "./pages/cancellationPage/CancellationPolicy";
import UpdateProfile from "./pages/updateProfile/index";
import BookingHistory from "./pages/bookingHistory";
import Feedback from "./pages/feedback/Feedback";
import EquipmentReport from "./pages/EquipmentReport";
import MyEquipment from "./pages/myEquipment/MyEquipment";
import Notifications from "./pages/notifications/Notifications";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import Footer from "./components/footer/Footer";

// Auth routes where Header/Footer/Support should be hidden
const AUTH_ROUTES = ["/login", "/register", "/verify-otp", "/login/verify-otp", "/forgot-password"];

function App() {
  const tokenState = useSelector((state) => state.tokenReducer);
  const dispatch = useDispatch();
  const location = useLocation();

  // Check if current route is an auth page
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  useEffect(() => {
    const access = Cookies.get("access-token");
    const refresh = Cookies.get("refresh-token");
    dispatch(
      getSaveTokenAction({
        accessToken: access,
        refreshToken: refresh
      })
    );
  }, [tokenState.token.accessToken, dispatch]);

  useEffect(() => {
    async function loadProfile() {
      const access = Cookies.get("access-token");
      const uuid = Cookies.get("uuid");
      if (access && uuid) {
        dispatch(getLoginAction());
        try {
          const data = await getProfile({
            uuid: uuid,
            accessToken: access
          });
          dispatch(getSaveProfileAction(data));
        } catch (err) {
          console.log("Failed to restore profile session:", err);
        }
      }
    }
    loadProfile();
  }, [dispatch]);

  return (
    <>
      {!isAuthPage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/verify-otp" element={<VerifyOTP />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/help" element={<Help />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/addProduct" element={<AddProduct />} />
        <Route path="/update-profile" element={<UpdateProfile />} />
        <Route path="/product/:eqId" element={<Product />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/bookingRequest/:id" element={<BookingRequest />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/booking-history" element={<BookingHistory />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/partner-dispute" element={<PartnerDispute />} />

        <Route path="/policy" element={<CancellationPolicy />} />
        <Route path="/equipment-report/:id" element={<EquipmentReport />} />
        <Route path="/my-equipment" element={<MyEquipment />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {!isAuthPage && <Footer />}
    </>
  );
}

export default App;
