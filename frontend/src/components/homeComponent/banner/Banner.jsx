import React, { useState } from "react";
import "./Banner.css";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel } from "react-responsive-carousel";
import home1 from "../../../img/home1.webp";
import slider2 from "../../../img/slider2.webp";
import slider3 from "../../../img/slider3.webp";
import { useNavigate, Navigate } from "react-router-dom";
import SpeechRecognition, {
  useSpeechRecognition
} from "react-speech-recognition";

const Banner = () => {
  const navigate = useNavigate();
  const commands = [
    {
      command: ["Go to * page", "Go to *", "Open * page", "Open *"],
      callback: (redirectPage) => setRedirectUrl(redirectPage)
    }
  ];

  const { transcript } = useSpeechRecognition({ commands });
  const [redirectUrl, setRedirectUrl] = useState("");
  const pages = [
    "home",
    "dashboard",
    "browse",
    "booking",
    "contact",
    "profile",
    "feedback",
    "login",
    "register",
    "booking history",
    "partner dispute",
    "cancellation policy"
  ];
  const urls = {
    home: "/",
    dashboard: "/dashboard",
    browse: "/dashboard",
    booking: "/booking",
    contact: "/contact",
    feedback: "/feedback",
    login: "/login",
    register: "/register",
    "booking history": "/booking-history",
    "partner dispute": "/partner-dispute",
    "cancellation policy": "/policy"
  };

  if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
    return null;
  }

  let redirect = "";

  if (redirectUrl) {
    if (pages.includes(redirectUrl)) {
      redirect = <Navigate replace to={urls[redirectUrl]} />;
    } else {
      redirect = <p>Could not find page: {redirectUrl}</p>;
    }
  }

  return (
    <>
      {redirect}
      <Carousel
        autoplay={true}
        infiniteLoop={true}
        showStatus={false}
        showIndicators={false}
        showThumbs={false}
        interval={3000}
      >
        <div className="banner-slide">
          <div className="banner-overlay" />
          <img src={home1} className="banner-img" alt="Farm equipment" />
          <div className="banner-content">
            <p className="banner-welcome">
              Namaste, welcome to KrushiMitra
            </p>
            <h1 className="banner-headline">
              <span className="banner-highlight">Farm Equipment</span> at
              reasonable and affordable prices.
            </h1>
            <p className="banner-subtext">
              Find and rent the equipment you need — start with just one click.
            </p>
            <div className="banner-actions">
              <button
                onClick={() => navigate("/dashboard")}
                className="banner-cta-primary"
              >
                Browse Equipment
              </button>
              {SpeechRecognition.browserSupportsSpeechRecognition() && (
                <button
                  onClick={SpeechRecognition.startListening}
                  className="banner-cta-secondary"
                  title="Search by voice"
                >
                  <i className="fa-solid fa-microphone"></i>
                  Voice Search
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="banner-slide">
          <img src={slider2} className="banner-img" alt="Agricultural machinery" />
        </div>
        <div className="banner-slide">
          <img src={slider3} className="banner-img" alt="Farming tools" />
        </div>
      </Carousel>
    </>
  );
};

export default Banner;
