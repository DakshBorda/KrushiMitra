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
          <div className="km-footer-contact-info">
            <span>
              <i className="fa-solid fa-envelope"></i>
              <a href="mailto:krushimitra@gmail.com">krushimitra@gmail.com</a>
            </span>
            <span>
              <i className="fa-solid fa-phone"></i>
              <a href="tel:+919313483725">+91 93134 83725</a>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="km-footer-col">
          <h3>Explore</h3>
          <ul>
            <FooterLink to="/" navigate={navigate}>Home</FooterLink>
            <FooterLink to="/dashboard" navigate={navigate}>Browse Equipment</FooterLink>
            <FooterLink to="/addProduct" navigate={navigate}>List Equipment</FooterLink>
            <FooterLink to="/booking-history" navigate={navigate}>My Bookings</FooterLink>
            <FooterLink to="/my-equipment" navigate={navigate}>My Equipment</FooterLink>
          </ul>
        </div>

        {/* Support */}
        <div className="km-footer-col">
          <h3>Support</h3>
          <ul>
            <FooterLink to="/help" navigate={navigate}>Help Center</FooterLink>
            <FooterLink to="/contact" navigate={navigate}>Contact Us</FooterLink>
            <FooterLink to="/feedback" navigate={navigate}>Give Feedback</FooterLink>
            <FooterLink to="/partner-dispute" navigate={navigate}>Raise a Dispute</FooterLink>
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
          &copy; {currentYear} <span>KrushiMitra</span>. All rights reserved.
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
