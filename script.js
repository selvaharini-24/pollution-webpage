// ================= GLOBAL =================

const output = document.getElementById("output");
const ctx = document.getElementById("riskChart").getContext("2d");

let chart = null;
let map = null; // Global map object

let pollutionData = [];
let hmriData = [];
let insightData = [];
let currentView = "";

// Mock coordinates, city, and area names for regions
const regionCoords = {
    "RegionA": { coords: [12.9716, 77.5946], city: "Bengaluru", area: "Whitefield" },
    "RegionB": { coords: [19.0760, 72.8777], city: "Mumbai", area: "Andheri" },
    "RegionC": { coords: [28.6139, 77.2090], city: "Delhi", area: "Rohini" },
    "RegionD": { coords: [13.0827, 80.2707], city: "Chennai", area: "Adyar" },
    "RegionE": { coords: [22.5726, 88.3639], city: "Kolkata", area: "Salt Lake" },
    "RegionF": { coords: [17.3850, 78.4867], city: "Hyderabad", area: "Gachibowli" },
    "RegionG": { coords: [18.5204, 73.8567], city: "Pune", area: "Hinjewadi" },
    "RegionH": { coords: [23.0225, 72.5714], city: "Ahmedabad", area: "Satellite" },
    "RegionI": { coords: [26.9124, 75.7873], city: "Jaipur", area: "Malviya Nagar" },
    "RegionJ": { coords: [26.8467, 80.9462], city: "Lucknow", area: "Gomti Nagar" }
};



// ================= SHOW DASHBOARD =================
function showDashboard() {
    document.getElementById("welcomeSection").style.display = "none";
    document.getElementById("dashboardSection").style.display = "block";
    document.getElementById("mapSection").style.display = "none";
    document.getElementById("cropSection").style.display = "none";
    document.getElementById("visualSection").style.display = "none";

    // Hide chart & info card by default
    document.getElementById("chartCard").style.display = "none";
    document.getElementById("pollutionInfoCard").style.display = "none";

    // Hide KPI grid by default, only show in HMRI view
    const kpiGrid = document.querySelector(".kpi-grid");
    if (kpiGrid) kpiGrid.style.display = "none";

    // Show navigation buttons
    document.getElementById("navButtons").style.display = "flex";
}

// ================= SHOW WELCOME =================
function showWelcome() {
    document.getElementById("welcomeSection").style.display = "block";
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("mapSection").style.display = "none";
    document.getElementById("cropSection").style.display = "none";
    document.getElementById("visualSection").style.display = "none";

    // Hide navigation buttons on landing
    document.getElementById("navButtons").style.display = "none";

    initLandingStats(); // Populate live counters
}

