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
    },
    // Route planner state
    routePlanner: {
        origin: null,           // { lat, lng }
        destination: null,      // { lat, lng }
        pickingMode: null,      // 'origin' | 'destination' | null
        optimizeFor: 'fastest', // 'fastest' | 'cheapest' | 'safest'
        currentRoute: null,     // Route result from API
        selectedOption: null,   // Currently selected route option
        routeLayers: [],        // Leaflet layers for routes
        bestRoutes: {           // Best route for each category
            fastest: null,
            cheapest: null,
            safest: null
        },
        visibleRoutes: {        // Which routes are visible on map
            fastest: true,
            cheapest: true,
            safest: true
        }
    }
};

// ===========================================
// Constants
// ===========================================
var COLORS = {
    taxi: '#f59e0b',
    bike: '#10b981',
    arrests: '#C0C0C0',
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

// Route layer group (for displaying routes)
layers.routes = L.layerGroup().addTo(map);
layers.routeMarkers = L.layerGroup().addTo(map);

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
                if (trip.pickup_latitude === null || trip.pickup_latitude === undefined ||
                    trip.pickup_longitude === null || trip.pickup_longitude === undefined) return;
                
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
        console.log('Processing ' + data.bike.length + ' bike trips');
        var bikeMarkersAdded = 0;
        data.bike.forEach(function(trip) {
            try {
                if (trip.start_lat === null || trip.start_lat === undefined ||
                    trip.start_lng === null || trip.start_lng === undefined) return;
                
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
                bikeMarkersAdded++;
            } catch (e) {
                console.error('Bike marker error:', e);
            }
        });
        console.log('Added ' + bikeMarkersAdded + ' bike markers');
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
                                return parseFloat(value).toFixed(2) + 'M';
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
        
        // Update weather (basic info only, grid loaded on demand)
        updateWeather(startDate, endDate);
        
        // Only load weather grid if overlay is already visible
        if (weatherOverlayVisible) {
            loadWeatherGrid(startDate);
        }
        
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
        var defaultStart = '2024-12-01';
        var defaultEnd = '2024-12-01';
        
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
                // Load weather grid on demand when user enables the layer
                loadWeatherGrid(state.startDate).then(function() {
                    renderWeatherOverlay();
                });
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
// Route Planner Functions
// ===========================================

var ROUTE_COLORS = {
    taxi: '#f59e0b',
    bike: '#10b981',
    metro: '#3b82f6',
    walking: '#8b5cf6'
};

var ROUTE_ICONS = {
    taxi: '\uD83D\uDE95',    // taxi emoji
    bike: '\uD83D\uDEB2',    // bike emoji
    metro: '\uD83D\uDE87',   // metro emoji
    walking: '\uD83D\uDEB6'  // walking emoji
};

/**
 * Set up route planner event listeners
 */
function setupRoutePlanner() {
    // Toggle collapse/expand
    var toggleBtn = getElement('toggle-route-planner');
    var content = getElement('route-planner-content');
    if (toggleBtn && content) {
        toggleBtn.addEventListener('click', function() {
            content.classList.toggle('collapsed');
            toggleBtn.textContent = content.classList.contains('collapsed') ? '+' : '-';
        });
    }
    
    // Pick origin button
    var pickOriginBtn = getElement('pick-origin');
    if (pickOriginBtn) {
        pickOriginBtn.addEventListener('click', function() {
            startPickingMode('origin');
        });
    }
    
    // Pick destination button
    var pickDestBtn = getElement('pick-dest');
    if (pickDestBtn) {
        pickDestBtn.addEventListener('click', function() {
            startPickingMode('destination');
        });
    }
    
    // Manual coordinate inputs
    var originLat = getElement('origin-lat');
    var originLng = getElement('origin-lng');
    var destLat = getElement('dest-lat');
    var destLng = getElement('dest-lng');
    
    function updateOriginFromInputs() {
        var lat = parseFloat(originLat.value);
        var lng = parseFloat(originLng.value);
        if (!isNaN(lat) && !isNaN(lng)) {
            setRoutePoint('origin', { lat: lat, lng: lng });
        }
    }
    
    function updateDestFromInputs() {
        var lat = parseFloat(destLat.value);
        var lng = parseFloat(destLng.value);
        if (!isNaN(lat) && !isNaN(lng)) {
            setRoutePoint('destination', { lat: lat, lng: lng });
        }
    }
    
    if (originLat && originLng) {
        originLat.addEventListener('change', updateOriginFromInputs);
        originLng.addEventListener('change', updateOriginFromInputs);
    }
    
    if (destLat && destLng) {
        destLat.addEventListener('change', updateDestFromInputs);
        destLng.addEventListener('change', updateDestFromInputs);
    }
    
    // Optimize buttons
    var optimizeBtns = document.querySelectorAll('.btn-optimize');
    optimizeBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            optimizeBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            state.routePlanner.optimizeFor = btn.getAttribute('data-optimize');
        });
    });
    
    // Plan route button
    var planRouteBtn = getElement('plan-route');
    if (planRouteBtn) {
        planRouteBtn.addEventListener('click', function() {
            planRoute();
        });
    }
    
    // Clear route button
    var clearRouteBtn = getElement('clear-route');
    if (clearRouteBtn) {
        clearRouteBtn.addEventListener('click', function() {
            clearRoute();
        });
    }
    
    // Map click handler for picking mode
    map.on('click', function(e) {
        if (state.routePlanner.pickingMode) {
            setRoutePoint(state.routePlanner.pickingMode, {
                lat: e.latlng.lat,
                lng: e.latlng.lng
            });
            stopPickingMode();
        }
    });
}

