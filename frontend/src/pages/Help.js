import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── FAQ Accordion Item ──
const AccordionItem = ({ question, answer, isOpen, onClick, icon }) => (
  <div
    style={{
      background: isOpen ? "#f0fdf4" : "#fff",
      border: isOpen ? "1.5px solid #86efac" : "1px solid #e5e7eb",
      borderRadius: "12px",
      marginBottom: "10px",
      overflow: "hidden",
      transition: "all 0.3s ease",
      boxShadow: isOpen ? "0 4px 16px rgba(104, 172, 93, 0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
    }}
  >
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "16px 20px",
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{
        width: "36px", height: "36px", borderRadius: "10px",
        background: isOpen ? "linear-gradient(135deg, #68AC5D, #4a9c3f)" : "#f3f4f6",
        color: isOpen ? "#fff" : "#6b7280",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: "14px", transition: "all 0.3s ease",
      }}>
        <i className={`fa-solid ${icon}`}></i>
      </span>
      <span style={{
        flex: 1, fontSize: "15px", fontWeight: 600,
        color: isOpen ? "#166534" : "#1f2937",
        lineHeight: 1.4,
      }}>
        {question}
      </span>
      <i
        className={`fa-solid fa-chevron-${isOpen ? "up" : "down"}`}
        style={{
          fontSize: "12px",
          color: isOpen ? "#68AC5D" : "#9ca3af",
          transition: "transform 0.3s ease",
        }}
      ></i>
    </button>
    <div style={{
      maxHeight: isOpen ? "300px" : "0",
      overflow: "hidden",
      transition: "max-height 0.35s ease",
    }}>
      <p style={{
        padding: "0 20px 16px 68px",
        fontSize: "14px", lineHeight: 1.7, color: "#4b5563", margin: 0,
      }}>
        {answer}
      </p>
    </div>
  </div>
);

// ── Help Category Data ──
const CATEGORIES = [
  { id: "booking", label: "Booking", icon: "fa-calendar-check", color: "#3b82f6" },
  { id: "listing", label: "Listing Equipment", icon: "fa-tractor", color: "#68AC5D" },
  { id: "account", label: "Account & Profile", icon: "fa-user-gear", color: "#8b5cf6" },
  { id: "payments", label: "Payments & Pricing", icon: "fa-indian-rupee-sign", color: "#f59e0b" },
  { id: "safety", label: "Safety & Trust", icon: "fa-shield-halved", color: "#ef4444" },
];

