import React, { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { useNavigate } from 'react-router-dom';

const ContactUs = () => {
  const formRef = useRef();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (sending) return;
    setError('');
    setSending(true);

    emailjs.sendForm(
      process.env.REACT_APP_SERVICE_ID,
      process.env.REACT_APP_TEMPLATE_ID,
      formRef.current,
      process.env.REACT_APP_USER_ID
    ).then(() => {
      setDone(true);
      setName(''); setEmail(''); setMessage(''); setSubject(''); setPhone('');
      setSending(false);
      setTimeout(() => setDone(false), 5000);
    }, (err) => {
      console.log(err.text);
      setError('Failed to send message. Please try again or email us directly.');
      setSending(false);
    });
  };

  return (
    <div style={{ minHeight: '80vh', background: '#fafbfa' }}>
      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #166534 0%, #68AC5D 50%, #22c55e 100%)',
        padding: '52px 20px 70px 20px',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }}></div>
        <h1 style={{
          fontSize: '36px', fontWeight: 800, color: '#fff',
          margin: '0 0 8px 0', letterSpacing: '-0.5px',
        }}>
          Contact Us
        </h1>
        <p style={{
          fontSize: '16px', color: 'rgba(255,255,255,0.85)',
          margin: 0, fontWeight: 400,
        }}>
          We'd love to hear from you. Get in touch with our team.
        </p>
      </div>

      {/* ── Main Content ── */}
      <div style={{
        maxWidth: '1000px', margin: '-36px auto 0 auto',
        padding: '0 20px 60px 20px', position: 'relative', zIndex: 2,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: '24px',
          alignItems: 'start',
        }}>
          {/* ── Left: Contact Info ── */}
          <div>
            {/* Direct Contact Card */}
            <div style={{
              background: '#fff', borderRadius: '16px',
              padding: '28px 24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb',
              marginBottom: '16px',
            }}>
              <h2 style={{
                fontSize: '18px', fontWeight: 700, color: '#1f2937',
                margin: '0 0 20px 0',
              }}>
                <i className="fa-solid fa-headset" style={{ color: '#68AC5D', marginRight: '10px' }}></i>
                Get In Touch
              </h2>

              {/* Email */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '12px',
                background: '#f0fdf4', marginBottom: '12px',
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #68AC5D, #4a9c3f)',
                  color: '#fff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                }}>
                  <i className="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</p>
                  <a href="mailto:krushimitra@gmail.com" style={{
                    fontSize: '14px', fontWeight: 700, color: '#166534',
                    textDecoration: 'none',
                  }}>
                    krushimitra@gmail.com
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '12px',
                background: '#f0fdf4', marginBottom: '12px',
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #68AC5D, #4a9c3f)',
                  color: '#fff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                }}>
                  <i className="fa-solid fa-phone"></i>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</p>
                  <a href="tel:+919313483725" style={{
                    fontSize: '14px', fontWeight: 700, color: '#166534',
                    textDecoration: 'none',
                  }}>
                    +91 93134 83725
                  </a>
                </div>
              </div>

              {/* Location */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '12px',
                background: '#f9fafb', marginBottom: '12px',
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: '#f3f4f6', color: '#6b7280',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                }}>
                  <i className="fa-solid fa-location-dot"></i>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: 0 }}>
                    India
                  </p>
                </div>
              </div>

              {/* Response Time */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '12px',
                background: '#f9fafb',
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: '#f3f4f6', color: '#6b7280',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                }}>
                  <i className="fa-solid fa-clock"></i>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Response Time</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: 0 }}>
                    Within 24 hours
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div style={{
              background: '#fff', borderRadius: '16px',
              padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', margin: '0 0 14px 0' }}>
                Quick Links
              </h3>
              {[
                { icon: 'fa-circle-question', label: 'Help Center', path: '/help' },
                { icon: 'fa-comment', label: 'Chat with Equipment Owners', path: '/chat' },
                { icon: 'fa-handshake', label: 'Partner Dispute', path: '/partner-dispute' },
              ].map((link, i) => (
                <div
                  key={i}
                  onClick={() => navigate(link.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '8px',
                    cursor: 'pointer', marginBottom: i < 2 ? '4px' : 0,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <i className={`fa-solid ${link.icon}`} style={{ color: '#68AC5D', fontSize: '14px', width: '20px', textAlign: 'center' }}></i>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>{link.label}</span>
                  <i className="fa-solid fa-chevron-right" style={{ marginLeft: 'auto', fontSize: '10px', color: '#d1d5db' }}></i>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Contact Form ── */}
          <div style={{
            background: '#fff', borderRadius: '16px',
            padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid #e5e7eb',
          }}>
            <h2 style={{
              fontSize: '20px', fontWeight: 700, color: '#1f2937',
              margin: '0 0 4px 0',
            }}>
              <i className="fa-solid fa-paper-plane" style={{ color: '#68AC5D', marginRight: '10px' }}></i>
              Send Us a Message
            </h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 24px 0' }}>
              Fill out the form and we'll get back to you within 24 hours.
            </p>

            {/* Success message */}
            {done && (
              <div style={{
                background: '#ecfdf5', border: '1px solid #6ee7b7',
                borderRadius: '10px', padding: '14px 16px',
                marginBottom: '20px', textAlign: 'center',
              }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#16a34a', marginRight: '8px' }}></i>
                <span style={{ color: '#065f46', fontWeight: 600, fontSize: '14px' }}>
                  Message sent successfully! We'll get back to you soon.
                </span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: '10px', padding: '14px 16px',
                marginBottom: '20px', textAlign: 'center',
              }}>
                <span style={{ color: '#991b1b', fontWeight: 600, fontSize: '14px' }}>
                  {error}
                </span>
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Name */}
                <div>
                  <label style={labelStyle}>Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    onChange={(e) => setName(e.target.value)} value={name}
                    style={inputStyle} id="contact-name"
                    required type="text" name="user_name"
                    placeholder="Your full name"
                  />
                </div>
                {/* Email */}
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    onChange={(e) => setEmail(e.target.value)} value={email}
                    style={inputStyle} id="contact-email"
                    type="email" name="user_email"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Phone */}
                <div>
                  <label style={labelStyle}>Mobile No. <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    onChange={(e) => setPhone(e.target.value)} value={phone}
                    style={inputStyle} id="contact-phone"
                    required type="text" name="user_phone"
                    placeholder="10-digit mobile number"
                  />
                </div>
                {/* Subject */}
                <div>
                  <label style={labelStyle}>Subject</label>
                  <input
                    onChange={(e) => setSubject(e.target.value)} value={subject}
                    style={inputStyle} id="contact-subject"
                    type="text" name="subject"
                    placeholder="What's this about?"
                  />
                </div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Message <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                  onChange={(e) => setMessage(e.target.value)}
                  value={message}
                  rows={5}
                  name="message"
                  id="contact-message"
                  required
                  autoComplete="off"
                  placeholder="Describe your question or issue in detail..."
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: '120px',
                  }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: sending
                    ? '#9ca3af'
                    : 'linear-gradient(135deg, #68AC5D 0%, #4a9c3f 100%)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(104, 172, 93, 0.3)',
                  transition: 'all 0.3s ease',
                }}
              >
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane" style={{ marginRight: '8px' }}></i>
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Shared Styles ──
const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '2px solid #e5e7eb',
  fontSize: '14px',
  fontWeight: 500,
  color: '#1f2937',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  transition: 'border-color 0.2s ease',
};

export default ContactUs;