/**
 * Start picking mode for origin or destination
 */
function startPickingMode(type) {
    state.routePlanner.pickingMode = type;
    document.body.classList.add('picking-mode');
    
    // Update button states
    var originBtn = getElement('pick-origin');
    var destBtn = getElement('pick-dest');
    
    if (originBtn) originBtn.classList.toggle('active', type === 'origin');
    if (destBtn) destBtn.classList.toggle('active', type === 'destination');
    
    // Show picking indicator
    var indicator = document.createElement('div');
    indicator.className = 'picking-indicator';
    indicator.id = 'picking-indicator';
    indicator.textContent = 'Click on the map to set ' + type;
    document.querySelector('.main').appendChild(indicator);
}

/**
 * Stop picking mode
 */
function stopPickingMode() {
    state.routePlanner.pickingMode = null;
    document.body.classList.remove('picking-mode');
    
    var originBtn = getElement('pick-origin');
    var destBtn = getElement('pick-dest');
    if (originBtn) originBtn.classList.remove('active');
    if (destBtn) destBtn.classList.remove('active');
    
    var indicator = getElement('picking-indicator');
    if (indicator) indicator.remove();
}

/**
 * Set a route point (origin or destination)
 */
function setRoutePoint(type, point) {
    if (type === 'origin') {
        state.routePlanner.origin = point;
        getElement('origin-input').value = point.lat.toFixed(4) + ', ' + point.lng.toFixed(4);
        getElement('origin-lat').value = point.lat.toFixed(4);
        getElement('origin-lng').value = point.lng.toFixed(4);
    } else {
        state.routePlanner.destination = point;
        getElement('dest-input').value = point.lat.toFixed(4) + ', ' + point.lng.toFixed(4);
        getElement('dest-lat').value = point.lat.toFixed(4);
        getElement('dest-lng').value = point.lng.toFixed(4);
    }
    
    updateRouteMarkers();
}

/**
 * Update route markers on the map
 */