// ================= LANDING STATS (LEADERBOARD & POLLUTANTS) =================
async function initLandingStats() {
    try {
        const [hmriRes, pollutionRes] = await Promise.all([
            fetch("/hmri"),
            fetch("/data")
        ]);

        const hmriData = await hmriRes.json();
        const polData = await pollutionRes.json();

        if (!hmriData || !hmriData.length) return;

        // 1. REGIONAL RISK LEADERBOARD (Top 5 severe)
        const top5 = [...hmriData]
            .sort((a, b) => b.hmri_score - a.hmri_score)
            .slice(0, 5);

        const leaderHTML = top5.map((r, i) => {
            const riskClass = r.hmri_score > 3 ? 'risk-severe' : r.hmri_score > 1 ? 'risk-high' : r.hmri_score > 0.5 ? 'risk-mod' : 'risk-low';
            const width = Math.min((r.hmri_score / 5) * 100, 100);

            return `
                <div class="leader-item">
                    <span class="leader-rank">#${i + 1}</span>
                    <div class="leader-info">
                        <span class="leader-name">${r.region}</span>
                        <div class="leader-stats">
                            <div class="risk-bar-bg"><div class="risk-bar-fill ${riskClass}" style="width: ${width}%"></div></div>
                            <span class="risk-val">${r.hmri_score.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        document.getElementById("riskLeaderboard").innerHTML = leaderHTML;

        // 2. PRIMARY POLLUTANTS BREAKDOWN
        const metalCounts = { Pb: 0, Cd: 0, Hg: 0, As: 0, Cr: 0 };
        polData.forEach(p => {
            if (p.Pb > 10) metalCounts.Pb++;
            if (p.Cd > 3) metalCounts.Cd++;
            if (p.Hg > 1) metalCounts.Hg++;
            if (p.As > 10) metalCounts.As++;
            if (p.Cr > 50) metalCounts.Cr++;
        });

        const polHTML = Object.entries(metalCounts).map(([metal, count]) => `
            <div class="p-chip">
                <div class="p-icon">${metal}</div>
                <span class="p-count">${count}</span>
                <span class="p-label">Regions Exceeded</span>
            </div>
        `).join('');
        document.getElementById("topPollutants").innerHTML = polHTML;

    } catch (err) {
        console.error("Error loading landing stats:", err);
    }
}

// ================= DARK MODE TOGGLE =================
function toggleDarkMode() {
    document.body.classList.toggle("dark");
}


// ================= LOAD POLLUTION DATA =================
function loadData() {
    showDashboard();
    currentView = "pollution";

    // Show pollution info card (Requested by user)
    document.getElementById("pollutionInfoCard").style.display = "block";

    output.innerHTML = "<p>Loading pollution data...</p>";

    fetch("/data")
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch data");
            return res.json();
        })
        .then(data => {
            pollutionData = data;
            renderPollutionTable(pollutionData);
        })
        .catch(err => {
            console.error("Pollution data error:", err);
            output.innerHTML = `
                <div class="error-msg">
                    <p>Error loading pollution data. ${err.message}</p>
                    <p>Tip: Try visiting <a href="/init-data" target="_blank">/init-data</a> to ensure the database is populated.</p>
                </div>
            `;
        });
}


// ================= LOAD HMRI =================
function loadHMRI() {
    showDashboard();
    currentView = "hmri";

    // Show chart card
    document.getElementById("chartCard").style.display = "block";

    // Show KPI grid
    const kpiGrid = document.querySelector(".kpi-grid");
    if (kpiGrid) kpiGrid.style.display = "grid";

    output.innerHTML = "<p>Loading HMRI data...</p>";

    fetch("/hmri")
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch HMRI data");
            return res.json();
        })
        .then(data => {
            hmriData = data;
            renderHMRIText(hmriData);
            drawChart(hmriData);
            updateKPIs(hmriData); // Update KPIs
        })
        .catch(err => {
            console.error(err);
            output.innerHTML = "<p>Error loading HMRI data. Please try again later.</p>";
        });
}


// ================= UPDATE KPIS =================
function updateKPIs(data) {
    if (!data || !data.length) {
        document.getElementById("kpiRegions").innerText = "0";
        document.getElementById("kpiRisk").innerText = "-";
        document.getElementById("kpiAvg").innerText = "-";
        return;
    }

    // 1. Total Regions
    document.getElementById("kpiRegions").innerText = data.length;

    // 2. Highest Risk
    const maxScore = Math.max(...data.map(d => d.hmri_score));
    const maxRiskItem = data.find(d => d.hmri_score === maxScore);
    document.getElementById("kpiRisk").innerText = maxRiskItem ? `${maxRiskItem.region.replace("Region", "Region-")} (${maxScore})` : "-";

    // 3. Average HMRI
    const totalScore = data.reduce((sum, d) => sum + d.hmri_score, 0);
    const avgScore = (totalScore / data.length).toFixed(2);
    document.getElementById("kpiAvg").innerText = avgScore;
}


// ================= LOAD INSIGHTS =================
function loadInsights() {
    showDashboard();
    currentView = "insight";

    // Show chart card
    document.getElementById("chartCard").style.display = "block";

    output.innerHTML = "<p>Loading AI Insights...</p>";

    fetch("/insights")
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch insights");
            return res.json();
        })
        .then(data => {
            insightData = data;
            renderInsights(insightData);
            drawChart(insightData); // Draw chart for insights too
        })
        .catch(err => {
            console.error(err);
            output.innerHTML = "<p>Error loading insights. Please try again later.</p>";
        });
}


// ================= MAP VIEW =================
function showMap() {
    document.getElementById("welcomeSection").style.display = "none";
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("mapSection").style.display = "block";
    document.getElementById("cropSection").style.display = "none";
    document.getElementById("visualSection").style.display = "none";

    // Show navigation buttons
    document.getElementById("navButtons").style.display = "flex";

    // Initialize map if not already done
    if (!map) {
        initMap();
    } else {
        // Refresh map size in case layout changed
        setTimeout(() => map.invalidateSize(), 200);
    }
}

function initMap() {
    // Default center (India/Bangalore)
    map = L.map('map').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add markers from data
    if (hmriData.length > 0) {
        addMapMarkers(hmriData);
    } else {
        // Fetch data if empty to show markers
        fetch("/hmri")
            .then(res => res.json())
            .then(data => {
                hmriData = data;
                addMapMarkers(hmriData);
            });
    }
}

function addMapMarkers(data) {
    if (!map) return;

    data.forEach(d => {
        // Handle RegionA, Region-A, or Region-A (Area, City)
        const key = d.region.split(' ')[0].replace("-", "").trim();
        const info = regionCoords[key];

        if (info) {
            let color = "#3498db";
            switch (d.risk_level.toLowerCase()) {
                case "safe": color = "#27ae60"; break;
                case "moderate": color = "#f1c40f"; break;
                case "high": color = "#e67e22"; break;
                case "severe": color = "#e74c3c"; break;
            }

            const markerHtml = `
                <div style="background-color:${color}; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>
            `;

            const customIcon = L.divIcon({
                html: markerHtml,
                className: '',
                iconSize: [15, 15]
            });

            L.marker(info.coords, { icon: customIcon })
                .addTo(map)
                .bindPopup(`
                    <strong>${d.region.replace("Region", "Region-")} (${info.area}, ${info.city})</strong><br>
                    HMRI Score: ${d.hmri_score}<br>
                    Risk Level: ${d.risk_level}
                `);
        }
    });
}


// ================= SEARCH =================
function filterTable() {

    const input = document.getElementById("searchInput")
        .value
        .toLowerCase()
        .replace("-", "")
        .trim();

    if (input === "") {
        if (currentView === "pollution") renderPollutionTable(pollutionData);
        else if (currentView === "hmri") {
            renderHMRIText(hmriData);
            drawChart(hmriData);
        }
        else if (currentView === "insight") renderInsights(insightData);
        return;
    }

    const filteredPollution = pollutionData.filter(d =>
        d.region.toLowerCase().replace("-", "").includes(input)
    );

    const filteredHMRI = hmriData.filter(d =>
        d.region.toLowerCase().replace("-", "").includes(input)
    );

    const filteredInsights = insightData.filter(d =>
        d.region.toLowerCase().replace("-", "").includes(input)
    );

    if (currentView === "pollution") renderPollutionTable(filteredPollution);
    else if (currentView === "hmri") {
        renderHMRIText(filteredHMRI);
        drawChart(filteredHMRI);
    }
    else if (currentView === "insight") {
        renderInsights(filteredInsights);
        drawChart(filteredInsights);
    }
}


// ================= RENDER TABLE =================
function renderPollutionTable(data) {

    if (!data || !data.length) {
        output.innerHTML = "<p>No matching region found.</p>";
        return;
    }

    let html = `
    <h3>Pollution Data</h3>
    <table class="pollution-table">
    <thead>
        <tr>
            <th style="text-align: left;">Region</th>
            <th>Pb<br><span style="font-size:0.8em; color:#666;">(Lead)</span></th>
            <th>Cd<br><span style="font-size:0.8em; color:#666;">(Cadmium)</span></th>
            <th>Hg<br><span style="font-size:0.8em; color:#666;">(Mercury)</span></th>
            <th>As<br><span style="font-size:0.8em; color:#666;">(Arsenic)</span></th>
            <th>Cr<br><span style="font-size:0.8em; color:#666;">(Chromium)</span></th>
        </tr>
    </thead>
    <tbody>
`;

    data.forEach(d => {
        const key = d.region.split(' ')[0].replace("-", "").trim();
        const info = regionCoords[key];
        const locationStr = info ? ` (${info.area}, ${info.city})` : "";

        html += `
        <tr>
            <td style="text-align: left; font-weight: 600;">${d.region.replace("Region", "Region-")}${locationStr}</td>
            <td style="text-align: center;">${d.Pb}</td>
            <td style="text-align: center;">${d.Cd}</td>
            <td style="text-align: center;">${d.Hg}</td>
            <td style="text-align: center;">${d.As}</td>
            <td style="text-align: center;">${d.Cr}</td>
        </tr>
    `;
    });

    html += "</tbody></table>";
    output.innerHTML = html;
}


// ================= RENDER HMRI TEXT =================
function renderHMRIText(data) {

    if (!data || !data.length) {
        output.innerHTML = "<p>No matching region found.</p>";
        return;
    }

    let html = "<h3>HMRI Risk Levels</h3>";

    data.forEach(d => {
        const key = d.region.split(' ')[0].replace("-", "").trim();
        const info = regionCoords[key];
        const locationStr = info ? ` (${info.area}, ${info.city})` : "";

        html += `
        <p style="text-align: left; margin: 10px 0;">
            <strong style="color: #1a2a4e;">${d.region.replace("Region", "Region-")}${locationStr}:</strong> 
            <span style="color: #2c3e50;">${d.risk_level}</span>
        </p>
    `;
    });

    output.innerHTML = html;
}


// Helper to get full metal name
function getMetalName(symbol) {
    const names = {
        "Pb": "Lead",
        "Cd": "Cadmium",
        "Hg": "Mercury",
        "As": "Arsenic",
        "Cr": "Chromium"
    };
    return names[symbol] || symbol;
}

// ================= RENDER INSIGHTS =================
function renderInsights(data) {

    if (!data || !data.length) {
        output.innerHTML = "<p>No matching region found.</p>";
        return;
    }

    let html = "<h3>AI Insights</h3>";

    data.forEach(d => {
        const key = d.region.split(' ')[0].replace("-", "").trim();
        const info = regionCoords[key];
        const locationStr = info ? ` (${info.area}, ${info.city})` : "";

        // Expansion of symbols in the text insight if possible
        let fullInsight = d.insight;
        Object.keys({ "Pb": 1, "Cd": 1, "Hg": 1, "As": 1, "Cr": 1 }).forEach(s => {
            const regex = new RegExp(`\\b${s}\\b`, 'g');
            fullInsight = fullInsight.replace(regex, `${getMetalName(s)} (${s})`);
        });

        html += `
        <div style="margin-bottom:20px; text-align: left; padding: 15px; background: #f8fbff; border-radius: 8px; border-left: 4px solid #2a80ff;">
            <h4 style="margin-top: 0; color: #1a2a4e;">${d.region.replace("Region", "Region-")}${locationStr}</h4>
            <p style="margin: 5px 0;"><strong>HMRI:</strong> ${d.hmri_score}</p>
            <p style="margin: 5px 0;"><strong>Risk:</strong> ${d.risk_level}</p>
            <p style="margin: 5px 0;"><strong>Main Metal:</strong> ${getMetalName(d.main_risk_metal)} (${d.main_risk_metal})</p>
            <p style="margin: 10px 0 0 0; font-style: italic; color: #555;">${fullInsight}</p>
            
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc;">
                <p style="margin: 0; color: #27ae60; font-weight: 700;">✅ Suggested Solution:</p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #2c3e50;">${d.solution || "N/A"}</p>
            </div>
        </div>
    `;
    });

    output.innerHTML = html;
}


// ================= DRAW CHART =================
function drawChart(data) {

    if (chart) chart.destroy();

    if (!data || !data.length) return;

    const labels = data.map(d =>
        d.region.replace("Region", "Region-")
    );

    const scores = data.map(d => d.hmri_score);

    const colors = data.map(d => {
        switch (d.risk_level.toLowerCase()) {
            case "safe": return "#27ae60";
            case "moderate": return "#f1c40f";
            case "high": return "#e67e22";
            case "severe": return "#e74c3c";
            default: return "#3498db";
        }
    });

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "HMRI Score",
                data: scores,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false // Hide default legend as we have custom one
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 2,
                    ticks: { stepSize: 0.5 },
                    title: {
                        display: true,
                        text: 'HMRI Risk Score', // Clarified
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Regions',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                }
            }
        }
    });
}

// ================= EXPORT PDF =================
async function exportPDF() {
    const { jsPDF } = window.jspdf;

    // Identify which section is currently visible
    let activeSection = null;
    const sections = ["dashboardSection", "mapSection", "cropSection", "visualSection", "welcomeSection"];

    for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.style.display === "block") {
            activeSection = el;
            break;
        }
    }

    if (!activeSection) {
        alert("No active data view to export.");
        return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');

    try {
        // Use html2canvas to capture the active section
        const canvas = await html2canvas(activeSection, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: document.body.classList.contains("dark") ? "#121212" : "#f4f7fb"
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190; // A4 is 210mm, leaving 10mm margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        doc.text("Pollution Monitoring Report", 10, 10);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 10, 16);
        doc.text(`View: ${activeSection.id.replace("Section", "").toUpperCase()}`, 10, 22);

        doc.addImage(imgData, 'PNG', 10, 25, imgWidth, Math.min(imgHeight, 250));
        doc.save(`${activeSection.id.replace("Section", "")}-report.pdf`);
    } catch (err) {
        console.error("PDF Export failed:", err);
        alert("Failed to export PDF. Please try again.");
    }
}

// ================= CROP SUITABILITY =================
function showCrops() {
    document.getElementById("welcomeSection").style.display = "none";
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("mapSection").style.display = "none";
    document.getElementById("cropSection").style.display = "block";
    document.getElementById("visualSection").style.display = "none";

    // Show navigation buttons
    document.getElementById("navButtons").style.display = "flex";
}

async function searchCrop() {
    const input = document.getElementById("cropInput");
    const crop = input.value.trim();
    if (!crop) return;

    const resultsDiv = document.getElementById("cropResults");
    resultsDiv.innerHTML = '<div class="loading-state"><p>Analyzing soil compatibility for ' + crop + '...</p></div>';

    try {
        const response = await fetch(`/crop-advisor?crop=${encodeURIComponent(crop)}`);
        const data = await response.json();

        if (data.error) {
            resultsDiv.innerHTML = `
                <div class="error-state">
                    <h3>❌ Crop Not Found</h3>
                    <p>${data.error}</p>
                    <p>Suggested crops: ${data.suggestions.join(', ')}</p>
                </div>
            `;
            return;
        }

        renderCropResults(data);
    } catch (err) {
        console.error("Crop search failed:", err);
        resultsDiv.innerHTML = `<p class="error">Failed to analyze crop. Please try again.</p>`;
    }
}

function renderCropResults(data) {
    const resultsDiv = document.getElementById("cropResults");

    const html = `
        <div class="crop-analysis-header">
            <div class="crop-info-main">
                <h3>Analysis for: ${data.crop}</h3>
                <span class="crop-type-badge">${data.type}</span>
            </div>
            <p class="crop-summary">Comparing plant metal tolerance against real-time regional soil data.</p>
        </div>
        <div class="suitability-grid">
            ${data.results.map(res => `
                <div class="suitability-card ${res.status.toLowerCase()}">
                    <div class="suit-header">
                        <span class="suit-region">${res.region}</span>
                        <span class="suit-status-pill ${res.status.toLowerCase()}">${res.status}</span>
                    </div>
                    <p class="suit-reason">${res.reason}</p>
                    
                    ${res.status === "Restricted" && res.suggestions && res.suggestions.length > 0 ? `
                        <div class="suit-suggestions">
                            <span class="suggest-label">Suitable Alternatives:</span>
                            <div class="suggest-tags">
                                ${res.suggestions.map(s => `<span>${s}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="suit-metals-mini">
                        <span>Pb: ${res.metals.Pb}</span>
                        <span>Cd: ${res.metals.Cd}</span>
                        <span>Hg: ${res.metals.Hg}</span>
                        <span>As: ${res.metals.As}</span>
                        <span>Cr: ${res.metals.Cr}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    resultsDiv.innerHTML = html;
}

// ================= AI VISUAL INSPECTOR =================
function showVisual() {
    document.getElementById("welcomeSection").style.display = "none";
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("mapSection").style.display = "none";
    document.getElementById("cropSection").style.display = "none";
    document.getElementById("visualSection").style.display = "block";

    // Show navigation buttons
    document.getElementById("navButtons").style.display = "flex";
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        document.getElementById("imagePreview").src = e.target.result;
        document.querySelector(".upload-box").style.display = "none";
        document.getElementById("previewContainer").style.display = "block";
        document.getElementById("visualResults").style.display = "none";
    }
    reader.readAsDataURL(file);
}

function clearVisual() {
    document.getElementById("fileInput").value = "";
    document.querySelector(".upload-box").style.display = "flex";
    document.getElementById("previewContainer").style.display = "none";
    document.getElementById("visualResults").style.display = "none";
    document.getElementById("scanLine").style.display = "none";
}

async function startVisualScan() {
    const scanLine = document.getElementById("scanLine");
    const resultsDiv = document.getElementById("visualResults");
    const idText = document.getElementById("identifiedText");
    const suitDiv = document.getElementById("visualSuitability");
    const file = document.getElementById("fileInput").files[0];

    if (!file) return;

    // Start scanning animation
    scanLine.style.display = "block";
    resultsDiv.style.display = "block";
    idText.innerText = "Analyzing pixels...";
    suitDiv.innerHTML = "";

    try {
        // Step 1: Identify crop from image
        const idRes = await fetch(`/visual-identify?filename=${encodeURIComponent(file.name)}`);
        const idData = await idRes.json();

        // Wait 1.5s for "scan" feel
        await new Promise(r => setTimeout(r, 1500));

        scanLine.style.display = "none";
        idText.innerText = idData.identified;

        // Step 2: Auto-lookup soil suitability
        const suitRes = await fetch(`/crop-advisor?crop=${encodeURIComponent(idData.identified)}`);
        const suitData = await suitRes.json();

        renderVisualSuitability(suitData);
    } catch (err) {
        console.error("Visual scan failed:", err);
        idText.innerText = "Identification Failed";
    }
}

function renderVisualSuitability(data) {
    const suitDiv = document.getElementById("visualSuitability");

    const html = `
        <div class="crop-analysis-header">
            <h4>Recommended Soil Regions for ${data.crop}</h4>
        </div>
        <div class="suitability-grid">
            ${data.results.map(res => `
                <div class="suitability-card ${res.status.toLowerCase()}">
                    <div class="suit-header">
                        <span class="suit-region">${res.region}</span>
                        <span class="suit-status-pill ${res.status.toLowerCase()}">${res.status}</span>
                    </div>
                    <p class="suit-reason">${res.reason}</p>
                    
                    ${res.status === "Restricted" && res.suggestions && res.suggestions.length > 0 ? `
                        <div class="suit-suggestions">
                            <span class="suggest-label">Suitable Alternatives:</span>
                            <div class="suggest-tags">
                                ${res.suggestions.map(s => `<span>${s}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
    suitDiv.innerHTML = html;
}

// ================= INITIALIZATION =================
window.onload = () => {
    showWelcome();
};
