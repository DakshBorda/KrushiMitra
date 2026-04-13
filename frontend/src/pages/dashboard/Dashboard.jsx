import React, { useEffect, useState, useMemo, useCallback } from 'react'
import './Dashboard.css';
import ProductItem from '../../components/dashboardComponent/product/ProductItem';
import { getEquips, getEquipsList, getBrands } from '../../api/equipments';
import usePolling from '../../utils/usePolling';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'name_az', label: 'Name: A → Z' },
];

const Dashboard = () => {
    const [equipments, setEquipments] = useState([]);
    const [equipList, setEquipList] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchInput, setSearchInput] = useState('');
    const [maxDailyPrice, setMaxDailyPrice] = useState(null); // null = no filter
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedCondition, setSelectedCondition] = useState(null); // 'New' | 'Used' | null
    const [sortBy, setSortBy] = useState('newest');

    // Date filter
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [dateFilterActive, setDateFilterActive] = useState(false);

    // ── Price ceiling from actual data ──
    const priceMax = useMemo(() => {
        if (equipments.length === 0) return 10000;
        const max = Math.max(...equipments.map(eq => eq?.daily_rental || 0));
        // Round up to nearest nice number
        return Math.ceil(max / 500) * 500 || 10000;
    }, [equipments]);

    const [priceSliderValue, setPriceSliderValue] = useState(null);

    // Reset slider when priceMax changes
    useEffect(() => {
        setPriceSliderValue(priceMax);
    }, [priceMax]);

    // ── Fetch data ──
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [eqRes, typeRes, brandRes] = await Promise.allSettled([
                    getEquips(),
                    getEquipsList(),
                    getBrands(),
                ]);
                if (eqRes.status === 'fulfilled') {
                    const d = eqRes.value?.data;
                    let items = [];
                    if (Array.isArray(d)) items = d;
                    else if (d?.results && Array.isArray(d.results)) items = d.results;
                    else if (d?.data && Array.isArray(d.data)) items = d.data;
                    setEquipments(items);
                }
                if (typeRes.status === 'fulfilled') {
                    setEquipList(typeRes.value?.data || []);
                }
                if (brandRes.status === 'fulfilled') {
                    setBrands(brandRes.value?.data || []);
                }
            } catch (err) {
                console.error('Error fetching equipment data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // Silent refresh every 60s with visibility API (pauses when tab hidden)
    const silentRefreshEquipments = useCallback(async () => {
        try {
            const eqRes = await getEquips();
            const d = eqRes?.data;
            let items = [];
            if (Array.isArray(d)) items = d;
            else if (d?.results && Array.isArray(d.results)) items = d.results;
            else if (d?.data && Array.isArray(d.data)) items = d.data;
            setEquipments(items);
        } catch (err) {
            // Silent fail — will retry next interval
        }
    }, []);
    usePolling(silentRefreshEquipments, 60000);

    // ── Date handler ──
    const handleDateSelect = (ranges) => {
        setStartDate(ranges.selection.startDate);
        setEndDate(ranges.selection.endDate);
        setDateFilterActive(true);
    };

    // ── Combined filtering + sorting ──
    const filteredEquipments = useMemo(() => {
        let result = [...equipments];

        // Search
        if (searchInput.trim()) {
            const q = searchInput.toLowerCase();
            result = result.filter(eq =>
                eq?.title?.toLowerCase().includes(q) ||
                eq?.manufacturer_name?.toLowerCase().includes(q) ||
                eq?.manufacturer?.toLowerCase().includes(q) ||
                eq?.equipment_location?.toLowerCase().includes(q)
            );
        }

        // Price
        if (maxDailyPrice !== null && priceSliderValue < priceMax) {
            result = result.filter(eq => (eq?.daily_rental || 0) <= priceSliderValue);
        }

        // Brand
        if (selectedBrand) {
            result = result.filter(eq =>
                (eq?.manufacturer_name || eq?.manufacturer || '').toLowerCase() === selectedBrand.toLowerCase()
            );
        }

        // Category
        if (selectedCategory) {
            result = result.filter(eq => {
                if (typeof eq?.equipment_type === 'object') {
                    return eq.equipment_type?.name === selectedCategory;
                }
                const matchedType = equipList.find(t => t.name === selectedCategory);
                return matchedType && eq.equipment_type === matchedType.id;
            });
        }

        // Condition
        if (selectedCondition) {
            result = result.filter(eq => eq?.condition === selectedCondition);
        }

        // Date availability
        if (dateFilterActive) {
            const filterStart = startDate.toISOString().slice(0, 10);
            const filterEnd = endDate.toISOString().slice(0, 10);
            result = result.filter(eq => {
                if (!eq?.available_start_time || !eq?.available_end_time) return true;
                return eq.available_start_time <= filterEnd && eq.available_end_time >= filterStart;
            });
        }

        // Sort
        switch (sortBy) {
            case 'price_low':
                result.sort((a, b) => (a?.daily_rental || 0) - (b?.daily_rental || 0));
                break;
            case 'price_high':
                result.sort((a, b) => (b?.daily_rental || 0) - (a?.daily_rental || 0));
                break;
            case 'name_az':
                result.sort((a, b) => (a?.title || '').localeCompare(b?.title || ''));
                break;
            case 'newest':
            default:
                // Already sorted by newest from API
                break;
        }

        return result;
    }, [equipments, searchInput, priceSliderValue, priceMax, maxDailyPrice, selectedCategory, selectedBrand, selectedCondition, dateFilterActive, startDate, endDate, equipList, sortBy]);

    // ── Active filters ──
    const activeFilters = [];
    if (searchInput.trim()) activeFilters.push({ key: 'search', label: `"${searchInput}"`, clear: () => setSearchInput('') });
    if (selectedCategory) activeFilters.push({ key: 'category', label: selectedCategory, clear: () => setSelectedCategory(null) });
    if (selectedBrand) activeFilters.push({ key: 'brand', label: selectedBrand, clear: () => setSelectedBrand(null) });
    if (selectedCondition) activeFilters.push({ key: 'condition', label: selectedCondition, clear: () => setSelectedCondition(null) });
    if (maxDailyPrice !== null && priceSliderValue < priceMax) activeFilters.push({ key: 'price', label: `≤ ₹${priceSliderValue?.toLocaleString('en-IN')}`, clear: () => { setMaxDailyPrice(null); setPriceSliderValue(priceMax); } });
    if (dateFilterActive) activeFilters.push({ key: 'date', label: `${startDate.toLocaleDateString('en-IN')} — ${endDate.toLocaleDateString('en-IN')}`, clear: () => { setDateFilterActive(false); setStartDate(new Date()); setEndDate(new Date()); } });

    const clearAllFilters = () => {
        setSearchInput('');
        setMaxDailyPrice(null);
        setPriceSliderValue(priceMax);
        setSelectedCategory(null);
        setSelectedBrand(null);
        setSelectedCondition(null);
        setDateFilterActive(false);
        setStartDate(new Date());
        setEndDate(new Date());
        setSortBy('newest');
    };

    const hasActiveFilters = activeFilters.length > 0;

    // ── Price slider fill percentage ──
    const priceFill = priceMax > 0 ? ((priceSliderValue || priceMax) / priceMax) * 100 : 100;

    return (
        <>
            {/* ═══ HERO SEARCH ═══ */}
            <div className="browse-hero">
                <h1 className="browse-hero-title">Browse Equipment</h1>
                <p className="browse-hero-subtitle">
                    Find the right farming equipment for your needs — tractors, tillers, harvesters & more
                </p>
                <div className="browse-search-wrap">
                    <i className="fa-solid fa-magnifying-glass browse-search-icon"></i>
                    <input
                        type="text"
                        className="browse-search-input"
                        placeholder="Search by equipment name, brand, or location..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        id="browse-search"
                    />
                    {searchInput && (
                        <button className="browse-search-clear" onClick={() => setSearchInput('')}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    )}
                </div>

                {/* Active filter chips */}
                {hasActiveFilters && (
                    <div className="browse-chips">
                        {activeFilters.map(f => (
                            <span key={f.key} className="browse-chip" onClick={f.clear}>
                                {f.label} <span className="browse-chip-x">×</span>
                            </span>
                        ))}
                        <span className="browse-chip browse-clear-all" onClick={clearAllFilters}>
                            Clear All <span className="browse-chip-x">×</span>
                        </span>
                    </div>
                )}
            </div>

            {/* ═══ MAIN LAYOUT ═══ */}
            <div className="browse-layout">

                {/* ── SIDEBAR FILTERS ── */}
                <aside className="browse-sidebar">

                    {/* Categories */}
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Categories</div>
                        {equipList?.map(type => (
                            <div
                                key={type.id}
                                className={`filter-item ${selectedCategory === type.name ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(prev => prev === type.name ? null : type.name)}
                            >
                                <span className="filter-item-name">{type.name}</span>
                                <span className="filter-item-check">
                                    {selectedCategory === type.name && <i className="fa-solid fa-check"></i>}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Brands */}
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Manufacturers</div>
                        {brands?.map(brand => (
                            <div
                                key={brand.id}
                                className={`filter-item ${selectedBrand === brand.name ? 'active' : ''}`}
                                onClick={() => setSelectedBrand(prev => prev === brand.name ? null : brand.name)}
                            >
                                <span className="filter-item-name">{brand.name}</span>
                                <span className="filter-item-check">
                                    {selectedBrand === brand.name && <i className="fa-solid fa-check"></i>}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Condition */}
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Condition</div>
                        <div className="condition-toggle">
                            <button
                                className={`condition-btn ${selectedCondition === 'New' ? 'active' : ''}`}
                                onClick={() => setSelectedCondition(prev => prev === 'New' ? null : 'New')}
                            >
                                New
                            </button>
                            <button
                                className={`condition-btn ${selectedCondition === 'Used' ? 'active' : ''}`}
                                onClick={() => setSelectedCondition(prev => prev === 'Used' ? null : 'Used')}
                            >
                                Used
                            </button>
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Daily Rental Price</div>
                        <div className="price-range-wrap">
                            <div className="price-range-label">
                                <span>₹0</span>
                                <span className="price-range-value">
                                    ₹{(priceSliderValue || priceMax).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <input
                                type="range"
                                className="price-range-slider"
                                min={0}
                                max={priceMax}
                                step={Math.max(Math.round(priceMax / 100), 50)}
                                value={priceSliderValue || priceMax}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setPriceSliderValue(val);
                                    setMaxDailyPrice(val);
                                }}
                                style={{ '--fill': `${priceFill}%` }}
                            />
                            {maxDailyPrice !== null && priceSliderValue < priceMax && (
                                <button
                                    style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                    onClick={() => { setMaxDailyPrice(null); setPriceSliderValue(priceMax); }}
                                >
                                    Reset price
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Date Availability */}
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Availability</div>
                        <div style={{ padding: '12px 18px', position: 'relative' }}>
                            <button
                                className={`date-filter-btn ${dateFilterActive ? 'has-dates' : ''}`}
                                onClick={() => setShowDatePicker(!showDatePicker)}
                            >
                                <i className="fa-solid fa-calendar-days"></i>
                                {dateFilterActive
                                    ? `${startDate.toLocaleDateString('en-IN')} — ${endDate.toLocaleDateString('en-IN')}`
                                    : 'Select dates'}
                            </button>
                            {dateFilterActive && (
                                <button
                                    style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: '6px', display: 'block' }}
                                    onClick={() => { setDateFilterActive(false); setStartDate(new Date()); setEndDate(new Date()); setShowDatePicker(false); }}
                                >
                                    Clear dates
                                </button>
                            )}
                            {showDatePicker && (
                                <div className="date-picker-container">
                                    <DateRangePicker
                                        ranges={[{ startDate, endDate, key: 'selection' }]}
                                        minDate={new Date()}
                                        rangeColors={["#16a34a"]}
                                        onChange={handleDateSelect}
                                        months={1}
                                        direction="vertical"
                                    />
                                    <div style={{ padding: '8px 16px 12px', textAlign: 'right' }}>
                                        <button
                                            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                                            onClick={() => setShowDatePicker(false)}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* ── MAIN CONTENT ── */}
                <main className="browse-main">

                    {/* Toolbar */}
                    <div className="browse-toolbar">
                        <div className="browse-result-count">
                            {loading ? (
                                'Loading equipment...'
                            ) : (
                                <>
                                    Showing <strong>{filteredEquipments.length}</strong>
                                    {hasActiveFilters ? ` of ${equipments.length}` : ''} equipment
                                </>
                            )}
                        </div>
                        <select
                            className="browse-sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            id="browse-sort"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Loading skeleton */}
                    {loading && (
                        <div className="browse-skeleton">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="skeleton-card">
                                    <div className="skeleton-img" />
                                    <div className="skeleton-body">
                                        <div className="skeleton-line" />
                                        <div className="skeleton-line short" />
                                        <div className="skeleton-line price" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Equipment grid */}
                    {!loading && (
                        <div className="browse-grid">
                            {filteredEquipments.length > 0 ? (
                                filteredEquipments.map(equipment => (
                                    <ProductItem key={equipment.id} equipment={equipment} />
                                ))
                            ) : (
                                <div className="browse-empty">
                                    <div className="browse-empty-icon">
                                        <i className="fa-solid fa-tractor"></i>
                                    </div>
                                    <h2 className="browse-empty-title">No equipment found</h2>
                                    <p className="browse-empty-text">
                                        Try adjusting your filters or search terms to find what you need.
                                    </p>
                                    {hasActiveFilters && (
                                        <button className="browse-empty-btn" onClick={clearAllFilters}>
                                            Clear All Filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </>
    )
}

export default Dashboard