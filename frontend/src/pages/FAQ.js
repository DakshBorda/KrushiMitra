import React from "react";

//Components
import { Link } from "react-router-dom";

const FAQ = () => {
  return (
    <div>
      <div>
        <section className="text-gray-700">
          <div className="container px-5 py-24 mx-auto">
            <div className="text-center mb-20">
              <h1 className="sm:text-3xl text-2xl font-bold text-center title-font text-gray-900 mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-lg leading-relaxed mx-auto">
                The most common questions about how our platform works and what
                we can do for you.
              </p>
            </div>
            <div className="flex flex-wrap lg:w-4/5 sm:mx-auto sm:mb-2 -mx-2">
              <div className="w-full lg:w-1/2 px-4 py-2">
                <details className="mb-4">
                  <summary className="font-semibold text-lg bg-gray-200 rounded-md py-2 px-4">
                    How do I rent farm equipment?
                  </summary>
                  <span className="text-justify px-4 py-2">
                    You can rent farm equipment by browsing the Dashboard, selecting the equipment you need, and placing a booking request.
                  </span>
                </details>
                <details className="mb-4">
                  <summary className="font-semibold bg-gray-200 rounded-md py-2 px-4">
                    How can I list my equipment?
                  </summary>
                  <span className="text-justify px-4 py-2">
                    Listing on KrushiMitra is easy. Click on the
                    "List Equipment" button in the navigation bar.
                    Fill in the details of your equipment and submit.
                    Your listing will be live immediately.
                  </span>
                </details>
                <details className="mb-4">
                  <summary className="font-semibold bg-gray-200 rounded-md py-2 px-4">
                    How do I list my used tractor?
                  </summary>
                  <span className="text-justify px-4 py-2">
                    You can list your new or used tractor on
                    KrushiMitra. Make sure to select the correct condition
                    (New or Used) while creating your equipment listing.
                  </span>
                </details>
              </div>
              <div className="w-full lg:w-1/2 px-4 py-2">
                <details className="mb-4">
                  <summary className="font-semibold bg-gray-200 rounded-md py-2 px-4">
                    Is there an option to buy equipment?
                  </summary>
                  <span className="px-4 py-2 text-justify">
                    Currently, KrushiMitra focuses on equipment rental. Some
                    equipment owners may be open to selling — you can discuss this
                    via the in-app chat feature.
                  </span>
                </details>
                <details className="mb-4">
                  <summary className="font-semibold bg-gray-200 rounded-md py-2 px-4">
                    Do I need a website to list equipment?
                  </summary>
                  <span className="px-4 py-2 text-justify">
                    No, you do not need a website. Once you register on KrushiMitra,
                    you can manage your equipment listings directly from your account dashboard.
                  </span>
                </details>
                <details className="mb-4">
                  <summary className="font-semibold bg-gray-200 rounded-md py-2 px-4">
                    How can I contact KrushiMitra?
                  </summary>
                  <span className="px-4 py-2 text-justify">
                    Visit our{" "}
                    <Link to="/contact">
                      <span className="text-blue-500 inline underline">
                        Contact Us
                      </span>
                    </Link>{" "}
                    page to get in touch with our support team.
                  </span>
                </details>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FAQ;
