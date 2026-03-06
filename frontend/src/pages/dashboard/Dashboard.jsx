import React, { useEffect, useState, useMemo } from 'react'
import './Dashboard.css';
import ProductItem from '../../components/dashboardComponent/product/ProductItem';
import Dropdown from '../../components/dropdown/Dropdown';
import { getEquips, getEquipsList, getBrands } from '../../api/equipments';
import { DateRangePicker } from 'react-date-range';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [equipments, setEquipments] = useState([]);
    const [equipList, setEquipList] = useState([]);
    const [searchInput, setSearchInput] = useState('');
    const [visible1, setVisible1] = useState(false);
    const [perDay, setPerDay] = useState(149827);
    const [perHour, setPerHour] = useState(49827);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [brands, setBrands] = useState([]);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [dateFilterActive, setDateFilterActive] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const getEquipments = async () => {
            try {
                const { data } = await getEquips();
                setEquipments(data?.results || data || []);
            } catch (err) {
                console.log("Error fetching equipments:", err);
            }
        }
        getEquipments();
    }, [])

    useEffect(() => {
        const getEquipmentsList = async () => {
            try {
                const { data } = await getEquipsList();
                setEquipList(data || []);
            } catch (err) {
                console.log("Error fetching equipment types:", err);
            }
        }
        getEquipmentsList();
    }, []);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const { data } = await getBrands();
                setBrands(data || []);
            } catch (err) {
                console.log("Error fetching brands:", err);
            }
        }
        fetchBrands();
    }, []);

    const selectionRange = {
        startDate: startDate,
        endDate: endDate,
        key: 'selection'
    }

    const handleDateSelect = (ranges) => {
        setStartDate(ranges.selection.startDate);
        setEndDate(ranges.selection.endDate);
        setDateFilterActive(true);
    };

    const handleCategoryClick = (categoryName) => {
        setSelectedCategory(prev => prev === categoryName ? null : categoryName);
    };

    const handleBrandClick = (brandName) => {
        setSelectedBrand(prev => prev === brandName ? null : brandName);
    };

    const clearAllFilters = () => {
        setSearchInput('');
        setPerDay(149827);
        setPerHour(49827);
        setSelectedCategory(null);
        setSelectedBrand(null);
        setDateFilterActive(false);
        setStartDate(new Date());
        setEndDate(new Date());
    };

    // Combined filtering logic
    const filteredEquipments = useMemo(() => {
        let result = equipments;

        // Search filter
        if (searchInput.trim()) {
            const query = searchInput.toLowerCase();
            result = result.filter(eq =>
                eq?.title?.toLowerCase().includes(query) ||
                eq?.manufacturer?.toLowerCase().includes(query) ||
                eq?.equipment_location?.toLowerCase().includes(query)
            );
        }

        // Price per day filter
        if (perDay < 149827) {
            result = result.filter(eq => eq?.daily_rental <= perDay);
        }

        // Price per hour filter
        if (perHour < 49827) {
            result = result.filter(eq => eq?.hourly_rental <= perHour);
        }

        // Manufacturer/Brand filter
        if (selectedBrand) {
            result = result.filter(eq =>
                eq?.manufacturer?.toLowerCase() === selectedBrand.toLowerCase()
            );
        }

        // Category filter
        if (selectedCategory) {
            result = result.filter(eq => {
                // equipment_type may be an ID or an object
                if (typeof eq?.equipment_type === 'object') {
                    return eq.equipment_type?.name === selectedCategory;
                }
                // Match by looking up the ID in equipList
                const matchedType = equipList.find(t => t.name === selectedCategory);
                return matchedType && eq.equipment_type === matchedType.id;
            });
        }

        // Date availability filter
        if (dateFilterActive) {
            const filterStart = startDate.toISOString().slice(0, 10);
            const filterEnd = endDate.toISOString().slice(0, 10);
            result = result.filter(eq => {
                if (!eq?.available_start_time || !eq?.available_end_time) return true;
                return eq.available_start_time <= filterEnd && eq.available_end_time >= filterStart;
            });
        }

        return result;
    }, [equipments, searchInput, perDay, perHour, selectedCategory, selectedBrand, dateFilterActive, startDate, endDate, equipList]);

    const featuredEquipments = filteredEquipments.slice(0, 6);
    const hasActiveFilters = searchInput || perDay < 149827 || perHour < 49827 || selectedCategory || selectedBrand || dateFilterActive;

    return (
        <>
            <div className='max-w-7xl my-10 mx-auto'>
                <div className='mt-4'>
                    <div className='flex justify-around'>
                        <h1 className='text-2xl font-bold text-gray-600 text-right'>Search Equipments</h1>
                        <div className=''>
                            <div className="input-group relative flex items-center w-full mb-4">
                                <input
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    value={searchInput}
                                    type="search"
                                    className="searchInput form-control relative flex-auto min-w-0 block w-full px-3 py-3 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                                    placeholder="Search by name, brand, or location..."
                                    aria-label="Search"
                                />
                                <button
                                    className="searchBtn btn inline-block px-6 py-2 text-green-600 font-medium text-sm leading-tight uppercase rounded hover:bg-black hover:bg-opacity-5 cursor-pointer focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
                                    type="button"
                                >
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className='flex mb-10 justify-around'>
                        <div className="flex w-[240px] h-[40px] items-center border-2 rounded-lg border-[#68AC5D] px-1">
                            <i className="text-[#68AC5D] pl-4 pr-2 fa-solid fa-location-dot"></i>
                            <input
                                className="searchDash appearance-none bg-transparent w-full text-gray-800 font-semibold mr-1 py-0.5 px-1 leading-tight focus:outline-none"
                                type="text"
                                placeholder="Enter Pincode (eg 201301)"
                                aria-label="Pincode"
                            />
                        </div>
                        <h1 className='mt-3 mb-3 text-md font-semibold text-gray-500 text-center'>
                            Search your desired Equipments directly by entering a keyword or the whole name.
                        </h1>
                    </div>

                    <div className='flex justify-around w-full'>
                        {/* LEFT SIDEBAR — FILTERS */}
                        <div className='w-1/4'>
                            <div className='bg-[#68AC5D] py-4 px-1 prFilter'>
                                <h1 className='text-lg font-bold text-center text-white'>Product Filters</h1>
                            </div>

                            <div className='border py-6'>
                                {hasActiveFilters && (
                                    <div className='px-6 mb-4'>
                                        <button
                                            onClick={clearAllFilters}
                                            className='text-sm text-red-500 underline hover:text-red-700'
                                        >
                                            Clear All Filters
                                        </button>
                                    </div>
                                )}

                                <span className='text-lg mb-4 font-semibold text-[#4F4F4F] border-b-2 border-[#68AC5D] pb-1 ml-6'>Categories:</span>
                                <div className='my-5'>
                                    {equipList?.map(list => (
                                        <Dropdown
                                            key={list.id}
                                            title={list.name}
                                            onClick={handleCategoryClick}
                                            active={selectedCategory === list.name}
                                        />
                                    ))}
                                </div>

                                <span className='text-lg mb-4 font-semibold text-[#4F4F4F] border-b-2 border-[#68AC5D] pb-1 ml-6'>Brands</span>
                                <div className='my-5'>
                                    {brands?.map(brand => (
                                        <Dropdown
                                            key={brand.id}
                                            title={brand.name}
                                            onClick={handleBrandClick}
                                            active={selectedBrand === brand.name}
                                        />
                                    ))}
                                </div>

                                <span className='text-lg mb-4 font-semibold text-[#4F4F4F] border-b-2 border-[#68AC5D] pb-1 ml-6'>Price Range</span>
                                <div className='my-5'>
                                    <p className='text-md font-semibold text-[#4F4F4F] pl-8'>Price per day</p>
                                    <input
                                        type="range"
                                        id="perDay"
                                        min={0}
                                        max={149827}
                                        onChange={(e) => setPerDay(Number(e.target.value))}
                                        value={perDay}
                                        className="rangeInput form-range text-green-100 appearance-none w-full h-6 p-0 bg-transparent focus:outline-none focus:ring-0 focus:shadow-none"
                                    />
                                    <p className='text-md mb-3 font-normal text-[#4F4F4F] pl-8'>Rs. 0 to {perDay}</p>

                                    <p className='text-md font-semibold text-[#4F4F4F] pl-8'>Price per hour</p>
                                    <input
                                        type="range"
                                        id="perHour"
                                        min={0}
                                        max={49827}
                                        onChange={(e) => setPerHour(Number(e.target.value))}
                                        value={perHour}
                                        className="rangeInput form-range text-green-100 appearance-none w-full h-6 p-0 bg-transparent focus:outline-none focus:ring-0 focus:shadow-none"
                                    />
                                    <p className='text-md mb-3 font-normal text-[#4F4F4F] pl-8'>Rs. 0 to {perHour}</p>
                                </div>

                                <span className='text-lg mb-4 font-semibold text-[#4F4F4F] border-b-2 border-[#68AC5D] pb-1 ml-6'>Availability Date</span>
                                <div className='my-3 px-6'>
                                    <button
                                        onClick={() => setVisible1(!visible1)}
                                        className="bg-darkgreen hover:bg-green-700 text-white font-normal text-sm py-2 text-center w-full my-2 px-2 rounded"
                                    >
                                        {dateFilterActive
                                            ? `${startDate.toLocaleDateString()} — ${endDate.toLocaleDateString()}`
                                            : "Select Date Range"}
                                    </button>
                                    {dateFilterActive && (
                                        <button
                                            onClick={() => { setDateFilterActive(false); setStartDate(new Date()); setEndDate(new Date()); }}
                                            className="text-xs text-red-500 underline mb-2"
                                        >
                                            Clear dates
                                        </button>
                                    )}
                                </div>
                                {visible1 && (
                                    <div style={{ zIndex: 10, position: 'relative' }}>
                                        <DateRangePicker
                                            style={{ height: '300px', width: '280px' }}
                                            ranges={[selectionRange]}
                                            minDate={new Date()}
                                            rangeColors={["#68AC5D"]}
                                            onChange={handleDateSelect}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT SIDE — EQUIPMENT GRID */}
                        <div className='w-3/4 ml-8'>
                            {/* Featured Products */}
                            <div className='relative flex justify-around'>
                                <h1 className='absolute top-0 left-0 text-2xl font-bold text-gray-600'>Featured Products</h1>
                            </div>

                            <div className='flex flex-wrap items-center'>
                                <div className='flex flex-wrap my-12'>
                                    {featuredEquipments.length > 0 ? (
                                        featuredEquipments.map(equipment => (
                                            <ProductItem key={equipment.id} equipment={equipment} />
                                        ))
                                    ) : (
                                        <p className='text-gray-400 text-lg ml-4'>No equipment matches your filters.</p>
                                    )}
                                </div>
                            </div>

                            {/* All Products */}
                            <div className='relative flex justify-around'>
                                <h1 className='absolute top-0 left-0 text-2xl font-bold text-gray-600'>
                                    All Products ({filteredEquipments.length})
                                </h1>
                            </div>

                            <div className='flex flex-wrap items-center'>
                                <div className='flex flex-wrap my-12'>
                                    {filteredEquipments.length > 0 ? (
                                        filteredEquipments.map(equipment => (
                                            <ProductItem key={equipment.id} equipment={equipment} />
                                        ))
                                    ) : (
                                        <div className='text-center w-full py-16'>
                                            <h2 className='text-2xl font-bold text-gray-400'>No equipment found</h2>
                                            <p className='text-gray-400 mt-2'>Try adjusting your filters or search terms.</p>
                                            {hasActiveFilters && (
                                                <button
                                                    onClick={clearAllFilters}
                                                    className='mt-4 bg-[#219653] text-white px-6 py-2 rounded hover:opacity-90'
                                                >
                                                    Clear All Filters
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Dashboard