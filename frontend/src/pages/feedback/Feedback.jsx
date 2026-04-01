import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { submitFeedback } from '../../api/equipments';
import './Feedback.css';

const initial_values = {
    name: '',
    phone_number: '',
    description: ''
}

const Feedback = () => {
    const [feedback, setFeedback] = useState(initial_values);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFeedback({ ...feedback, [e.target.name]: e.target.value });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const {data} = await submitFeedback(feedback);

        if(data.success && data.success === true) {
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                navigate('/dashboard');
            }, 4000);
        }
    }


    return (
        <div>
            <div className="flex items-center justify-center bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-6">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Share Your Feedback
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-500">
                        Help us improve KrushiMitra by sharing your experience.
                    </p>
                </div>

                <div className="rounded bg-white max-w-md overflow-hidden shadow-xl p-5">

                    <form className="space-y-4" onSubmit={handleSubmit} method="POST">
                        <input type="hidden" name="remember" value="True" />
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div className="grid gap-6">
                                <div className="col-span-12">
                                    <label htmlFor="feedback-name" className="block mb-2 text-sm font-medium text-gray-700">Name</label>
                                    <input onChange={(e) => handleChange(e)} type="text" name="name" id="feedback-name" autoComplete="given-name" required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 p-2 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                </div>

                                <div className="col-span-12 mt-3">
                                    <label htmlFor="feedback-phone" className="block mb-2 text-sm font-medium text-gray-700">Phone Number</label>
                                    <input onChange={(e) => handleChange(e)} type="text" name="phone_number" id="feedback-phone" autoComplete="tel" required className="mt-1 focus:ring-indigo-500 p-2 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                                </div>

                                <div className="col-span-12 mt-3">
                                    <label htmlFor="feedback-description" className="block mb-2 text-sm font-medium text-gray-700">Your Feedback</label>
                                    <textarea onChange={(e) => handleChange(e)} rows={6} cols={10} name="description" id="feedback-description" required className="mt-1 focus:ring-indigo-500 outline-none focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" placeholder="Tell us what you think..." />
                                </div>
                            </div>
                        </div>

                        <div>
                            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#68AC5D] hover:bg-[#69a360] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Submit Feedback
                            </button>
                        </div>
                    </form>

                    {success && <h1 className='text-md flex justify-center mt-6 text-darkgreen font-semibold'>Thank you for your feedback!</h1>}
            </div>
        </div>

        </div>
        </div>
    )
}

export default Feedback