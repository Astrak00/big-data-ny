/**
 * NYC Urban Data Explorer - Frontend Application
 * ===============================================
 */

// ===========================================
// State Management
// ===========================================
var state = {
    startDate: null,
    endDate: null,
    mtaChart: null,
    boroChart: null,
    theme: 'dark',
    allData: {
        taxi: [],
        bike: [],
        arrests: [],
        shootings: [],
        mta: []
    }
};

// ===========================================
// Constants
// ===========================================
var COLORS = {
    taxi: '#f59e0b',
    bike: '#10b981',
    arrests: '#ec4899',
    shootings: '#ef4444',
    blue: '#3b82f6'
};

var WEATHER_ICONS = {
    0: '☀️',
    1: '🌤️',
    2: '⛅',
    3: '☁️',
    45: '🌫️',
    48: '🌫️',
    51: '🌧️',
    53: '🌧️',
    55: '🌧️',
    61: '🌧️',
    63: '🌧️',
    65: '🌧️',
    71: '❄️',
    73: '❄️',
    75: '❄️',
    77: '❄️',
    80: '🌧️',
    81: '🌧️',
    82: '🌧️',
    85: '❄️',
    86: '❄️',
    95: '⛈️',
    96: '⛈️',
    99: '⛈️'
};

// ===========================================
// Map Initialization
// ===========================================
var map = L.map('map').setView([40.7128, -74.006], 12);

var TILE_URLS = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
};