const FAQ_DATA = {
  booking: [
    {
      q: "How do I book equipment on KrushiMitra?",
      a: "Browse equipment on the Dashboard, select the item you need, choose your booking dates using the calendar, and click 'Book Now'. The owner has 48 hours to accept or reject your request.",
      icon: "fa-magnifying-glass",
    },
    {
      q: "How long does it take for an owner to respond to my booking?",
      a: "Owners have 48 hours to accept or reject a booking request. If they don't respond within this time, the booking is automatically rejected and you can book another equipment.",
      icon: "fa-clock",
    },
    {
      q: "Can I cancel a booking?",
      a: "Yes, you can cancel a booking before the start date. Cancellations made at least 24 hours before the start date receive a full refund. Late cancellations may not be eligible for a refund.",
      icon: "fa-ban",
    },
    {
      q: "What happens after my booking is accepted?",
      a: "Once accepted, the booking status changes to 'Confirmed'. On the start date, it automatically moves to 'In Progress'. After the rental period ends, the owner marks it as 'Completed'.",
      icon: "fa-circle-check",
    },
    {
      q: "Can I book my own equipment?",
      a: "No, the platform prevents self-booking. This is a safety measure to maintain platform integrity.",
      icon: "fa-user-slash",
    },
  ],
  listing: [
    {
      q: "How do I list my equipment for rent?",
      a: "Click 'List Equipment' in the navigation bar. Follow the 4-step wizard: enter equipment details, set pricing & availability, provide location, and upload photos. Your listing goes live immediately after submission.",
      icon: "fa-plus-circle",
    },
    {
      q: "What types of equipment can I list?",
      a: "You can list all types of agricultural equipment — tractors, harvesters, tillers, seed drills, rotavators, sprayers, and more. Select the appropriate equipment type and brand while listing.",
      icon: "fa-list",
    },
    {
      q: "How do I set the right rental price?",
      a: "Set a daily rental rate (required) and optionally an hourly rate. Browse similar equipment on the Dashboard to see competitive pricing in your area. You can update your pricing anytime from 'My Equipment'.",
      icon: "fa-tag",
    },
    {
      q: "Can I make my equipment temporarily unavailable?",
      a: "Yes! Go to 'My Equipment' in the dashboard and toggle the availability switch. This hides your equipment from search results without deleting the listing.",
      icon: "fa-toggle-off",
    },
    {
      q: "How many photos should I upload?",
      a: "At least one photo is required, but we strongly recommend uploading 3–5 clear photos from different angles. Good photos significantly increase booking requests.",
      icon: "fa-camera",
    },
  ],
  account: [
    {
      q: "How do I create an account?",
      a: "Click 'Sign Up', fill in your details (name, email, phone number, password, and pin code), and verify your phone number via OTP. Your account is ready to use immediately after verification.",
      icon: "fa-user-plus",
    },
    {
      q: "I forgot my password. How do I log in?",
      a: "Use the 'Login with OTP' option on the login page. Enter your registered mobile number, receive an OTP, and you'll be logged in without needing your password.",
      icon: "fa-key",
    },
    {
      q: "How do I complete my profile?",
      a: "Go to your Profile page from the dropdown menu. Fill in your address, city, state, and pin code. A complete profile is required to list equipment and create bookings.",
      icon: "fa-address-card",
    },
    {
      q: "Can I change my email or phone number?",
      a: "Email and phone number are set during registration and cannot be changed from the profile page. Contact our support team if you need to update these details.",
      icon: "fa-pen-to-square",
    },
  ],
  payments: [
    {
      q: "How does pricing work?",
      a: "Equipment owners set daily (and optionally hourly) rental rates. When you book, the total cost is calculated as: Daily Rate × Number of Days. You can see the estimated cost before confirming.",
      icon: "fa-calculator",
    },
    {
      q: "When am I charged for a booking?",
      a: "You are not charged until the equipment owner accepts your booking request. The estimated total is shown at the time of booking for transparency.",
      icon: "fa-receipt",
    },
    {
      q: "How do equipment owners receive payments?",
      a: "Payment settlement is handled through the platform. Owners can track their booking earnings from the booking history and dashboard.",
      icon: "fa-money-bill-transfer",
    },
  ],
  safety: [
    {
      q: "How does KrushiMitra ensure trust between users?",
      a: "Every user verifies their phone via OTP. Equipment providers have response rate and completion rate metrics visible on their profiles. You can also chat with owners before booking.",
      icon: "fa-user-check",
    },
    {
      q: "What if the equipment is damaged during my rental?",
      a: "Equipment condition is documented in the listing. Report any pre-existing damage via the in-app chat before starting your rental. For disputes, use the 'Report' feature on the equipment page.",
      icon: "fa-triangle-exclamation",
    },
    {
      q: "How do I report a problem with a listing or user?",
      a: "On any equipment detail page, click 'Report this equipment' at the bottom of the sidebar. For user-related issues, visit the Partner Dispute page from the Help section.",
      icon: "fa-flag",
    },
  ],
};

