
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, get } from "firebase/database";

// --- 1. CONFIG FOR DIAMOND WORKSTATION (Your Current App) ---
const workstationConfig = {
    apiKey: "AIzaSyB_tE1HqkbHGXWTezhSZzr_eYyAUyN-J7s",
    authDomain: "diamondworkstation.firebaseapp.com",
    databaseURL: "https://diamondworkstation-default-rtdb.firebaseio.com",
    projectId: "diamondworkstation",
};

// --- 2. CONFIG FOR LEARNIFY (Where Coins Go) ---
const learnifyConfig = {
    apiKey: "AIzaSyBKQJki3JUr5pDhgOxOQRmXpOY7-gOj2Bk",
    authDomain: "learnify-ada08.firebaseapp.com",
    databaseURL: "https://learnify-ada08-default-rtdb.firebaseio.com",
    projectId: "learnify-ada08",
};

// Initialize both Apps
const workstationApp = initializeApp(workstationConfig, "workstation");
const learnifyApp = initializeApp(learnifyConfig, "learnify");

// Get Database references for both
const dbWorkstation = getDatabase(workstationApp);
const dbLearnify = getDatabase(learnifyApp);

// --- CONVERTER LOGIC ---
const CONVERSION_RATE = 250;
let currentRockets = 0;

function initConverter() {
    const handle = document.getElementById('swipe-handle');
    const track = document.getElementById('swipe-track');
    
    // References to the specific paths
    const rocketRef = ref(dbWorkstation, 'user/rockets');
    const learnifyBalanceRef = ref(dbLearnify, 'users/aditya/balance');

    // Sync Rocket Display
    onValue(rocketRef, (snap) => {
        currentRockets = snap.val() || 0;
        document.getElementById('rocket-display').innerText = `🚀 ${currentRockets}`;
        document.getElementById('coin-preview').innerText = `💰 ${currentRockets * CONVERSION_RATE}`;
    });

    // Swipe Handling
    let isDragging = false;
    let startX = 0;

    const startDrag = (x) => { isDragging = true; startX = x; };
    const endDrag = () => { if (isDragging) { isDragging = false; handle.style.transform = 'translateX(0px)'; } };

    handle.onmousedown = (e) => startDrag(e.clientX);
    handle.ontouchstart = (e) => startDrag(e.touches[0].clientX);
    window.onmouseup = endDrag;
    window.ontouchend = endDrag;

    window.onmousemove = (e) => { if (isDragging) moveHandle(e.clientX); };
    window.ontouchmove = (e) => { if (isDragging) moveHandle(e.touches[0].clientX); };

    function moveHandle(clientX) {
        let deltaX = clientX - startX;
        let limit = track.offsetWidth - handle.offsetWidth - 10;
        if (deltaX < 0) deltaX = 0;
        if (deltaX > limit) deltaX = limit;

        handle.style.transform = `translateX(${deltaX}px)`;

        // TRIGGER CONVERSION
        if (deltaX >= limit * 0.98) {
            isDragging = false;
            processConversion(rocketRef, learnifyBalanceRef);
        }
    }
}

async function processConversion(rocketRef, balanceRef) {
    if (currentRockets <= 0) return;

    const coinsToAdd = currentRockets * CONVERSION_RATE;

    try {
        // 1. Get current coins from Learnify
        const coinSnap = await get(balanceRef);
        const currentCoins = coinSnap.val() || 0;

        // 2. Add coins to Learnify Database
        await set(balanceRef, currentCoins + coinsToAdd);

        // 3. Reset Rockets in Workstation Database
        await set(rocketRef, 0);

        alert(`🚀 Mission Transferred! +${coinsToAdd} coins added to Learnify.`);
    } catch (err) {
        console.error("Transfer failed:", err);
        alert("Transfer Error. Check Console.");
    } finally {
        document.getElementById('swipe-handle').style.transform = 'translateX(0px)';
    }
}

// Ensure you call initConverter() inside your DOMContentLoaded!