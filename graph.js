// ✅ Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ✅ Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBKQJki3JUr5pDhgOxOQRmXpOY7-gOj2Bk",
    authDomain: "learnify-ada08.firebaseapp.com",
    databaseURL: "https://learnify-ada08-default-rtdb.firebaseio.com",
    projectId: "learnify-ada08",
    storageBucket: "learnify-ada08.firebasestorage.app",
    messagingSenderId: "380617329082",
    appId: "1:380617329082:web:c2242ea09e6f78f1f73583"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/**
 * Formats a date string (YYYY-MM-DD) into "31st Mar" format
 */
function formatStudyDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    
    const suffix = (day % 10 === 1 && day !== 11) ? 'st' :
                   (day % 10 === 2 && day !== 12) ? 'nd' :
                   (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
    
    return `${day}${suffix} ${month}`;
}

/**
 * Main function to fetch data and prepare the charts
 */
async function loadStudyData() {
    try {
        const studyRef = ref(db, "users/aditya/studySessions");
        const snapshot = await get(studyRef);

        if (!snapshot.exists()) return;

        const data = snapshot.val();
        const dateMap = {};

        Object.values(data).forEach(session => {
            const date = session.date; 
            const hours = parseFloat(session.duration || 0);
            if (date) {
                dateMap[date] = (dateMap[date] || 0) + hours;
            }
        });

        const sortedDates = Object.keys(dateMap).sort();
        const labels = sortedDates.map(d => formatStudyDate(d));
        const values = sortedDates.map(d => dateMap[d]);

        if (labels.length > 0) {
            // Force 5 entries per view (approx 66px per entry for a 330px scroll area)
            const container = document.querySelector('.chart-container');
            container.style.width = `${labels.length * 66}px`;
            
            createCharts(labels, values);
            setupHorizontalScroll();
        }
    } catch (err) {
        console.error("Firebase Fetch Error:", err);
    }
}

/**
 * Creates two synchronized charts: Fixed Y-Axis and Scrollable Data
 */
function createCharts(labels, values) {
    const maxVal = Math.max(...values, 5); // Ensure scale has a reasonable height

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // Prevents glitches during scroll/load
        plugins: { legend: { display: false } },
        scales: {
            y: {
                beginAtZero: true,
                max: Math.ceil(maxVal + 1),
                ticks: { 
                    color: "#000", 
                    font: { weight: 'bold', size: 12 },
                    stepSize: 1 // Clean integers (1, 2, 3...)
                },
                grid: { color: "rgba(0, 0, 0, 0.1)" },
                border: { color: "#000", width: 2 }
            },
            x: {
                ticks: { color: "#000", font: { weight: 'bold', size: 11 } },
                grid: { display: false },
                border: { color: "#000", width: 2 }
            }
        }
    };

    // Cleanup previous instances
    const oldAxis = Chart.getChart("yAxisChart");
    const oldMain = Chart.getChart("studyChart");
    if (oldAxis) oldAxis.destroy();
    if (oldMain) oldMain.destroy();

    // 1. FIXED Y-AXIS CHART
    new Chart(document.getElementById("yAxisChart"), {
        type: "line",
        data: { labels: labels, datasets: [{ data: values, pointRadius: 0, borderColor: 'transparent' }] },
        options: {
            ...commonOptions,
            layout: { padding: { bottom: 32 } }, // Align with main chart's X-axis height
            scales: {
                y: commonOptions.scales.y,
                x: { display: false } // Hide X axis entirely for the side panel
            }
        }
    });

    // 2. MAIN SCROLLABLE CHART
    const ctxMain = document.getElementById("studyChart").getContext("2d");
    const gradient = ctxMain.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(138, 43, 226, 0.2)');
    gradient.addColorStop(1, 'rgba(138, 43, 226, 0.0)');

    new Chart(document.getElementById("studyChart"), {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                data: values,
                fill: true,
                backgroundColor: gradient,
                borderColor: "#000",
                borderWidth: 2,
                pointBackgroundColor: "#8A2BE2",
                tension: 0.4
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: { 
                    ...commonOptions.scales.y, 
                    ticks: { display: false }, 
                    border: { display: false } 
                },
                x: commonOptions.scales.x
            }
        }
    });

    // Default view: Scroll to the latest data
    const wrapper = document.querySelector('.scroll-wrapper');
    setTimeout(() => {
        wrapper.scrollLeft = wrapper.scrollWidth;
    }, 100);
}

/**
 * Converts vertical mouse wheel movement into horizontal scrolling
 */
function setupHorizontalScroll() {
    const scrollContainer = document.querySelector(".scroll-wrapper");
    scrollContainer.addEventListener("wheel", (evt) => {
        evt.preventDefault();
        scrollContainer.scrollLeft += evt.deltaY;
    });
}

// Start the app
loadStudyData();