// ── Quick Link Card ──
const QuickLink = ({ icon, title, desc, onClick, color }) => (
  <div
    onClick={onClick}
    style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "14px",
      padding: "24px 20px",
      cursor: "pointer",
      textAlign: "center",
      transition: "all 0.3s ease",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
      e.currentTarget.style.borderColor = color;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
      e.currentTarget.style.borderColor = "#e5e7eb";
    }}
  >
    <div style={{
      width: "52px", height: "52px", borderRadius: "14px",
      background: color + "14", color: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      margin: "0 auto 12px auto", fontSize: "22px",
    }}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1f2937", margin: "0 0 4px 0" }}>{title}</h3>
    <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, lineHeight: 1.4 }}>{desc}</p>
  </div>
);

// ── Main Help Page ──
const Help = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("booking");
  const [openIndex, setOpenIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter FAQs by search
  const currentFaqs = FAQ_DATA[activeCategory] || [];
  const filteredFaqs = searchQuery.trim()
    ? Object.values(FAQ_DATA).flat().filter(
        (faq) =>
          faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentFaqs;

  return (
    <div style={{ minHeight: "80vh", background: "#fafbfa" }}>
      {/* ── Hero Section ── */}
      <div style={{
        background: "linear-gradient(135deg, #166534 0%, #68AC5D 50%, #22c55e 100%)",
        padding: "60px 20px 80px 20px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "200px", height: "200px", borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}></div>
        <div style={{
          position: "absolute", bottom: "-60px", left: "-30px",
          width: "160px", height: "160px", borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
        }}></div>

        <h1 style={{
          fontSize: "36px", fontWeight: 800, color: "#fff",
          margin: "0 0 8px 0", letterSpacing: "-0.5px",
        }}>
          Help Center
        </h1>
        <p style={{
          fontSize: "16px", color: "rgba(255,255,255,0.85)",
          margin: "0 0 28px 0", fontWeight: 400,
        }}>
          Find answers to common questions about KrushiMitra
        </p>

        {/* Search Bar */}
        <div style={{
          maxWidth: "520px", margin: "0 auto",
          position: "relative",
        }}>
          <i className="fa-solid fa-magnifying-glass" style={{
            position: "absolute", left: "18px", top: "50%",
            transform: "translateY(-50%)", color: "#9ca3af", fontSize: "16px",
          }}></i>
          <input
            type="text"
            placeholder="Search for help — e.g. 'how to book', 'cancel booking'"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpenIndex(null);
            }}
            style={{
              width: "100%", padding: "14px 20px 14px 48px",
              borderRadius: "14px", border: "2px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.95)", fontSize: "15px",
              color: "#1f2937", outline: "none", boxSizing: "border-box",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            }}
          />
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div style={{
        maxWidth: "1000px", margin: "-40px auto 0 auto",
        padding: "0 20px", position: "relative", zIndex: 2,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "14px",
        }}>
          <QuickLink
            icon="fa-compass"
            title="Browse Equipment"
            desc="Find what you need"
            onClick={() => navigate("/dashboard")}
            color="#3b82f6"
          />
          <QuickLink
            icon="fa-plus"
            title="List Equipment"
            desc="Start earning today"
            onClick={() => navigate("/addProduct")}
            color="#68AC5D"
          />
          <QuickLink
            icon="fa-clock-rotate-left"
            title="Booking History"
            desc="Track your bookings"
            onClick={() => navigate("/booking-history")}
            color="#8b5cf6"
          />
          <QuickLink
            icon="fa-comment"
            title="Chat"
            desc="Message equipment owners"
            onClick={() => navigate("/chat")}
            color="#f59e0b"
          />
          <QuickLink
            icon="fa-envelope"
            title="Contact Us"
            desc="Get direct support"
            onClick={() => navigate("/contact")}
            color="#ef4444"
          />
        </div>
      </div>

      {/* ── FAQ Section ── */}
      <div style={{
        maxWidth: "1000px", margin: "40px auto 0 auto",
        padding: "0 20px 60px 20px",
      }}>
        <h2 style={{
          fontSize: "24px", fontWeight: 800, color: "#1f2937",
          margin: "0 0 6px 0", textAlign: "center",
        }}>
          {searchQuery ? `Search Results for "${searchQuery}"` : "Frequently Asked Questions"}
        </h2>
        <p style={{
          fontSize: "14px", color: "#6b7280", textAlign: "center",
          margin: "0 0 28px 0",
        }}>
          {searchQuery
            ? `${filteredFaqs.length} result${filteredFaqs.length !== 1 ? "s" : ""} found`
            : "Select a topic below to find answers"}
        </p>

        {/* Category Tabs (hidden during search) */}
        {!searchQuery && (
          <div style={{
            display: "flex", gap: "8px", flexWrap: "wrap",
            justifyContent: "center", marginBottom: "24px",
          }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 18px", borderRadius: "10px",
                  border: activeCategory === cat.id ? `2px solid ${cat.color}` : "1px solid #e5e7eb",
                  background: activeCategory === cat.id ? cat.color + "10" : "#fff",
                  color: activeCategory === cat.id ? cat.color : "#6b7280",
                  fontWeight: 600, fontSize: "13px", cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <i className={`fa-solid ${cat.icon}`} style={{ fontSize: "13px" }}></i>
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* FAQ Items */}
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, idx) => (
              <AccordionItem
                key={idx}
                question={faq.q}
                answer={faq.a}
                icon={faq.icon}
                isOpen={openIndex === idx}
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              />
            ))
          ) : (
            <div style={{
              textAlign: "center", padding: "40px 20px",
              color: "#9ca3af",
            }}>
              <i className="fa-solid fa-magnifying-glass" style={{
                fontSize: "40px", display: "block", marginBottom: "12px", color: "#d1d5db",
              }}></i>
              <p style={{ fontSize: "16px", fontWeight: 600, color: "#6b7280" }}>
                No results found
              </p>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>
                Try different keywords or{" "}
                <span
                  style={{ color: "#68AC5D", cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setSearchQuery("")}
                >
                  browse all topics
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Still Need Help Banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #166534 0%, #68AC5D 100%)",
        padding: "48px 20px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontSize: "24px", fontWeight: 800, color: "#fff",
          margin: "0 0 8px 0",
        }}>
          Still need help?
        </h2>
        <p style={{
          fontSize: "15px", color: "rgba(255,255,255,0.8)",
          margin: "0 0 24px 0",
        }}>
          Our support team is ready to assist you
        </p>
        <div style={{
          display: "flex", gap: "12px", justifyContent: "center",
          flexWrap: "wrap",
        }}>
          <button
            onClick={() => navigate("/contact")}
            style={{
              background: "#fff", color: "#166534",
              border: "none", padding: "12px 32px",
              borderRadius: "10px", fontWeight: 700,
              fontSize: "15px", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; }}
          >
            <i className="fa-solid fa-envelope" style={{ marginRight: "8px" }}></i>
            Contact Support
          </button>
          <a
            href="tel:+919313483725"
            style={{
              background: "rgba(255,255,255,0.15)", color: "#fff",
              border: "1.5px solid rgba(255,255,255,0.3)",
              padding: "12px 32px", borderRadius: "10px",
              fontWeight: 700, fontSize: "15px", cursor: "pointer",
              transition: "all 0.2s ease", textDecoration: "none",
              display: "inline-block",
            }}
            onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.25)"; }}
            onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.15)"; }}
          >
            <i className="fa-solid fa-phone" style={{ marginRight: "8px" }}></i>
            Call Us
          </a>
        </div>
        <div style={{
          display: "flex", gap: "20px", justifyContent: "center",
          flexWrap: "wrap", marginTop: "20px",
          fontSize: "13px", color: "rgba(255,255,255,0.6)",
        }}>
          <span>
            <i className="fa-solid fa-envelope" style={{ marginRight: "6px" }}></i>
            krushimitra@gmail.com
          </span>
          <span>
            <i className="fa-solid fa-phone" style={{ marginRight: "6px" }}></i>
            +91 93134 83725
          </span>
        </div>
      </div>
    </div>
  );
};

export default Help;