var currentTileLayer = L.tileLayer(TILE_URLS.dark, {
    attribution: '© OpenStreetMap © CARTO',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// ===========================================
// Layer Groups
// ===========================================
var layers = {
    taxi: createClusterGroup(COLORS.taxi),
    bike: createClusterGroup(COLORS.bike),
    arrests: createClusterGroup(COLORS.arrests),
    shootings: createClusterGroup(COLORS.shootings),
    weather: L.layerGroup()
};

// Add default layers to map
layers.taxi.addTo(map);
layers.bike.addTo(map);
layers.arrests.addTo(map);
layers.shootings.addTo(map);

function createClusterGroup(color) {
    return L.markerClusterGroup({
        // Disable clustering at zoom level 16 and above - show individual markers
        disableClusteringAtZoom: 16,
        // Spiderfy markers when clicking on a cluster
        spiderfyOnMaxZoom: true,
        // Show coverage area on hover
        showCoverageOnHover: true,
        // Maximum cluster radius in pixels
        maxClusterRadius: 50,
        iconCreateFunction: function(cluster) {
            var count = cluster.getChildCount();
            var size = count < 10 ? 28 : count < 100 ? 34 : 40;
            return L.divIcon({
                html: '<div style="' +
                    'background:' + color + ';' +
                    'color:' + (color === COLORS.taxi || color === COLORS.bike ? '#000' : '#fff') + ';' +
                    'width:' + size + 'px;height:' + size + 'px;' +
                    'border-radius:50%;' +
                    'display:flex;align-items:center;justify-content:center;' +
                    'font-weight:600;font-size:' + (size < 34 ? '11' : '12') + 'px;' +
                    'box-shadow:0 0 12px ' + color + '50;' +
                '">' + count + '</div>',
                className: 'custom-cluster',
                iconSize: [size, size]
            });
        }
    });
}

function createMarkerIcon(color) {
    return L.divIcon({
        html: '<div style="' +
            'background:' + color + ';' +
            'width:12px;height:12px;' +
            'border-radius:50%;' +
            'border:2px solid rgba(255,255,255,0.8);' +
            'box-shadow:0 0 8px ' + color + ';' +
        '"></div>',
        className: 'custom-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
}

// ===========================================
// Utility Functions
// ===========================================
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function safeNumber(val, decimals) {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return Number(val).toFixed(decimals);
}

function safeDate(dateStr) {
    if (!dateStr) return 'N/A';
    if (dateStr.indexOf('T') !== -1) return dateStr.split('T')[0];
    return dateStr;
}

function getElement(id) {
    return document.getElementById(id);
}

// ===========================================
// Weather Functions
// ===========================================
async function updateWeather(startDate, endDate) {
    try {
        var url = startDate ? '/api/weather?date=' + startDate : '/api/weather';
        var res = await fetch(url);
        var weather = await res.json();
        
        if (!weather || !weather.data) return;
        
        var iconEl = getElement('weather-icon');
        var tempEl = getElement('weather-temp');
        var descEl = getElement('weather-desc');
        var histEl = getElement('weather-historical');
        var extraEl = getElement('weather-extra');
        
        if (iconEl) {
            var code = weather.data.weatherCode || 0;
            iconEl.textContent = WEATHER_ICONS[code] || WEATHER_ICONS[0];
        }
        
        if (tempEl) tempEl.textContent = weather.data.temperature + '°C';
        if (descEl) descEl.textContent = weather.data.description;
        
        if (histEl) {
            histEl.innerHTML = weather.isHistorical 
                ? '<span class="badge badge-historical">Historical</span>' 
                : '';
        }
        
        if (extraEl) {
            if (weather.data.humidity > 0) {
                extraEl.textContent = 'Wind ' + weather.data.windSpeed + ' km/h | Humidity ' + weather.data.humidity + '%';
            } else {
                extraEl.textContent = 'Wind ' + weather.data.windSpeed + ' km/h | Precip ' + weather.data.precipitation + 'mm';
            }
        }
    } catch (e) {
        console.error('Error updating weather:', e);
    }
}

// ===========================================
// Weather Overlay Functions
// ===========================================
var weatherOverlayVisible = false;
var weatherGridData = null;

async function loadWeatherGrid(date) {
    try {
        var url = date ? '/api/weather/grid?date=' + date : '/api/weather/grid';
        var res = await fetch(url);
        var result = await res.json();
        
        if (result.success && result.data) {
            weatherGridData = result.data;
            updateWeatherCount();
            if (weatherOverlayVisible) {
                renderWeatherOverlay();
            }
        }
    } catch (e) {
        console.error('Error loading weather grid:', e);
    }
}

function updateWeatherCount() {
    var countEl = getElement('count-weather');
    if (countEl && weatherGridData) {
        if (weatherGridData.maxPrecipitation > 0) {
            countEl.textContent = weatherGridData.maxPrecipitation.toFixed(1) + 'mm';
        } else {
            countEl.textContent = 'Dry';
        }
    }
}

function renderWeatherOverlay() {
    layers.weather.clearLayers();
    
    if (!weatherGridData || !weatherGridData.points || weatherGridData.points.length === 0) {
        return;
    }
    
    var points = weatherGridData.points;
    var maxPrecip = Math.max(weatherGridData.maxPrecipitation, 1); // Avoid division by zero
    
    // Create circles for each grid point with interpolated precipitation
    points.forEach(function(point) {
        if (point.precipitation > 0) {
            var intensity = Math.min(point.precipitation / maxPrecip, 1);
            var opacity = 0.15 + intensity * 0.45;
            var radius = 1500 + intensity * 2000; // 1.5-3.5 km radius (smaller for 8x8 grid)
            
            var circle = L.circle([point.lat, point.lon], {
                radius: radius,
                fillColor: COLORS.blue,
                fillOpacity: opacity,
                stroke: false
            });
            
            circle.bindPopup(
                '<div class="popup-content">' +
                '<h4 style="color:' + COLORS.blue + ';">Precipitation</h4>' +
                '<p><span class="label">Amount</span><span class="value">' + point.precipitation.toFixed(1) + ' mm</span></p>' +
                '<p><span class="label">Temperature</span><span class="value">' + point.temperature.toFixed(1) + '°C</span></p>' +
                '</div>'
            );
            
            layers.weather.addLayer(circle);
        }
    });
    
    // Show legend item
    var legendPrecip = getElement('legend-precip');
    if (legendPrecip) {
        legendPrecip.style.display = 'flex';
    }
}

function hideWeatherOverlay() {
    layers.weather.clearLayers();
    
    var legendPrecip = getElement('legend-precip');
    if (legendPrecip) {
        legendPrecip.style.display = 'none';
    }
}

// ===========================================
// Layer Management
// ===========================================
function clearAllLayers() {
    layers.taxi.clearLayers();
    layers.bike.clearLayers();
    layers.arrests.clearLayers();
    layers.shootings.clearLayers();
}

function populateLayers(data) {
    // Taxi markers
    if (data.taxi && Array.isArray(data.taxi)) {
        data.taxi.forEach(function(trip) {
            try {
                if (!trip.pickup_latitude || !trip.pickup_longitude) return;
                
                var marker = L.marker(
                    [trip.pickup_latitude, trip.pickup_longitude],
                    { icon: createMarkerIcon(COLORS.taxi) }
                );
                
                marker.bindPopup(createPopup('Taxi Trip', COLORS.taxi, [
                    { label: 'Distance', value: (trip.trip_distance || 'N/A') + ' mi' },
                    { label: 'Fare', value: '$' + safeNumber(trip.fare_amount, 2) },
                    { label: 'Passengers', value: trip.passenger_count || 'N/A' },
                    { label: 'Pickup', value: safeDate(trip.tpep_pickup_datetime) }
                ]));
                
                layers.taxi.addLayer(marker);
            } catch (e) {
                console.error('Taxi marker error:', e);
            }
        });
    }
    
    // Bike markers
    if (data.bike && Array.isArray(data.bike)) {
        data.bike.forEach(function(trip) {
            try {
                if (!trip.start_lat || !trip.start_lng) return;
                
                var marker = L.marker(
                    [trip.start_lat, trip.start_lng],
                    { icon: createMarkerIcon(COLORS.bike) }
                );
                
                marker.bindPopup(createPopup('Bike Trip', COLORS.bike, [
                    { label: 'From', value: trip.start_station_name || 'N/A' },
                    { label: 'To', value: trip.end_station_name || 'N/A' },
                    { label: 'Type', value: trip.rideable_type || 'N/A' },
                    { label: 'Started', value: safeDate(trip.started_at) }
                ]));
                
                layers.bike.addLayer(marker);
            } catch (e) {
                console.error('Bike marker error:', e);
            }
        });
    }
    
    // Arrests markers
    if (data.arrests && Array.isArray(data.arrests)) {
        data.arrests.forEach(function(arrest) {
            try {
                if (!arrest.coordinates || !arrest.coordinates[0] || !arrest.coordinates[1]) return;
                
                var marker = L.marker(
                    [arrest.coordinates[1], arrest.coordinates[0]],
                    { icon: createMarkerIcon(COLORS.arrests) }
                );
                
                var props = arrest.properties || {};
                marker.bindPopup(createPopup('Arrest', COLORS.arrests, [
                    { label: 'Offense', value: props.ofns_desc || 'N/A' },
                    { label: 'Description', value: props.pd_desc || 'N/A' },
                    { label: 'Date', value: safeDate(props.arrest_date) },
                    { label: 'Precinct', value: props.arrest_precinct || 'N/A' }
                ]));
                
                layers.arrests.addLayer(marker);
            } catch (e) {
                console.error('Arrest marker error:', e);
            }
        });
    }
    
    // Shootings markers
    if (data.shootings && Array.isArray(data.shootings)) {
        data.shootings.forEach(function(shooting) {
            try {
                if (!shooting.coordinates || !shooting.coordinates[0] || !shooting.coordinates[1]) return;
                
                var marker = L.marker(
                    [shooting.coordinates[1], shooting.coordinates[0]],
                    { icon: createMarkerIcon(COLORS.shootings) }
                );
                
                var props = shooting.properties || {};
                marker.bindPopup(createPopup('Shooting', COLORS.shootings, [
                    { label: 'Borough', value: props.boro || 'N/A' },
                    { label: 'Date', value: safeDate(props.occur_date) },
                    { label: 'Time', value: props.occur_time || 'N/A' },
                    { label: 'Location', value: props.loc_classfctn_desc || 'N/A' },
                    { label: 'Fatal', value: props.statistical_murder_flag ? 'Yes' : 'No' }
                ]));
                
                layers.shootings.addLayer(marker);
            } catch (e) {
                console.error('Shooting marker error:', e);
            }
        });
    }
}

function createPopup(title, color, items) {
    var html = '<div class="popup-content">';
    html += '<h4 style="color:' + color + ';">' + title + '</h4>';
    
    items.forEach(function(item) {
        html += '<p><span class="label">' + item.label + '</span>';
        html += '<span class="value">' + item.value + '</span></p>';
    });
    
    html += '</div>';
    return html;
}

// ===========================================
// Chart Functions
// ===========================================
function updateCharts(mta, aggregate, isSingleDay) {
    try {
        updateMTAChart(mta, isSingleDay);
        updateBoroChart(aggregate);
    } catch (e) {
        console.error('Error updating charts:', e);
    }
}

function updateMTAChart(mta, isSingleDay) {
    var chartContainer = getElement('mta-chart-container');
    var singleDayContainer = getElement('mta-single-day');
    
    if (isSingleDay && mta && mta.data && mta.data.length > 0) {
        // Show single day stats
        chartContainer.style.display = 'none';
        singleDayContainer.style.display = 'block';
        
        var mtaData = mta.data[0];
        getElement('mta-subway').textContent = formatNumber(mtaData.subways_ridership || 0);
        getElement('mta-bus').textContent = formatNumber(mtaData.buses_ridership || 0);
        getElement('mta-lirr').textContent = formatNumber(mtaData.lirr_ridership || 0);
        getElement('mta-metro').textContent = formatNumber(mtaData.metro_north_ridership || 0);
    } else {
        // Show chart
        chartContainer.style.display = 'block';
        singleDayContainer.style.display = 'none';
        
        if (state.mtaChart) {
            state.mtaChart.destroy();
            state.mtaChart = null;
        }
        
        var chartData = (mta && mta.data) ? mta.data.slice(-14) : [];
        var ctx = getElement('mta-chart').getContext('2d');
        
        state.mtaChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(function(d) {
                    return d.date ? d.date.split('/').slice(0, 2).join('/') : '';
                }),
                datasets: [
                    {
                        label: 'Subway',
                        data: chartData.map(function(d) {
                            return ((d.subways_ridership || 0) / 1000000).toFixed(2);
                        }),
                        borderColor: COLORS.blue,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        pointBackgroundColor: COLORS.blue,
                        pointHoverBackgroundColor: '#fff',
                        pointBorderColor: '#fff',
                        pointHoverBorderColor: COLORS.blue,
                        pointBorderWidth: 1,
                        pointHoverBorderWidth: 2,
                        borderWidth: 2
                    },
                    {
                        label: 'Bus',
                        data: chartData.map(function(d) {
                            return ((d.buses_ridership || 0) / 1000000).toFixed(2);
                        }),
                        borderColor: COLORS.bike,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        pointBackgroundColor: COLORS.bike,
                        pointHoverBackgroundColor: '#fff',
                        pointBorderColor: '#fff',
                        pointHoverBorderColor: COLORS.bike,
                        pointBorderWidth: 1,
                        pointHoverBorderWidth: 2,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#888',
                            boxWidth: 12,
                            font: { size: 10 },
                            padding: 8
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: COLORS.blue,
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                return 'Date: ' + context[0].label;
                            },
                            label: function(context) {
                                var value = context.parsed.y;
                                return context.dataset.label + ': ' + value + 'M riders';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#666', font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { 
                            color: '#666', 
                            font: { size: 10 },
                            callback: function(value) {
                                return value + 'M';
                            }
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }
}

function updateBoroChart(aggregate) {
    if (state.boroChart) {
        state.boroChart.destroy();
        state.boroChart = null;
    }
    
    var arrestsByBoro = (aggregate && aggregate.data && aggregate.data.arrestsByBoro) || {};
    var shootingsByBoro = (aggregate && aggregate.data && aggregate.data.shootingsByBoro) || {};
    
    // Get unique borough labels
    var allBoros = Object.keys(arrestsByBoro).concat(Object.keys(shootingsByBoro));
    var boroLabels = allBoros.filter(function(b, i) {
        return allBoros.indexOf(b) === i && b !== 'Unknown';
    });
    
    if (boroLabels.length === 0) boroLabels = ['No Data'];
    
    var ctx = getElement('boro-chart').getContext('2d');
    
    state.boroChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: boroLabels,
            datasets: [
                {
                    label: 'Arrests',
                    data: boroLabels.map(function(b) { return arrestsByBoro[b] || 0; }),
                    backgroundColor: 'rgba(236, 72, 153, 0.7)',
                    borderRadius: 4
                },
                {
                    label: 'Shootings',
                    data: boroLabels.map(function(b) { return shootingsByBoro[b] || 0; }),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#666', boxWidth: 12, font: { size: 10 } },
                    position: 'top'
                }
            },
            scales: {
                x: {
                    ticks: { color: '#666', font: { size: 10 } },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: '#666', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

// ===========================================
// Data Loading
// ===========================================
async function loadData(startDate, endDate) {
    var loading = getElement('loading');
    loading.classList.remove('hidden');
    
    try {
        // Build query parameters
        var params = '';
        if (startDate && endDate) {
            params = '?startDate=' + startDate + '&endDate=' + endDate;
        } else if (startDate) {
            params = '?startDate=' + startDate;
        }
        var paramsWithLimit = params ? params + '&limit=500' : '?limit=500';
        
        // Fetch all data in parallel
        var responses = await Promise.all([
            fetch('/api/taxi' + paramsWithLimit),
            fetch('/api/bike' + paramsWithLimit),
            fetch('/api/arrests' + paramsWithLimit),
            fetch('/api/shootings' + paramsWithLimit),
            fetch('/api/mta' + params),
            fetch('/api/aggregate' + params)
        ]);
        
        var data = await Promise.all(responses.map(function(r) { return r.json(); }));
        
        var taxi = data[0];
        var bike = data[1];
        var arrests = data[2];
        var shootings = data[3];
        var mta = data[4];
        var aggregate = data[5];
        
        // Update state
        state.allData = {
            taxi: (taxi && taxi.data) || [],
            bike: (bike && bike.data) || [],
            arrests: (arrests && arrests.data) || [],
            shootings: (shootings && shootings.data) || [],
            mta: (mta && mta.data) || []
        };
        
        // Update statistics display
        updateStats(taxi, bike, arrests, shootings);
        
        // Update date badge
        updateDateBadge(startDate, endDate);
        
        // Update weather
        await updateWeather(startDate, endDate);
        
        // Load weather grid for overlay (use first date of range if range selected)
        await loadWeatherGrid(startDate);
        
        // Update map
        clearAllLayers();
        populateLayers(state.allData);
        
        // Update charts
        var isSingleDay = !!(startDate && !endDate);
        updateCharts(mta, aggregate, isSingleDay);
        
        loading.classList.add('hidden');
        
    } catch (error) {
        console.error('Error loading data:', error);
        loading.innerHTML = '<div style="color:#ef4444;">Error: ' + error.message + '</div>';
    }
}

function updateStats(taxi, bike, arrests, shootings) {
    // Main stats
    getElement('stat-taxi').textContent = formatNumber(
        taxi && taxi.total ? taxi.total : (taxi && taxi.count ? taxi.count : 0)
    );
    getElement('stat-bike').textContent = formatNumber(
        bike && bike.total ? bike.total : (bike && bike.count ? bike.count : 0)
    );
    getElement('stat-arrests').textContent = formatNumber(
        arrests && arrests.total ? arrests.total : (arrests && arrests.count ? arrests.count : 0)
    );
    getElement('stat-shootings').textContent = formatNumber(
        shootings && shootings.total ? shootings.total : (shootings && shootings.count ? shootings.count : 0)
    );
    
    // Layer counts
    getElement('count-taxi').textContent = (taxi && taxi.count) || 0;
    getElement('count-bike').textContent = (bike && bike.count) || 0;
    getElement('count-arrests').textContent = (arrests && arrests.count) || 0;
    getElement('count-shootings').textContent = (shootings && shootings.count) || 0;
}

function updateDateBadge(startDate, endDate) {
    var badge = getElement('date-badge');
    if (startDate && endDate) {
        badge.textContent = startDate + ' to ' + endDate;
    } else if (startDate) {
        badge.textContent = startDate;
    } else {
        badge.textContent = 'All Data';
    }
}

// ===========================================
// Date Picker Initialization
// ===========================================
async function initDatePickers() {
    try {
        var res = await fetch('/api/dates');
        var dates = await res.json();
        
        var startPicker = getElement('start-date');
        var endPicker = getElement('end-date');
        
        // Default date range
        var defaultStart = '2024-12-10';
        var defaultEnd = '2024-12-24';
        
        if (dates.min) {
            startPicker.min = dates.min;
            endPicker.min = dates.min;
        }
        
        if (dates.max) {
            startPicker.max = dates.max;
            endPicker.max = dates.max;
        }
        
        // Set default values
        startPicker.value = defaultStart;
        endPicker.value = defaultEnd;
        
        // Update state
        state.startDate = defaultStart;
        state.endDate = defaultEnd;
        
        // Load data with default range
        loadData(defaultStart, defaultEnd);
    } catch (e) {
        console.error('Error initializing dates:', e);
        // Fallback: load all data
        loadData();
    }
}

// ===========================================
// Theme Toggle
// ===========================================
function toggleTheme() {
    var newTheme = state.theme === 'dark' ? 'light' : 'dark';
    state.theme = newTheme;
    
    // Update HTML attribute
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update theme toggle icon
    var themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.innerHTML = newTheme === 'dark' ? '&#9728;' : '&#9790;'; // Sun / Moon
    }
    
    // Switch map tiles
    map.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(TILE_URLS[newTheme], {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Save preference
    try {
        localStorage.setItem('nyc-theme', newTheme);
    } catch (e) {
        // localStorage not available
    }
}

function loadSavedTheme() {
    try {
        var savedTheme = localStorage.getItem('nyc-theme');
        if (savedTheme === 'light') {
            toggleTheme();
        }
    } catch (e) {
        // localStorage not available
    }
}

// ===========================================
// Event Handlers
// ===========================================
function setupEventListeners() {
    // Apply date range
    getElement('apply-dates').addEventListener('click', function() {
        state.startDate = getElement('start-date').value;
        state.endDate = getElement('end-date').value;
        
        if (state.startDate) {
            loadData(state.startDate, state.endDate || null);
        }
    });
    
    // Clear date range
    getElement('clear-dates').addEventListener('click', function() {
        state.startDate = null;
        state.endDate = null;
        getElement('start-date').value = '';
        getElement('end-date').value = '';
        loadData();
    });
    
    // Theme toggle
    var themeBtn = getElement('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
    
    // Layer toggles
    setupLayerToggle('layer-taxi', layers.taxi);
    setupLayerToggle('layer-bike', layers.bike);
    setupLayerToggle('layer-arrests', layers.arrests);
    setupLayerToggle('layer-shootings', layers.shootings);
    
    // Weather layer toggle (special handling)
    var weatherCheckbox = getElement('layer-weather');
    if (weatherCheckbox) {
        var weatherToggle = weatherCheckbox.closest('.layer-toggle');
        weatherCheckbox.addEventListener('change', function() {
            weatherOverlayVisible = weatherCheckbox.checked;
            if (weatherCheckbox.checked) {
                map.addLayer(layers.weather);
                weatherToggle.classList.add('active');
                renderWeatherOverlay();
            } else {
                map.removeLayer(layers.weather);
                weatherToggle.classList.remove('active');
                hideWeatherOverlay();
            }
        });
    }
}

function setupLayerToggle(checkboxId, layer) {
    var checkbox = getElement(checkboxId);
    var toggle = checkbox.closest('.layer-toggle');
    
    checkbox.addEventListener('change', function() {
        if (checkbox.checked) {
            map.addLayer(layer);
            toggle.classList.add('active');
        } else {
            map.removeLayer(layer);
            toggle.classList.remove('active');
        }
    });
}

// ===========================================
// Application Initialization
// ===========================================
function init() {
    loadSavedTheme();
    setupEventListeners();
    initDatePickers(); // This now loads data with default date range
}

// Start the application
init();
