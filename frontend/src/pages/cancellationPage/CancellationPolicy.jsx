import Cookies from "js-cookie";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CancellationForm from "../../components/cancellationForm";

const CancellationPolicy = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if(!Cookies.get('access-token')) {
        navigate('/');
    }
  }, [navigate]);
  
  return (
    <div className="max-w-3xl flex flex-col mx-auto justify-center">
      <div className="my-10">
        <h1 className="text-4xl py-8 font-semibold text-gray-600">Cancellation Policy</h1>
        <p className="text-md font-semibold leading-7 tracking-wide text-gray-800">
          KrushiMitra allows farmers and equipment owners to manage booking cancellations fairly. 
          Our cancellation policy is designed to protect both parties and ensure a reliable experience.
        </p>
        <ul className="list-disc ml-6 mt-4 text-gray-700 leading-7 font-medium">
          <li><strong>Farmers (Customers):</strong> You can cancel a pending booking at any time. 
          For confirmed bookings, cancellation is allowed up to 24 hours before the rental start date.</li>
          <li><strong>Equipment Owners:</strong> You can cancel a confirmed booking with a valid reason. 
          All owner cancellations require a reason to be provided.</li>
          <li><strong>Auto-Expiry:</strong> If an equipment owner does not respond to a booking request 
          within 48 hours, the booking will automatically expire.</li>
          <li><strong>No Partial Cancellations:</strong> Bookings cannot be partially cancelled. 
          The entire booking period is cancelled as a unit.</li>
        </ul>
        <p className="mt-4 text-sm text-gray-500">
          For disputes or special circumstances, please use the Partner Dispute form or contact our support team.
        </p>
      </div>

        <CancellationForm />
    </div>
  );
};

export default CancellationPolicy;
