import React from 'react'
import './Dropdown.css';

const Dropdown = ({ title, onClick, active }) => {
    return (
        <div
            className={`dropdown mt-1.5 cursor-pointer ${active ? 'bg-green-50' : ''}`}
            onClick={() => onClick && onClick(title)}
        >
            <div className='flex relative py-3 items-center'>
                <h1 className={`absolute top-0 px-5 left-0 text-md text-wide font-normal ${active ? 'text-[#219653] font-semibold' : 'text-[#4F4F4F]'}`}>
                    {title}
                </h1>
                <i className={`absolute top-0 pr-5 right-0 pl-1 w-5 fa-solid ${active ? 'fa-check text-[#219653]' : 'fa-angle-right text-green-700'}`}></i>
            </div>
        </div>
    )
}

export default Dropdown