import React, { useState, useEffect, useMemo } from 'react'
import './Product.css';
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel } from "react-responsive-carousel";
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRangePicker } from 'react-date-range';
import { getEquip } from '../../api/equipments';
import apiServer from '../../api/config';
import { createBooking, getOwnerStats, getBlockedDates } from '../../api/bookingAPI';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import Cookies from "js-cookie";
import { extractErrorMsg } from '../../utils/errorUtils';

const Product = () => {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [datesSelected, setDatesSelected] = useState(false); // ← KEY: tracks if user actually picked dates
    const [equipment, setEquipment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [blockedRanges, setBlockedRanges] = useState([]);
    const [bookingError, setBookingError] = useState('');
    const [ownerStats, setOwnerStats] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState(false);
    // Reviews & Rating state
    const [reviewData, setReviewData] = useState({ reviews: [], average_rating: 0, total_reviews: 0, can_review: false, has_reviewed: false });
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [ratingSubmitted, setRatingSubmitted] = useState(false);
    const [ratingError, setRatingError] = useState('');
    const [ratingLoading, setRatingLoading] = useState(false);
    const params = useParams();
    const navigate = useNavigate();
    const authState = useSelector((state) => state.authReducer);
    const currentUserId = authState?.user?.data?.id || authState?.user?.id || null;

    const isOwner = equipment?.is_owner === true ||
        (currentUserId && equipment?.owner?.id === currentUserId);

    useEffect(() => {
        setLoading(true);
        getEquip(params.eqId)
            .then(res => setEquipment(res?.data))
            .catch(err => console.error('Error loading equipment:', err))
            .finally(() => setLoading(false));
    }, [params.eqId]);

    // Fetch owner metrics + blocked dates when equipment loads
    useEffect(() => {
        if (equipment?.owner?.id) {
            getOwnerStats(equipment.owner.id).then(res => {
                if (res?.data) setOwnerStats(res.data);
            });
        }
        if (equipment?.id) fetchBlockedDates();
    }, [equipment?.owner?.id, equipment?.id]);

    // Fetch reviews & eligibility for this equipment
    const fetchReviews = async () => {
        if (!equipment?.id) return;
        try {
            const headers = Cookies.get('access-token')
                ? { Authorization: `Bearer ${Cookies.get('access-token')}` }
                : {};
            const res = await apiServer.get(`/api/equipment/reviews/?equipment_id=${equipment.id}`, { headers });
            setReviewData(res.data);
        } catch (err) {
            console.error('Error loading reviews:', err);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [equipment?.id]);

    const handleSelect = (ranges) => {
        setStartDate(ranges.selection.startDate);
        setEndDate(ranges.selection.endDate);
        setDatesSelected(true); // ← User interacted with calendar
        setBookingError('');
    };

    const selectionRange = { startDate, endDate, key: 'selection' };
    const formattedStartDate = format(new Date(startDate), "yyyy-MM-dd");
    const formattedEndDate = format(new Date(endDate), "yyyy-MM-dd");

    const fetchBlockedDates = async () => {
        if (!equipment?.id) return;
        try {
            const res = await getBlockedDates(equipment.id);
            setBlockedRanges(res?.data || []);
        } catch (err) { console.error("Error fetching blocked dates:", err); }
    };

    const disabledDates = useMemo(() => {
        const dates = [];
        blockedRanges.forEach(range => {
            const start = new Date(range.start_date);
            const end = new Date(range.end_date);
            for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                dates.push(new Date(dt));
            }
        });
        return dates;
    }, [blockedRanges]);

    // Cost calculations
    const numberOfDays = useMemo(() => {
        if (!datesSelected) return 0;
        const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
        return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, 1);
    }, [startDate, endDate, datesSelected]);

    const estimatedCost = useMemo(() => {
        if (!equipment?.daily_rental || !datesSelected) return 0;
        return numberOfDays * equipment.daily_rental;
    }, [numberOfDays, equipment?.daily_rental, datesSelected]);

    // Can the user book?
    const canBook = datesSelected && equipment?.is_available && Cookies.get('access-token');

    const handleBookingClick = () => {
        setBookingError('');
        if (!Cookies.get('access-token')) { navigate('/login'); return; }
        if (!datesSelected) {
            setBookingError('Please select your booking dates first.');
            return;
        }
        if (!equipment?.is_available) {
            setBookingError('This equipment is currently unavailable.');
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirmBooking = async () => {
        setBookingError('');
        setBookingInProgress(true);
        try {
            await createBooking(equipment?.id, formattedStartDate, formattedEndDate);
            setShowConfirmModal(false);
            setBookingSuccess(true);
            // Brief success toast before redirect
            setTimeout(() => navigate('/booking-history'), 1500);
        } catch (err) {
            setBookingError(extractErrorMsg(err));
            setShowConfirmModal(false);
        } finally {
            setBookingInProgress(false);
        }
    };

    const startChat = () => {
        if (equipment?.owner?.id) navigate(`/chat?userId=${equipment.owner.id}&equipmentId=${equipment.id}`);
        else navigate('/chat');
    };

    const images = [equipment?.image_1, equipment?.image_2, equipment?.image_3, equipment?.image_4, equipment?.image_5].filter(Boolean);
    const ownerInitial = equipment?.owner?.first_name?.[0]?.toUpperCase() || '?';

    if (loading) {
        return (
            <div className="pd-page">
                <div className="pd-loading">
                    <div className="pd-loading-spinner"></div>
                    <p style={{ color: '#9ca3af', fontWeight: 500 }}>Loading equipment...</p>
                </div>
            </div>
        );
    }

    if (!equipment) {
        return (
            <div className="pd-page">
                <div className="pd-loading">
                    <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px', display: 'block' }}></i>
                    <p style={{ color: '#374151', fontSize: '18px', fontWeight: 700 }}>Equipment not found</p>
                    <button onClick={() => navigate('/dashboard')} className="pd-btn-manage" style={{ marginTop: '16px' }}>
                        Browse Equipment
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pd-page">
            {/* Banners */}
            {isOwner && (
                <div className="pd-banner owner">
                    This is your equipment — viewing as it appears to farmers
                </div>
            )}
            {!isOwner && !equipment.is_available && (
                <div className="pd-banner unavailable">
                    This equipment is currently unavailable for booking
                </div>
            )}

            {/* Booking Success Toast */}
            {bookingSuccess && (
                <div className="pd-banner success" style={{
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    border: '1px solid #86efac',
                    color: '#166534',
                    textAlign: 'center',
                    animation: 'pd-toast-in 0.3s ease',
                }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>
                    Booking request submitted! Redirecting to your booking history...
                </div>
            )}

            {/* Image Gallery */}
            {images.length > 0 && (
                <div className="pd-gallery">
                    <Carousel
                        autoPlay infiniteLoop showStatus={false}
                        showIndicators={images.length > 1} showThumbs={images.length > 1}
                        interval={4000} thumbWidth={80}
                    >
                        {images.map((img, idx) => (
                            <div key={idx}>
                                <img style={{ maxHeight: '420px', objectFit: 'contain' }}
                                    src={img} alt={`${equipment.title} ${idx + 1}`} />
                            </div>
                        ))}
                    </Carousel>
                </div>
            )}

            {/* Main Content */}
            <div className="pd-content">
                {/* LEFT: Details */}
                <div className="pd-main">
                    <div className="pd-header">
                        <div>
                            <h1 className="pd-title">{equipment.title}</h1>
                            <div className="pd-subtitle">
                                <span>{equipment.manufacturer}</span>
                                {equipment.condition && (
                                    <>
                                        <span>•</span>
                                        <span className="pd-condition-badge">
                                            {equipment.condition}
                                        </span>
                                    </>
                                )}
                                {equipment.equipment_location && (
                                    <>
                                        <span>•</span>
                                        <span>{equipment.equipment_location}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {equipment.description && (
                        <div className="pd-section">
                            <h2 className="pd-section-title">
                                <i className="fa-solid fa-file-lines"></i> About This Equipment
                            </h2>
                            <p className="pd-description">{equipment.description}</p>
                        </div>
                    )}

                    {/* Specifications */}
                    <div className="pd-section">
                        <h2 className="pd-section-title">
                            <i className="fa-solid fa-gears"></i> Specifications
                        </h2>
                        <div className="pd-specs-grid">
                            {equipment.manufacturer ? (
                                <div className="pd-spec-card">
                                    <span className="pd-spec-icon"><i className="fa-solid fa-industry"></i></span>
                                    <div className="pd-spec-value">{equipment.manufacturer}</div>
                                    <div className="pd-spec-label">Manufacturer</div>
                                </div>
                            ) : null}
                            {equipment.model ? (
                                <div className="pd-spec-card">
                                    <span className="pd-spec-icon"><i className="fa-solid fa-clipboard"></i></span>
                                    <div className="pd-spec-value">{equipment.model}</div>
                                    <div className="pd-spec-label">Model</div>
                                </div>
                            ) : null}
                            {equipment.manufacturing_year ? (
                                <div className="pd-spec-card">
                                    <span className="pd-spec-icon"><i className="fa-solid fa-calendar"></i></span>
                                    <div className="pd-spec-value">{equipment.manufacturing_year}</div>
                                    <div className="pd-spec-label">Year</div>
                                </div>
                            ) : null}
                            {equipment.horsepower ? (
                                <div className="pd-spec-card">
                                    <span className="pd-spec-icon"><i className="fa-solid fa-bolt"></i></span>
                                    <div className="pd-spec-value">{equipment.horsepower} HP</div>
                                    <div className="pd-spec-label">Horsepower</div>
                                </div>
                            ) : null}
                            {equipment.weight ? (
                                <div className="pd-spec-card">
                                    <span className="pd-spec-icon"><i className="fa-solid fa-weight-hanging"></i></span>
                                    <div className="pd-spec-value">{equipment.weight} kg</div>
                                    <div className="pd-spec-label">Weight</div>
                                </div>
                            ) : null}
                            {equipment.width ? (
                                <div className="pd-spec-card">
                                    <span className="pd-spec-icon"><i className="fa-solid fa-ruler-horizontal"></i></span>
                                    <div className="pd-spec-value">{equipment.width}</div>
                                    <div className="pd-spec-label">Width</div>
                                </div>
                            ) : null}
                            {equipment.height ? (
                                <div className="pd-spec-card">
                                    <span className="pd-spec-icon"><i className="fa-solid fa-ruler-vertical"></i></span>
                                    <div className="pd-spec-value">{equipment.height}</div>
                                    <div className="pd-spec-label">Height</div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Owner / Provider */}
                    <div className="pd-section">
                        <h2 className="pd-section-title">
                            <i className="fa-solid fa-shield-halved"></i> Equipment Provider
                        </h2>
                        <div className="pd-owner-trust">
                            <div className="pd-owner-header">
                                <div className="pd-owner-avatar">{ownerInitial}</div>
                                <div>
                                    <div className="pd-owner-name">
                                        {equipment.owner?.first_name} {equipment.owner?.last_name}
                                    </div>
                                    <div className="pd-owner-joined">
                                        {equipment.equipment_location && equipment.equipment_location}
                                        {equipment.owner?.phone_number && equipment.show_phone_number && (
                                            <span style={{ marginLeft: '12px' }}>{equipment.owner.phone_number}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {ownerStats && ownerStats.total_bookings_received > 0 && (
                                <div className="pd-trust-grid">
                                    <div className="pd-trust-item">
                                        <div className="pd-trust-value">
                                            {ownerStats.avg_response_hours != null ? `${ownerStats.avg_response_hours}h` : '—'}
                                        </div>
                                        <div className="pd-trust-label">
                                            {ownerStats.avg_response_hours != null && ownerStats.avg_response_hours <= 4
                                                ? 'Fast Responder' : 'Avg Response'}
                                        </div>
                                    </div>
                                    <div className="pd-trust-item">
                                        <div className="pd-trust-value">{ownerStats.response_rate}%</div>
                                        <div className="pd-trust-label">Response Rate</div>
                                    </div>
                                    <div className="pd-trust-item">
                                        <div className="pd-trust-value">{ownerStats.completion_rate}%</div>
                                        <div className="pd-trust-label">Completion</div>
                                    </div>
                                    <div className="pd-trust-item">
                                        <div className="pd-trust-value">{ownerStats.total_bookings_received}</div>
                                        <div className="pd-trust-label">Bookings</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════ */}
                    {/*  RATINGS & REVIEWS SECTION                    */}
                    {/* ══════════════════════════════════════════════ */}
                    <div className="pd-section">
                        <h2 className="pd-section-title">
                            <i className="fa-solid fa-star"></i> Ratings & Reviews
                        </h2>

                        {/* Average rating header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '16px',
                            background: '#fafbfa', borderRadius: '12px',
                            padding: '16px 20px', border: '1px solid #e5e7eb',
                            marginBottom: '16px',
                        }}>
                            <div style={{ textAlign: 'center', minWidth: '70px' }}>
                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>
                                    {reviewData.average_rating || '—'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', margin: '4px 0' }}>
                                    {[1,2,3,4,5].map(s => (
                                        <i key={s} className="fa-solid fa-star" style={{
                                            fontSize: '12px',
                                            color: s <= Math.round(reviewData.average_rating) ? '#f59e0b' : '#e5e7eb',
                                        }}></i>
                                    ))}
                                </div>
                                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>
                                    {reviewData.total_reviews} review{reviewData.total_reviews !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '16px', flex: 1 }}>
                                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                                    {reviewData.total_reviews === 0
                                        ? 'No reviews yet. Be the first to share your experience!'
                                        : reviewData.average_rating >= 4
                                            ? 'This equipment is highly rated by previous renters.'
                                            : 'See what other farmers have to say about this equipment.'}
                                </p>
                            </div>
                        </div>

                        {/* Write a Review — only for eligible users */}
                        {reviewData.can_review && !ratingSubmitted && (
                            <div style={{
                                background: '#fffbeb', borderRadius: '12px',
                                padding: '20px 24px', border: '1px solid #fde68a',
                                marginBottom: '16px',
                            }}>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', margin: '0 0 12px 0' }}>
                                    <i className="fa-solid fa-pen" style={{ marginRight: '8px' }}></i>
                                    Write a Review
                                </p>
                                <p style={{ fontSize: '12px', color: '#a16207', margin: '0 0 12px 0' }}>
                                    You've completed a booking for this equipment. Share your experience!
                                </p>

                                {/* Star picker */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star} type="button"
                                            onClick={() => setUserRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                fontSize: '26px', padding: '2px',
                                                color: star <= (hoverRating || userRating) ? '#f59e0b' : '#d1d5db',
                                                transition: 'color 0.15s, transform 0.15s',
                                                transform: star <= (hoverRating || userRating) ? 'scale(1.15)' : 'scale(1)',
                                            }}
                                        >
                                            <i className="fa-solid fa-star"></i>
                                        </button>
                                    ))}
                                    {(hoverRating || userRating) > 0 && (
                                        <span style={{ marginLeft: '10px', fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>
                                            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][hoverRating || userRating]}
                                        </span>
                                    )}
                                </div>

                                {/* Review text */}
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="How was the equipment? Was it in good condition? Easy to use? Share details to help other farmers…"
                                    maxLength={500}
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                                        border: '2px solid #e5e7eb', fontSize: '13px', fontWeight: 500,
                                        color: '#1f2937', outline: 'none', boxSizing: 'border-box',
                                        resize: 'vertical', minHeight: '80px',
                                        transition: 'border-color 0.2s',
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <span style={{ fontSize: '11px', color: reviewText.length > 450 ? '#ef4444' : '#9ca3af' }}>
                                        {reviewText.length}/500 characters
                                    </span>
                                    {reviewText.trim().length > 0 && reviewText.trim().length < 10 && (
                                        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                                            Minimum 10 characters
                                        </span>
                                    )}
                                </div>

                                {ratingError && (
                                    <p style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, margin: '8px 0 0 0' }}>
                                        {ratingError}
                                    </p>
                                )}

                                <button
                                    disabled={!userRating || ratingLoading || (reviewText.trim().length > 0 && reviewText.trim().length < 10)}
                                    onClick={async () => {
                                        setRatingError('');
                                        if (!userRating) { setRatingError('Please select a star rating.'); return; }
                                        if (reviewText.trim().length > 0 && reviewText.trim().length < 10) {
                                            setRatingError('Review must be at least 10 characters.');
                                            return;
                                        }
                                        setRatingLoading(true);
                                        try {
                                            await apiServer.post('/api/equipment/rating/', {
                                                equipment: equipment.id,
                                                rating: userRating,
                                                review: reviewText.trim(),
                                            }, {
                                                headers: { Authorization: `Bearer ${Cookies.get('access-token')}` },
                                            });
                                            setRatingSubmitted(true);
                                            fetchReviews(); // Reload reviews to show the new one
                                        } catch (err) {
                                            const data = err?.response?.data;
                                            if (data?.equipment) {
                                                const msg = Array.isArray(data.equipment) ? data.equipment[0] : data.equipment;
                                                setRatingError(String(msg));
                                            } else if (data?.msg) setRatingError(data.msg);
                                            else if (data?.non_field_errors) setRatingError(data.non_field_errors[0]);
                                            else setRatingError('Failed to submit review. Please try again.');
                                        } finally {
                                            setRatingLoading(false);
                                        }
                                    }}
                                    style={{
                                        marginTop: '12px',
                                        padding: '10px 24px', borderRadius: '10px',
                                        border: 'none', fontWeight: 700, fontSize: '13px',
                                        background: userRating ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e5e7eb',
                                        color: userRating ? '#fff' : '#9ca3af',
                                        cursor: userRating ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {ratingLoading ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        )}

                        {/* Review submitted success */}
                        {ratingSubmitted && (
                            <div style={{
                                background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '12px',
                                padding: '16px 20px', marginBottom: '16px', textAlign: 'center',
                            }}>
                                <i className="fa-solid fa-circle-check" style={{ fontSize: '20px', color: '#16a34a', marginRight: '8px' }}></i>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                                    Thanks for your review!
                                </span>
                            </div>
                        )}

                        {/* Already reviewed notice */}
                        {reviewData.has_reviewed && !ratingSubmitted && (
                            <div style={{
                                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
                                padding: '12px 16px', marginBottom: '16px', fontSize: '13px',
                                color: '#166534', fontWeight: 600,
                            }}>
                                <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>
                                You've already reviewed this equipment.
                            </div>
                        )}

                        {/* Reviews list */}
                        {reviewData.reviews.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {reviewData.reviews.map((rev) => (
                                    <div key={rev.id} style={{
                                        background: '#fff', borderRadius: '12px',
                                        padding: '16px 20px', border: '1px solid #f3f4f6',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #68AC5D, #4a9c3f)',
                                                    color: '#fff', display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                                                }}>
                                                    {rev.user_name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937' }}>
                                                        {rev.user_name}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '2px' }}>
                                                        {[1,2,3,4,5].map(s => (
                                                            <i key={s} className="fa-solid fa-star" style={{
                                                                fontSize: '10px',
                                                                color: s <= rev.rating ? '#f59e0b' : '#e5e7eb',
                                                            }}></i>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                            </span>
                                        </div>
                                        {rev.review && (
                                            <p style={{ fontSize: '13px', color: '#4b5563', margin: '8px 0 0 0', lineHeight: 1.6 }}>
                                                {rev.review}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', margin: '8px 0 0 0' }}>
                                No reviews yet.
                            </p>
                        )}
                    </div>

                    {/* Cancellation Policy */}
                    <div className="pd-section">
                        <h2 className="pd-section-title">
                            <i className="fa-solid fa-rotate-left"></i> Cancellation Policy
                        </h2>
                        <div className="pd-policy">
                            <div className="pd-policy-type">
                                <i className="fa-solid fa-info-circle"></i> Moderate
                            </div>
                            <p className="pd-policy-text">
                                Cancel at least <strong>24 hours</strong> before the booking start date for a full refund.
                                Late cancellations may not be eligible. The owner has <strong>48 hours</strong> to respond to your request.
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Booking Sidebar */}
                <div className="pd-sidebar">
                    <div className="pd-booking-card">
                        <div className="pd-price-header">
                            <span className="pd-price-amount">₹{equipment.daily_rental}</span>
                            <span className="pd-price-unit">/ day</span>
                            <span className={`pd-availability-badge ${equipment.is_available ? 'available' : 'unavailable'}`}>
                                {equipment.is_available ? '● Available' : '● Unavailable'}
                            </span>
                        </div>

                        {isOwner ? (
                            <div>
                                <div className="pd-owner-card">
                                    <p style={{ color: '#16a34a', fontWeight: 700, fontSize: '15px' }}>Your Equipment</p>
                                    <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>You cannot book your own listing</p>
                                </div>
                                <button onClick={() => navigate('/my-equipment')} className="pd-btn-manage">
                                    Manage in My Equipment
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Step 1: Select Dates */}
                                <button
                                    className={`pd-cal-toggle ${calendarOpen ? 'open' : ''}`}
                                    onClick={() => setCalendarOpen(!calendarOpen)}
                                >
                                    <span>
                                        <i className="fa-solid fa-calendar-days" style={{ marginRight: '8px' }}></i>
                                        {datesSelected
                                            ? `${formattedStartDate} → ${formattedEndDate}`
                                            : 'Step 1: Select Dates'}
                                    </span>
                                    <i className={`fa-solid fa-chevron-${calendarOpen ? 'up' : 'down'}`}></i>
                                </button>

                                {calendarOpen && (
                                    <div className="pd-cal-wrap">
                                        <DateRangePicker
                                            ranges={[selectionRange]}
                                            minDate={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })()}
                                            disabledDates={disabledDates}
                                            rangeColors={["#68AC5D"]}
                                            onChange={handleSelect}
                                            months={1}
                                            direction="vertical"
                                        />
                                        {disabledDates.length > 0 && (
                                            <div style={{
                                                padding: '8px 16px 12px',
                                                fontSize: '11px',
                                                color: '#9ca3af',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '2px',
                                                    background: '#e5e7eb',
                                                    border: '1px solid #d1d5db',
                                                    flexShrink: 0,
                                                }}></span>
                                                Grayed-out dates are already booked
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Cost Preview — only after dates selected */}
                                {datesSelected && (
                                    <div className="pd-cost-preview">
                                        <div className="pd-cost-row">
                                            <span className="pd-cost-label">
                                                ₹{equipment.daily_rental} × {numberOfDays} day{numberOfDays > 1 ? 's' : ''}
                                            </span>
                                            <span className="pd-cost-value">
                                                ₹{estimatedCost.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <hr className="pd-cost-divider" />
                                        <div className="pd-cost-row">
                                            <span className="pd-cost-total-label">Estimated Total</span>
                                            <span className="pd-cost-total-value">₹{estimatedCost.toLocaleString('en-IN')}</span>
                                        </div>
                                        <p className="pd-cost-dates">{formattedStartDate} → {formattedEndDate}</p>
                                    </div>
                                )}

                                {/* Prompt to select dates if not done */}
                                {!datesSelected && !calendarOpen && (
                                    <div style={{
                                        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
                                        padding: '12px 16px', marginBottom: '12px', textAlign: 'center',
                                    }}>
                                        <p style={{ fontSize: '13px', color: '#92400e', margin: 0, fontWeight: 600 }}>
                                            Please select your dates above to proceed
                                        </p>
                                    </div>
                                )}

                                {bookingError && <div className="pd-error">{bookingError}</div>}

                                {/* Book Now — DISABLED until dates selected */}
                                {Cookies.get('access-token') ? (
                                    <button
                                        className={`pd-btn-book ${canBook && !bookingSuccess ? 'primary' : 'disabled'}`}
                                        onClick={handleBookingClick}
                                        disabled={!canBook || bookingSuccess}
                                    >
                                        {bookingSuccess
                                            ? 'Booking Submitted!'
                                            : !equipment.is_available
                                                ? 'Currently Unavailable'
                                                : !datesSelected
                                                    ? 'Select Dates to Book'
                                                    : 'Book Now'}
                                    </button>
                                ) : (
                                    <button className="pd-btn-book login" onClick={() => navigate('/login')}>
                                        Login to Book
                                    </button>
                                )}

                                <p className="pd-no-charge">You won't be charged until the owner accepts</p>

                                {/* Chat */}
                                {Cookies.get('access-token') ? (
                                    <button className="pd-btn-chat" onClick={startChat}>
                                        <i className="fa-solid fa-comment"></i> Chat with Owner
                                    </button>
                                ) : (
                                    <button className="pd-btn-chat" onClick={() => navigate('/login')} style={{ opacity: 0.6 }}>
                                        <i className="fa-solid fa-comment"></i> Login to Chat
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {!isOwner && (
                        <div className="pd-report">
                            <a onClick={() => navigate(`/equipment-report/${equipment.id}`)}>
                                <i className="fa-solid fa-flag" style={{ marginRight: '4px' }}></i>
                                Report this equipment
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="pd-modal-overlay" onClick={() => !bookingInProgress && setShowConfirmModal(false)}>
                    <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="pd-modal-title">Confirm Booking</h2>
                        <p className="pd-modal-subtitle">Review the details before confirming</p>

                        <div className="pd-modal-summary">
                            <div className="pd-modal-row">
                                <span className="pd-modal-row-label">Equipment</span>
                                <span className="pd-modal-row-value">{equipment.title}</span>
                            </div>
                            <div className="pd-modal-row">
                                <span className="pd-modal-row-label">Owner</span>
                                <span className="pd-modal-row-value">
                                    {equipment.owner?.first_name} {equipment.owner?.last_name}
                                </span>
                            </div>
                            <div className="pd-modal-row">
                                <span className="pd-modal-row-label">Dates</span>
                                <span className="pd-modal-row-value">{formattedStartDate} → {formattedEndDate}</span>
                            </div>
                            <div className="pd-modal-row">
                                <span className="pd-modal-row-label">Duration</span>
                                <span className="pd-modal-row-value">{numberOfDays} day{numberOfDays > 1 ? 's' : ''}</span>
                            </div>
                            <div className="pd-modal-row">
                                <span className="pd-modal-row-label">Daily Rate</span>
                                <span className="pd-modal-row-value">₹{equipment.daily_rental}</span>
                            </div>
                            <div className="pd-modal-row pd-modal-total">
                                <span className="pd-cost-total-label">Estimated Total</span>
                                <span className="pd-cost-total-value">₹{estimatedCost.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div className="pd-modal-notice">
                            The owner has <strong>48 hours</strong> to respond. You won't be charged until accepted.
                            Free cancellation up to 24h before start date.
                        </div>

                        <div className="pd-modal-actions">
                            <button className="pd-modal-btn cancel" disabled={bookingInProgress}
                                onClick={() => setShowConfirmModal(false)}>Cancel</button>
                            <button className="pd-modal-btn confirm" disabled={bookingInProgress}
                                onClick={handleConfirmBooking}>
                                {bookingInProgress ? 'Booking...' : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Product;