function updateRouteMarkers() {
    layers.routeMarkers.clearLayers();
    
    if (state.routePlanner.origin) {
        var originMarker = L.marker(
            [state.routePlanner.origin.lat, state.routePlanner.origin.lng],
            {
                icon: L.divIcon({
                    html: '<div class="route-marker origin">O</div>',
                    className: '',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }
        );
        originMarker.bindPopup('<b>Origin</b><br>' + state.routePlanner.origin.lat.toFixed(4) + ', ' + state.routePlanner.origin.lng.toFixed(4));
        layers.routeMarkers.addLayer(originMarker);
    }
    
    if (state.routePlanner.destination) {
        var destMarker = L.marker(
            [state.routePlanner.destination.lat, state.routePlanner.destination.lng],
            {
                icon: L.divIcon({
                    html: '<div class="route-marker destination">D</div>',
                    className: '',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }
        );
        destMarker.bindPopup('<b>Destination</b><br>' + state.routePlanner.destination.lat.toFixed(4) + ', ' + state.routePlanner.destination.lng.toFixed(4));
        layers.routeMarkers.addLayer(destMarker);
    }
}

/**
 * Plan the route using the API
 */
async function planRoute() {
    var origin = state.routePlanner.origin;
    var dest = state.routePlanner.destination;
    
    if (!origin || !dest) {
        alert('Please set both origin and destination points.');
        return;
    }
    
    // Show loading state
    var planBtn = getElement('plan-route');
    var originalText = planBtn.textContent;
    planBtn.textContent = 'Planning...';
    planBtn.disabled = true;
    
    try {
        var url = '/api/route?' + 
            'originLat=' + origin.lat +
            '&originLng=' + origin.lng +
            '&destLat=' + dest.lat +
            '&destLng=' + dest.lng +
            '&optimize=' + state.routePlanner.optimizeFor;
        
        var response = await fetch(url);
        var result = await response.json();
        
        if (result.success && result.data) {
            state.routePlanner.currentRoute = result.data;
            displayRouteResults(result.data);
        } else {
            alert('Failed to plan route: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error planning route:', error);
        alert('Error planning route. Please try again.');
    } finally {
        planBtn.textContent = originalText;
        planBtn.disabled = false;
    }
}

/**
 * Display route results in the UI
 * Shows all three optimal routes: fastest, cheapest, safest
 */
function displayRouteResults(routeData) {
    var resultsDiv = getElement('route-results');
    var optionsList = getElement('route-options-list');
    var recommendationDiv = getElement('route-recommendation');
    
    if (!resultsDiv || !optionsList) return;
    
    resultsDiv.style.display = 'block';
    optionsList.innerHTML = '';
    
    // Show route legend on map
    var routeLegend = getElement('route-legend');
    if (routeLegend) routeLegend.style.display = 'block';
    
    var recommendation = routeData.recommendation;
    
    // Store the three best routes for display
    state.routePlanner.bestRoutes = {
        fastest: recommendation.fastest,
        cheapest: recommendation.cheapest,
        safest: recommendation.safest
    };
    
    // Initialize visibility state for each route type
    if (!state.routePlanner.visibleRoutes) {
        state.routePlanner.visibleRoutes = {
            fastest: true,
            cheapest: true,
            safest: true
        };
    }
    
    // Create header for best routes section
    var bestRoutesHeader = document.createElement('div');
    bestRoutesHeader.className = 'route-section-header';
    bestRoutesHeader.innerHTML = '<span class="section-title">Best Routes</span><span class="section-hint">Click to toggle on map</span>';
    optionsList.appendChild(bestRoutesHeader);
    
    // Display the three best route cards
    var routeTypes = ['fastest', 'cheapest', 'safest'];
    routeTypes.forEach(function(type) {
        var option = recommendation[type];
        if (!option) return;
        
        var optionEl = document.createElement('div');
        optionEl.className = 'route-option best-route ' + type;
        optionEl.setAttribute('data-route-type', type);
        
        // Check if this route is currently visible
        if (state.routePlanner.visibleRoutes[type]) {
            optionEl.classList.add('visible');
        }
        
        var durationMin = Math.round(option.totalDuration / 60);
        var distanceKm = (option.totalDistance / 1000).toFixed(1);
        var crimeLevel = option.crimeScore < 10 ? 'Low' : option.crimeScore < 50 ? 'Medium' : 'High';
        var crimeClass = option.crimeScore < 10 ? 'low' : option.crimeScore < 50 ? 'medium' : 'high';
        
        var typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        var typeIcon = type === 'fastest' ? '\u26A1' : type === 'cheapest' ? '\uD83D\uDCB0' : '\uD83D\uDEE1\uFE0F';
        
        optionEl.innerHTML = 
            '<div class="route-option-header">' +
                '<div class="route-option-mode">' +
                    '<span class="route-type-icon">' + typeIcon + '</span>' +
                    '<span class="route-type-label">' + typeLabel + '</span>' +
                    '<span class="route-mode-badge">' + ROUTE_ICONS[option.mode] + ' ' + capitalizeFirst(option.mode) + '</span>' +
                '</div>' +
                '<div class="route-visibility-toggle" title="Toggle on map">' +
                    '<span class="toggle-indicator"></span>' +
                '</div>' +
            '</div>' +
            '<div class="route-option-stats">' +
                '<div class="route-stat time">' +
                    '<div class="route-stat-value">' + durationMin + ' min</div>' +
                    '<div class="route-stat-label">Duration</div>' +
                '</div>' +
                '<div class="route-stat cost">' +
                    '<div class="route-stat-value">$' + option.estimatedCost.toFixed(2) + '</div>' +
                    '<div class="route-stat-label">Cost</div>' +
                '</div>' +
                '<div class="route-stat safety ' + crimeClass + '">' +
                    '<div class="route-stat-value">' + crimeLevel + '</div>' +
                    '<div class="route-stat-label">Crime</div>' +
                '</div>' +
            '</div>';
        
        optionEl.addEventListener('click', function() {
            toggleRouteVisibility(type);
        });
        
        optionsList.appendChild(optionEl);
    });
    
    // Add separator
    var separator = document.createElement('div');
    separator.className = 'route-section-separator';
    optionsList.appendChild(separator);
    
    // Create header for all options section
    var allOptionsHeader = document.createElement('div');
    allOptionsHeader.className = 'route-section-header';
    allOptionsHeader.innerHTML = '<span class="section-title">All Options</span>';
    optionsList.appendChild(allOptionsHeader);
    
    // Display all route options
    routeData.options.forEach(function(option, index) {
        var badges = [];
        
        if (recommendation.fastest && recommendation.fastest.mode === option.mode) {
            badges.push('fastest');
        }
        if (recommendation.cheapest && recommendation.cheapest.mode === option.mode) {
            badges.push('cheapest');
        }
        if (recommendation.safest && recommendation.safest.mode === option.mode) {
            badges.push('safest');
        }
        
        var optionEl = document.createElement('div');
        optionEl.className = 'route-option all-option';
        optionEl.setAttribute('data-mode', option.mode);
        optionEl.setAttribute('data-index', index);
        
        var durationMin = Math.round(option.totalDuration / 60);
        var crimeLevel = option.crimeScore < 10 ? 'Low' : option.crimeScore < 50 ? 'Medium' : 'High';
        
        var badgesHtml = badges.map(function(b) {
            return '<span class="route-option-badge ' + b + '">' + b + '</span>';
        }).join(' ');
        
        optionEl.innerHTML = 
            '<div class="route-option-header">' +
                '<div class="route-option-mode">' +
                    '<span class="route-mode-icon">' + ROUTE_ICONS[option.mode] + '</span>' +
                    '<span class="route-mode-name">' + capitalizeFirst(option.mode) + '</span>' +
                '</div>' +
                '<div>' + badgesHtml + '</div>' +
            '</div>' +
            '<div class="route-option-stats-mini">' +
                '<span class="mini-stat">' + durationMin + ' min</span>' +
                '<span class="mini-stat">$' + option.estimatedCost.toFixed(2) + '</span>' +
                '<span class="mini-stat">' + crimeLevel + '</span>' +
            '</div>';
        
        optionEl.addEventListener('click', function() {
            showSingleRoute(option, index);
        });
        
        optionsList.appendChild(optionEl);
    });
    
    // Show comparison summary
    if (recommendationDiv) {
        var fastest = recommendation.fastest;
        var cheapest = recommendation.cheapest;
        var safest = recommendation.safest;
        
        var summaryHtml = '<div class="route-comparison-summary">';
        summaryHtml += '<div class="comparison-title">Route Comparison</div>';
        summaryHtml += '<div class="comparison-grid">';
        
        if (fastest) {
            var fastTime = Math.round(fastest.totalDuration / 60);
            summaryHtml += '<div class="comparison-item fastest">' +
                '<span class="comp-label">\u26A1 Fastest</span>' +
                '<span class="comp-value">' + fastTime + ' min</span>' +
                '<span class="comp-mode">' + ROUTE_ICONS[fastest.mode] + '</span>' +
            '</div>';
        }
        
        if (cheapest) {
            summaryHtml += '<div class="comparison-item cheapest">' +
                '<span class="comp-label">\uD83D\uDCB0 Cheapest</span>' +
                '<span class="comp-value">$' + cheapest.estimatedCost.toFixed(2) + '</span>' +
                '<span class="comp-mode">' + ROUTE_ICONS[cheapest.mode] + '</span>' +
            '</div>';
        }
        
        if (safest) {
            var safeLevel = safest.crimeScore < 10 ? 'Low crime' : safest.crimeScore < 50 ? 'Med crime' : 'High crime';
            summaryHtml += '<div class="comparison-item safest">' +
                '<span class="comp-label">\uD83D\uDEE1\uFE0F Safest</span>' +
                '<span class="comp-value">' + safeLevel + '</span>' +
                '<span class="comp-mode">' + ROUTE_ICONS[safest.mode] + '</span>' +
            '</div>';
        }
        
        summaryHtml += '</div></div>';
        recommendationDiv.innerHTML = summaryHtml;
        recommendationDiv.style.display = 'block';
    }
    
    // Draw all visible routes on the map
    drawAllVisibleRoutes();
}

/**
 * Toggle visibility of a route type on the map
 */
function toggleRouteVisibility(type) {
    state.routePlanner.visibleRoutes[type] = !state.routePlanner.visibleRoutes[type];
    
    // Update UI
    var optionEl = document.querySelector('.route-option[data-route-type="' + type + '"]');
    if (optionEl) {
        optionEl.classList.toggle('visible', state.routePlanner.visibleRoutes[type]);
    }
    
    // Redraw routes
    drawAllVisibleRoutes();
}

/**
 * Show only a single route (when clicking on "All Options")
 */
function showSingleRoute(option, index) {
    // Hide all best routes
    state.routePlanner.visibleRoutes = {
        fastest: false,
        cheapest: false,
        safest: false
    };
    
    // Update UI
    document.querySelectorAll('.route-option.best-route').forEach(function(el) {
        el.classList.remove('visible');
    });
    
    // Update all options selection
    document.querySelectorAll('.route-option.all-option').forEach(function(el, i) {
        el.classList.toggle('selected', i === index);
    });
    
    // Draw just this route
    layers.routes.clearLayers();
    drawRouteOnMap(option, option.mode, true);
}

/**
 * Draw all visible routes on the map
 */
function drawAllVisibleRoutes() {
    layers.routes.clearLayers();
    
    var bounds = null;
    var routeTypes = ['safest', 'cheapest', 'fastest']; // Draw in this order so fastest is on top
    
    routeTypes.forEach(function(type) {
        if (state.routePlanner.visibleRoutes[type] && state.routePlanner.bestRoutes[type]) {
            var option = state.routePlanner.bestRoutes[type];
            var polyline = drawRouteOnMap(option, type, false);
            if (polyline && bounds) {
                bounds.extend(polyline.getBounds());
            } else if (polyline) {
                bounds = polyline.getBounds();
            }
        }
    });
    
    // Fit map to show all routes
    if (bounds) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    // Deselect all options
    document.querySelectorAll('.route-option.all-option').forEach(function(el) {
        el.classList.remove('selected');
    });
}

/**
 * Draw a route on the map
 * @param {Object} option - Route option to draw
 * @param {string} type - Route type (fastest/cheapest/safest) or mode (taxi/bike/etc)
 * @param {boolean} fitBounds - Whether to fit map bounds to this route
 * @returns {L.Polyline} The created polyline
 */
function drawRouteOnMap(option, type, fitBounds) {
    if (!option.geometry || option.geometry.length === 0) {
        console.warn('No geometry for route option');
        return null;
    }
    
    // Convert [lng, lat] to [lat, lng] for Leaflet
    var latlngs = option.geometry.map(function(coord) {
        return [coord[1], coord[0]];
    });
    
    // Colors for optimization types
    var typeColors = {
        fastest: '#3b82f6',  // blue
        cheapest: '#10b981', // green
        safest: '#8b5cf6'    // purple
    };
    
    var color = typeColors[type] || ROUTE_COLORS[option.mode] || '#3b82f6';
    
    var lineStyle = {
        color: color,
        weight: 5,
        opacity: 0.8,
        smoothFactor: 1
    };
    
    // Add dashed style for safest routes or metro/walking
    if (type === 'safest') {
        lineStyle.dashArray = '8, 4';
        lineStyle.weight = 6;
    } else if (type === 'cheapest') {
        lineStyle.weight = 5;
    } else if (type === 'fastest') {
        lineStyle.weight = 6;
    }
    
    // If drawing by mode, use mode-specific styles
    if (option.mode === 'metro' && !typeColors[type]) {
        lineStyle.dashArray = '10, 5';
    } else if (option.mode === 'walking' && !typeColors[type]) {
        lineStyle.dashArray = '5, 5';
        lineStyle.weight = 4;
    }
    
    var polyline = L.polyline(latlngs, lineStyle);
    
    // Add popup with route info
    var durationMin = Math.round(option.totalDuration / 60);
    var crimeLevel = option.crimeScore < 10 ? 'Low' : option.crimeScore < 50 ? 'Medium' : 'High';
    var typeLabel = typeColors[type] ? (type.charAt(0).toUpperCase() + type.slice(1) + ' Route') : capitalizeFirst(option.mode);
    
    polyline.bindPopup(
        '<div class="popup-content">' +
        '<h4 style="color:' + color + ';">' + typeLabel + '</h4>' +
        '<p><span class="label">Mode</span><span class="value">' + ROUTE_ICONS[option.mode] + ' ' + capitalizeFirst(option.mode) + '</span></p>' +
        '<p><span class="label">Duration</span><span class="value">' + durationMin + ' min</span></p>' +
        '<p><span class="label">Cost</span><span class="value">$' + option.estimatedCost.toFixed(2) + '</span></p>' +
        '<p><span class="label">Crime Level</span><span class="value">' + crimeLevel + '</span></p>' +
        '</div>'
    );
    
    layers.routes.addLayer(polyline);
    
    // Fit map to show the route
    if (fitBounds) {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
    
    return polyline;
}

/**
 * Select and display a route option on the map (legacy - kept for compatibility)
 */
function selectRouteOption(option, index) {
    state.routePlanner.selectedOption = option;
    showSingleRoute(option, index);
}

/**
 * Clear all route data
 */
function clearRoute() {
    state.routePlanner.origin = null;
    state.routePlanner.destination = null;
    state.routePlanner.currentRoute = null;
    state.routePlanner.selectedOption = null;
    
    // Clear inputs
    getElement('origin-input').value = '';
    getElement('origin-lat').value = '';
    getElement('origin-lng').value = '';
    getElement('dest-input').value = '';
    getElement('dest-lat').value = '';
    getElement('dest-lng').value = '';
    
    // Clear map layers
    layers.routes.clearLayers();
    layers.routeMarkers.clearLayers();
    
    // Hide results
    var resultsDiv = getElement('route-results');
    if (resultsDiv) resultsDiv.style.display = 'none';
    
    // Hide route legend
    var routeLegend = getElement('route-legend');
    if (routeLegend) routeLegend.style.display = 'none';
    
    stopPickingMode();
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===========================================
// Application Initialization
// ===========================================
function init() {
    loadSavedTheme();
    setupEventListeners();
    setupRoutePlanner();
    initDatePickers(); // This now loads data with default date range
}

// Start the application
init();
