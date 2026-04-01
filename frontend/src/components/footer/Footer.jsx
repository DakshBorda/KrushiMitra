import React from "react";
import "./Footer.css";
import { useNavigate } from "react-router-dom";

const FooterLink = ({ to, children, navigate }) => (
  <li>
    <button type="button" className="km-footer-link" onClick={() => navigate(to)}>
      {children}
    </button>
  </li>
);

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="km-footer">
      <div className="km-footer-inner">
        {/* Brand */}
        <div className="km-footer-brand">
          <h2>KrushiMitra</h2>
          <p>
            Connecting farmers with equipment owners across India. Rent
            agricultural machinery easily and affordably.
          </p>
        </div>

        {/* Navigation */}
        <div className="km-footer-col">
          <h3>Navigate</h3>
          <ul>
            <FooterLink to="/" navigate={navigate}>Home</FooterLink>
            <FooterLink to="/dashboard" navigate={navigate}>Browse Equipment</FooterLink>
            <FooterLink to="/booking-history" navigate={navigate}>My Bookings</FooterLink>
            <FooterLink to="/my-equipment" navigate={navigate}>My Equipment</FooterLink>
            <FooterLink to="/notifications" navigate={navigate}>Notifications</FooterLink>
          </ul>
        </div>

        {/* Support */}
        <div className="km-footer-col">
          <h3>Support</h3>
          <ul>
            <FooterLink to="/help" navigate={navigate}>Help Center</FooterLink>
            <FooterLink to="/faq" navigate={navigate}>FAQs</FooterLink>
            <FooterLink to="/contact" navigate={navigate}>Contact Us</FooterLink>
            <FooterLink to="/partner-dispute" navigate={navigate}>Partner Dispute</FooterLink>
            <FooterLink to="/feedback" navigate={navigate}>Give Feedback</FooterLink>
          </ul>
        </div>

        {/* Legal */}
        <div className="km-footer-col">
          <h3>Legal</h3>
          <ul>
            <FooterLink to="/policy" navigate={navigate}>Cancellation Policy</FooterLink>
          </ul>
        </div>
      </div>

      {/* Divider + Copyright */}
      <div className="km-footer-divider">
        <p className="km-footer-copyright">
          © {currentYear} <span>KrushiMitra</span>. All rights reserved.
        </p>
        <div className="km-footer-social">
          <button type="button" aria-label="Facebook" className="km-footer-social-btn">
            <i className="fa-brands fa-facebook-f"></i>
          </button>
          <button type="button" aria-label="Twitter" className="km-footer-social-btn">
            <i className="fa-brands fa-twitter"></i>
          </button>
          <button type="button" aria-label="Instagram" className="km-footer-social-btn">
            <i className="fa-brands fa-instagram"></i>
          </button>
          <button type="button" aria-label="YouTube" className="km-footer-social-btn">
            <i className="fa-brands fa-youtube"></i>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
