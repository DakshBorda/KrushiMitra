import React from "react";
import './ProductItem.css';
import item1 from '../../../img/item1.png';
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProductItem = ({ equipment }) => {
    const navigate = useNavigate();
    const authState = useSelector((state) => state.authReducer);
    const currentUserId = authState?.user?.data?.id || authState?.user?.id || null;

    const imageSrc = equipment?.image || equipment?.image_1 || equipment?.image_2 || equipment?.image_3 || item1;

    // Check if current user owns this equipment
    const isOwner = currentUserId && equipment?.owner === currentUserId;
    const isUnavailable = equipment?.is_available === false;

    const title = equipment?.title || "Equipment";
    const brand = equipment?.manufacturer_name || equipment?.manufacturer || "";
    const location = equipment?.equipment_location || "";
    const dailyRate = equipment?.daily_rental || 0;
    const hourlyRate = equipment?.hourly_rental || 0;
    const condition = equipment?.condition || "New";

    return (
        <div className={`eq-card ${isUnavailable && !isOwner ? 'is-unavailable' : ''}`}>
            {/* Image */}
            <Link to={`/product/${equipment.eq_id}`} className="eq-card-img-wrap">
                <img
                    className="eq-card-img"
                    src={imageSrc}
                    alt={title}
                    onError={(e) => { e.target.src = item1; }}
                    loading="lazy"
                />
                {/* Badges */}
                {isOwner && <span className="eq-badge owner">Your Equipment</span>}
                {isUnavailable && !isOwner && <span className="eq-badge unavailable">Unavailable</span>}
                {condition && <span className="eq-badge condition">{condition}</span>}
            </Link>

            {/* Body */}
            <div className="eq-card-body">
                <Link to={`/product/${equipment.eq_id}`} style={{ textDecoration: 'none' }}>
                    <h3 className="eq-card-title">{title}</h3>
                </Link>
                {brand && <p className="eq-card-brand">{brand}</p>}
                {location && (
                    <p className="eq-card-location">
                        <i className="fa-solid fa-location-dot" style={{ fontSize: '10px' }}></i>
                        {location.length > 30 ? location.substring(0, 30) + '...' : location}
                    </p>
                )}

                {/* Price */}
                <div className="eq-card-price-row">
                    <span className="eq-card-price">₹{dailyRate.toLocaleString('en-IN')}</span>
                    <span className="eq-card-price-unit">/ day</span>
                    {hourlyRate > 0 && (
                        <span className="eq-card-price-hourly">
                            ₹{hourlyRate.toLocaleString('en-IN')}/hr
                        </span>
                    )}
                </div>

                {/* CTA */}
                <button
                    onClick={() => navigate(`/product/${equipment.eq_id}`)}
                    className="eq-card-cta"
                >
                    View Details
                </button>
            </div>
        </div>
    );
};

export default ProductItem;
