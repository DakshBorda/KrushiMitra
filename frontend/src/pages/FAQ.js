import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// FAQ content is now integrated into the Help Center
const FAQ = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/help", { replace: true });
  }, [navigate]);

  return null;
};

export default FAQ;
