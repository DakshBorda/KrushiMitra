import React from "react";
import { useNavigate } from "react-router-dom";

//Components
import ExpandDropdown from "../components/expandText";

const Help = () => {
  const navigate = useNavigate();

  const booking_help = [
    {
      heading: "Q: How do I book equipment on KrushiMitra?",
      content:
        "A: You can search and book any equipment available in your location from the Dashboard.",
    },
    {
      heading: "Q: What happens if I return the equipment late?",
      content:
        "A: A penalty may be applicable for the amount of time you are late. Please return equipment on time to avoid extra charges.",
    },
    {
      heading: "Q: How do I end my booking?",
      content:
        "A: You can end your booking by visiting the Booking History page and marking the rental as complete.",
    },
  ];
  const renting_help = [
    {
      heading: "Q: How can I rent out my equipment?",
      content: "A: You can rent out your equipment by listing it on the platform using the 'List Equipment' option in the navigation bar.",
    },
    {
      heading: "Q: How do I receive my rental payments?",
      content:
        "A: Rental payments are managed through the platform. You can track earnings from your booking history.",
    },
    {
      heading: "Q: What types of equipment can I list for booking?",
      content:
        "A: You can list all types of farming equipment on KrushiMitra, including tractors, harvesters, tillers, and more.",
    },
  ];

  return (
    <div className="">
      <div className="bg-[#68AC5D] p-9 content-center">
        <h1 className="font-bold text-5xl text-center text-white m-8">
          How Can We Help?
        </h1>
      </div>
      <div className="bg-white rounded-2xl mx-auto w-11/12 p-9 -translate-y-8 flex justify-center shadow-lg">
        <div style={{ width: "45%" }} className="text-center">
          <h1 className="text-xl font-semibold">Booking Help</h1>
          {booking_help.map((item, i) => {
            return (
              <ExpandDropdown
                key={i}
                heading={item.heading}
                content={item.content}
              />
            );
          })}
        </div>
        <div style={{ width: "45%" }} className="text-center w-100">
          <h1 className="text-xl font-semibold">Renting Help</h1>
          {renting_help.map((item, i) => {
            return (
              <ExpandDropdown
                key={i}
                heading={item.heading}
                content={item.content}
              />
            );
          })}
        </div>
      </div>
      <div className="w-100">
        <div className="p-9 flex w-screen">
          <h1 className="text-xl mr-5 font-semibold">Still need help?</h1>
          <button
            onClick={() => navigate('/contact')}
            className="px-6 py-1 rounded-lg ml-auto text-white text-xl font-semibold hover:bg-green-700 bg-[#68AC5D]"
          >
            Contact Us
          </button>
        </div>
      </div>
    </div>
  );
};

export default Help;
