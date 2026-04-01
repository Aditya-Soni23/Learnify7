import { initializeApp, getApp, getApps } from "firebase/app";
import { getDatabase, ref, set, onValue, update, remove, push, get } from "firebase/database";

// --- 1. FIREBASE CONFIGURATIONS ---
const workstationConfig = {
    apiKey: "AIzaSyB_tE1HqkbHGXWTezhSZzr_eYyAUyN-J7s",
    authDomain: "diamondworkstation.firebaseapp.com",
    databaseURL: "https://diamondworkstation-default-rtdb.firebaseio.com",
    projectId: "diamondworkstation",
    storageBucket: "diamondworkstation.firebasestorage.app",
    messagingSenderId: "664230863599",
    appId: "1:664230863599:web:7af9a6a8a76c8ad86c711a"
};

const learnifyConfig = {
    apiKey: "AIzaSyBKQJki3JUr5pDhgOxOQRmXpOY7-gOj2Bk",
    authDomain: "learnify-ada08.firebaseapp.com",
    databaseURL: "https://learnify-ada08-default-rtdb.firebaseio.com",
    projectId: "learnify-ada08",
    storageBucket: "learnify-ada08.firebasestorage.app",
    messagingSenderId: "380617329082",
    appId: "1:380617329082:web:c2242ea09e6f78f1f73583",
};

// --- FIXED: FORCED INITIALIZATION ---
let workstationApp;
let learnifyApp;

// Handle Workstation (Default)
try {
    // Try to get the existing default app
    workstationApp = getApp();
} catch (e) {
    // If it doesn't exist, create it
    workstationApp = initializeApp(workstationConfig);
}

// Handle Learnify (Named)
try {
    // Try to get the existing 'learnify' app
    learnifyApp = getApp("learnify");
} catch (e) {
    // If it doesn't exist, create it
    learnifyApp = initializeApp(learnifyConfig, "learnify");
}

const db = getDatabase(workstationApp);
const dbLearnify = getDatabase(learnifyApp);

// --- The rest of your script follows here ---

// --- 2. GLOBAL UI HANDLES ---
window.toggleDiamondModal = (show) => {
    const modal = document.getElementById('dpModalOverlay');
    if (modal) modal.style.display = show ? 'flex' : 'none';
};

window.openApp = (appKey) => {
    const links = {
        pw: "https://www.pw.live",
        youtube: "https://youtube.com",
        learnify: "https://diamondlearnify.netlify.app/",
        diamond: "https://diamondcompanyv2.netlify.app/",
        whatsapp: "https://web.whatsapp.com",
        whiteboard: "https://aditya-soni23.github.io/Diamond_Whiteboard/",
        tdl: "https://diamondtodolist.netlify.app/"
    };
    if (links[appKey]) window.open(links[appKey], "_blank");
};

// --- 3. DATABASE REFERENCES ---
const rocketsRef = ref(db, 'user/rockets');
const plannerRef = ref(db, 'user/diamond_planner');
const todoRef = ref(db, 'user/todo_list');
const learnifyBalanceRef = ref(dbLearnify, 'users/aditya/balance');

let dpTasks = [];
let currentPage = 0;
let currentRockets = 0;
const CONVERSION_RATE = 250;

// --- 4. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Sync Rockets & Converter Preview
    onValue(rocketsRef, (snapshot) => {
        currentRockets = snapshot.val() || 0;
        const el = document.getElementById("rocketCount");
        if (el) el.innerText = currentRockets;
        
        const rocketDisp = document.getElementById('rocket-display');
        const coinPrev = document.getElementById('coin-preview');
        if(rocketDisp) rocketDisp.innerText = `🚀 ${currentRockets}`;
        if(coinPrev) coinPrev.innerText = `💰 ${currentRockets * CONVERSION_RATE}`;
    });

    // Sync Planner
    onValue(plannerRef, (snapshot) => {
        const data = snapshot.val();
        const createZone = document.getElementById('dpCreateZone');
        if (data && data.tasks) {
            dpTasks = data.tasks;
            if (createZone) createZone.style.display = 'none';
            renderTimeline(data.step || 0);
        } else {
            if (createZone) createZone.style.display = 'block';
            const container = document.getElementById('dpNodesContainer');
            if (container) container.innerHTML = '';
        }
    });

    // Sync To-Do
    onValue(todoRef, (snapshot) => {
        const tasks = snapshot.val() || {};
        renderTodoList(tasks);
    });

    // To-Do Add
    const addBtn = document.getElementById('addPlannerBtn');
    const input = document.getElementById('plannerInput');
    if (addBtn && input) {
        addBtn.onclick = () => {
            const text = input.value.trim();
            if (text) {
                push(todoRef, { text: text, completed: false });
                input.value = '';
            }
        };
    }

    initNavigation();
    initConverter(); 
    setInterval(updateTime, 1000);
    updateTime();
});
function initConverter() {
  const handle = document.getElementById('swipe-handle');
  const track = document.getElementById('swipe-track');
  if (!handle || !track) return;

  let isDragging = false;
  let startX = 0;

  const startDrag = (e, clientX) => { 
      // Stop page navigation from firing
      e.stopPropagation();
      isDragging = true; 
      startX = clientX; 
      handle.style.transition = 'none'; 
  };

  const endDrag = () => { 
      if (isDragging) { 
          isDragging = false; 
          handle.style.transition = '0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
          
          // If not fully swiped, snap back
          const currentX = new WebKitCSSMatrix(getComputedStyle(handle).transform).m41;
          let limit = track.offsetWidth - handle.offsetWidth - 10;
          if (currentX < limit * 0.98) {
              handle.style.transform = 'translateX(0px)'; 
          }
      } 
  };

  handle.onmousedown = (e) => startDrag(e, e.clientX);
  handle.ontouchstart = (e) => startDrag(e, e.touches[0].clientX);
  
  // Attach to window to ensure drag doesn't break if mouse leaves handle
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);

  window.addEventListener('mousemove', (e) => { if (isDragging) moveHandle(e.clientX); });
  window.addEventListener('touchmove', (e) => { 
      if (isDragging) {
          // Prevent the screen from bouncing/scrolling on mobile
          if (e.cancelable) e.preventDefault();
          moveHandle(e.touches[0].clientX); 
      }
  }, { passive: false });

  function moveHandle(clientX) {
      let deltaX = clientX - startX;
      let limit = track.offsetWidth - handle.offsetWidth - 10;
      
      if (deltaX < 0) deltaX = 0;
      if (deltaX > limit) deltaX = limit;

      handle.style.transform = `translateX(${deltaX}px)`;

      // Conversion Trigger
      if (deltaX >= limit * 0.98) {
          isDragging = false;
          processConversion();
      }
  }
}

async function processConversion() {
    if (currentRockets <= 0) {
        alert("No rockets to convert!");
        return;
    }

    const coinsToAdd = currentRockets * CONVERSION_RATE;

    try {
        const coinSnap = await get(learnifyBalanceRef);
        const currentCoins = coinSnap.val() || 0;

        await set(learnifyBalanceRef, currentCoins + coinsToAdd);
        await set(rocketsRef, 0);

        alert(`CONVERSION SUCCESS!\nAdded ${coinsToAdd} coins to Learnify.`);
    } catch (err) {
        console.error("Transfer failed:", err);
        alert("Database error.");
    } finally {
        const h = document.getElementById('swipe-handle');
        if(h) h.style.transform = 'translateX(0px)';
    }
}

// --- 6. CORE APP FUNCTIONS ---

function renderTodoList(tasksData) {
  const plannerList = document.getElementById('plannerList');
  if (!plannerList) return;
  plannerList.innerHTML = '';
  
  Object.keys(tasksData).forEach(key => {
      const task = tasksData[key];
      const li = document.createElement('li');
      li.className = `planner-item ${task.completed ? 'completed' : ''}`;
      li.innerHTML = `
          <span>${task.text}</span>
          <div>
              <button class="tick">✔</button>
              <button class="delete">🗑</button>
          </div>
      `;

      // --- TASK COMPLETION + ROCKET REWARD ---
      li.querySelector('.tick').onclick = async () => {
          try {
              // 1. Get current rocket count (Read once)
              const snap = await get(rocketsRef);
              const currentRockets = snap.val() || 0;

              // 2. Grant +1 Rocket & Mark task completed in Workstation DB
              await update(ref(db, `user`), { 
                  rockets: currentRockets + 1 
              });
              
              await update(ref(db, `user/todo_list/${key}`), { 
                  completed: true 
              });

              console.log("TDL Task Done! +1 Rocket added.");

              // 3. Remove task after a short delay for the "completed" animation
              setTimeout(() => {
                  remove(ref(db, `user/todo_list/${key}`));
              }, 600);

          } catch (error) {
              console.error("Error granting rocket:", error);
          }
      };

      // --- DELETE ONLY (No Rocket) ---
      li.querySelector('.delete').onclick = () => {
          remove(ref(db, `user/todo_list/${key}`));
      };

      plannerList.appendChild(li);
  });
}
function renderTimeline(step) {
    const container = document.getElementById('dpNodesContainer');
    if (!container) return;
    container.innerHTML = '';
  
    dpTasks.forEach((task, index) => {
        const node = document.createElement('div');
        node.className = `node ${index < step ? 'completed' : ''} ${index === step ? 'active' : ''}`;
        node.innerHTML = `
            <div class="node-info">
                <span class="node-name">${task.name}</span>
                <span class="node-duration">${task.time}m</span>
            </div>
        `;
        node.onclick = () => {
            if (index > step) {
                onValue(rocketsRef, (snap) => {
                    const current = snap.val() || 0;
                    set(rocketsRef, current + 1);
                }, { onlyOnce: true });
            }
            update(plannerRef, { step: index });
        };
        container.appendChild(node);
    });

    const progress = document.getElementById('dpProgressFill');
    if (progress) {
        const percent = (step / (dpTasks.length - 1)) * 100;
        progress.style.width = dpTasks.length > 1 ? `${percent}%` : '100%';
    }

    const reward = document.getElementById('dpRewardZone');
    if (reward) reward.style.display = (step === dpTasks.length - 1) ? 'block' : 'none';
}

window.finishDiamondMission = () => {
    onValue(rocketsRef, (snap) => {
        const currentRockets = snap.val() || 0;
        set(rocketsRef, currentRockets + 5); 
    }, { onlyOnce: true });

    remove(plannerRef).then(() => {
        alert("MISSION SUCCESSFUL! +5 ROCKETS GRANTED.");
        const reward = document.getElementById('dpRewardZone');
        if (reward) reward.style.display = 'none';
    });
};

function initNavigation() {
    const pages = document.getElementById("pages");
    const panel = document.querySelector(".panel");
    const dots = document.querySelectorAll(".dot");
    if (!pages || !panel) return;

    const updateUI = () => {
        const width = panel.clientWidth;
        pages.style.transform = `translateX(-${currentPage * width}px)`;
        dots.forEach((dot, i) => dot.classList.toggle("active", i === currentPage));
    };

    panel.addEventListener("wheel", (e) => {
        currentPage = e.deltaY > 0 ? Math.min(currentPage + 1, 1) : Math.max(currentPage - 1, 0);
        updateUI();
    });

    let startX = 0;
    pages.addEventListener("touchstart", e => startX = e.touches[0].clientX);
    pages.addEventListener("touchend", e => {
        let endX = e.changedTouches[0].clientX;
        if (startX - endX > 50) currentPage = Math.min(currentPage + 1, 1);
        else if (endX - startX > 50) currentPage = Math.max(currentPage - 1, 0);
        updateUI();
    });
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById("time");
    if (el) el.innerText = timeString;
}

window.addNewDiamondInputRow = () => {
    const container = document.getElementById('dpTaskInputsContainer');
    const row = document.createElement('div');
    row.className = 'dp-input-row';
    row.innerHTML = `<input type="text" placeholder="Task Name" class="dp-t-name">
                     <input type="number" placeholder="Mins" class="dp-t-time">`;
    container.appendChild(row);
};

window.setDiamondTimeline = () => {
    const names = document.querySelectorAll('.dp-t-name');
    const times = document.querySelectorAll('.dp-t-time');
    const tasks = [];
    names.forEach((n, i) => { 
        if (n.value.trim()) tasks.push({ name: n.value, time: times[i].value || 0 }); 
    });
    if (tasks.length > 0) {
        set(plannerRef, { tasks, step: 0 });
        window.toggleDiamondModal(false);
    }
};
function initSimpleTestCountdown() {
  function updateDays() {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
      
      // Calculate days until next Monday (1)
      // If today is Monday (1), we look for the Monday in 7 days
      let daysUntil = (1 + 7 - dayOfWeek) % 7;
      if (daysUntil === 0) daysUntil = 7; 

      const display = document.getElementById('test-days');
      if (display) {
          display.innerText = `${daysUntil} ${daysUntil === 1 ? 'DAY' : 'DAYS'}`;
      }
  }

  updateDays();
  // Check every hour to keep it accurate
  setInterval(updateDays, 3600000);
}

// Call this inside your DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initSimpleTestCountdown();
});


// --- SYLLABUS STATE (Zoom & Pan) ---
let syllabusZoom = 1;
let isPanning = false;
let startPos = { x: 0, y: 0 };
let translatePos = { x: 0, y: 0 };

// 1. ZOOM LOGIC (Attached to Window)
window.handleSyllabusZoom = (e) => {
    // Stop page navigation/scrolling while inside the syllabus
    if (e.stopPropagation) e.stopPropagation();
    
    const zoomSpeed = 0.15;
    if (e.deltaY < 0) syllabusZoom += zoomSpeed;
    else syllabusZoom -= zoomSpeed;

    // Limit zoom between 1x and 5x
    syllabusZoom = Math.max(1, Math.min(syllabusZoom, 5));

    // If zoomed back to 1x, reset the position to center
    if (syllabusZoom === 1) {
        translatePos = { x: 0, y: 0 };
    }

    applySyllabusTransform();
};

// 2. MODAL CONTROLS
window.toggleSyllabusModal = (show) => {
    const modal = document.getElementById('syllabusModal');
    if (show) {
        modal.classList.add('active');
        loadSyllabus(); 
    } else {
        modal.classList.remove('active');
        // Reset everything when closing
        syllabusZoom = 1;
        translatePos = { x: 0, y: 0 };
        applySyllabusTransform();
    }
};

// 3. TRANSFORM ENGINE
function applySyllabusTransform() {
    const wrapper = document.getElementById('zoomWrapper');
    const viewer = document.querySelector('.syllabus-view');
    if (wrapper) {
        wrapper.style.transform = `translate(${translatePos.x}px, ${translatePos.y}px) scale(${syllabusZoom})`;
        // Change cursor to indicate you can drag when zoomed in
        if (viewer) viewer.style.cursor = syllabusZoom > 1 ? 'grab' : 'zoom-in';
    }
}

// 4. PANNING (DRAG) LOGIC
function initSyllabusDrag() {
    const viewer = document.querySelector('.syllabus-view');
    if (!viewer) return;

    viewer.onmousedown = (e) => {
        if (syllabusZoom <= 1) return; // Don't drag if not zoomed
        isPanning = true;
        viewer.style.cursor = 'grabbing';
        
        startPos = {
            x: e.clientX - translatePos.x,
            y: e.clientY - translatePos.y
        };
    };

    window.onmousemove = (e) => {
        if (!isPanning) return;
        translatePos.x = e.clientX - startPos.x;
        translatePos.y = e.clientY - startPos.y;
        applySyllabusTransform();
    };

    window.onmouseup = () => {
        isPanning = false;
        if (viewer) viewer.style.cursor = syllabusZoom > 1 ? 'grab' : 'zoom-in';
    };
}

// 5. FILE HANDLING & PERSISTENCE
document.getElementById('syllabusInput')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const base64String = event.target.result;
        localStorage.setItem('diamond_syllabus', base64String);
        displaySyllabus(base64String);
    };
    reader.readAsDataURL(file);
});

function loadSyllabus() {
    const savedImg = localStorage.getItem('diamond_syllabus');
    if (savedImg) displaySyllabus(savedImg);
}

function displaySyllabus(src) {
    const imgEl = document.getElementById('syllabusImg');
    const wrapper = document.getElementById('zoomWrapper');
    const textEl = document.getElementById('noSyllabusText');
    
    if (imgEl && wrapper && textEl) {
        imgEl.src = src;
        wrapper.style.display = 'block';
        textEl.style.display = 'none';
        
        // Reset view for the new image
        syllabusZoom = 1;
        translatePos = { x: 0, y: 0 };
        applySyllabusTransform();
    }
}

// 6. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadSyllabus();
    initSyllabusDrag();
    // Re-run the countdown init if it exists
    if (typeof initSimpleTestCountdown === 'function') {
        initSimpleTestCountdown();
    }
});
// --- TRACKER DATA ---
const subjectsData = {
  Physics: ["Units and measurements.","Vector and calculus.","Motion in a straight line.","Motion in a plane.","Newton's laws of motion.","Work power and energy.","System of particles and centre of mass.","Rotational motion.","Gravitation","Mechanical properties of solids.","Fluid mechanics.","Thermal properties of matter.","Kinetic theory of gases.","Thermodynamics","Simple harmonic motion.","Waves. ","Electric charges and fields.","Electrostatic potential and capacitance","Current electricity ","Moving charges and magnetism.","Magnetism and matter.","Electromagnetic induction","Alternating current.","Electromagnetic waves.","Ray optics and optical instruments.","Wave optics","Dual nature of radiation and matter.","Atoms. ","Nuclei.","Semiconductor electronics materials devices and simple circuits"],
  Mathematics: [
    "Basic mathematics and logarithm.",
    "Quadratic equations.",
    "Sequence and series.",
    "Complex numbers.",
    "Permutation and combinations.",
    "Binomial theorem.",
    "Probability.",
    "Matrices and determinants.",
    "Trigonometric ratios and identities.",
    "Trigonometric equations.",
    "Inverse trigonometric functions.",
    "Solutions of triangles.",
    "Functions.",
    "Limits of functions.",
    "Continuity.",
    "Differentiability and method of differentiation.",
    "Application of derivatives.",
    "Indefinite integration.",
    "Definite integration.",
    "Application of integrals.",
    "Differential equations.",
    "Straight lines.",
    "Circle.",
    "Parabola.",
    "Hyperbola.",
    "Vector algebra.",
    "Three dimensional geometry.",
    "Set theory and relations.",
    "Statistics."
  ],
  Chemistry: [
    "Some basic concepts of Chemistry.",
    "Structure of atom.",
    "Classification of elements and periodicity in properties.",
    "Chemical bonding and molecular structure.",
    "States of matter.",
    "Thermodynamics, equilibrium, redox reactions.",
    "S block elements.",
    "P block elements.",
    "Organic chemistry: some basic principles and techniques.",
    "Hydrocarbons.",
    "The solid state.",
    "Solutions.",
    "Electrochemistry.",
    "Nuclear chemistry.",
    "Surface chemistry.",
    "Chemical kinetics.",
    "Extraction of metals.",
    "D and F block elements.",
    "Coordination compounds.",
    "Haloalkanes and haloarenes.",
    "Alcohols, phenols and ethers.",
    "Aldehydes, ketones and carboxylic acids.",
    "Amines.",
    "Biomolecules.",
    "Polymers and chemistry in everyday life.",
    "Principles related to practical chemistry."
  ]
};

let currentSubject = "Physics";

// 1. Modal Toggle
window.toggleTrackerModal = (show) => {
  const modal = document.getElementById('trackerModal');
  if (show) {
      modal.classList.add('active');
      renderChapters();
  } else {
      modal.classList.remove('active');
  }
};

// 2. Switch Subject
window.switchSubject = (sub) => {
  currentSubject = sub;
  document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.innerText === sub || (sub === 'Mathematics' && btn.innerText === 'Maths'));
  });
  renderChapters();
};

// 3. Render Chapters and Markers
function renderChapters() {
  const container = document.getElementById('chaptersContainer');
  container.innerHTML = '';

  const chapters = subjectsData[currentSubject];
  const books = ["RESO", "PW", "PYQ", "NOTES"]; // Resonance, PW, PYQ, Class Notes
  if (currentSubject === "Physics") books.push("DCP"); // Add DC Pandey for Physics

  chapters.forEach(chapter => {
      const card = document.createElement('div');
      card.className = 'chapter-card';
      
      card.innerHTML = `
          <div class="chapter-info">
              <h4>${chapter}</h4>
          </div>
          <div class="markers-row" id="markers-${chapter.replace(/\s/g, '')}"></div>
      `;

      const row = card.querySelector('.markers-row');
      
      books.forEach(book => {
          const markerId = `${currentSubject}-${chapter}-${book}`;
          const isDone = localStorage.getItem(markerId) === "true";
          
          const m = document.createElement('div');
          m.className = `marker ${isDone ? 'done' : ''}`;
          m.innerText = book;
          m.onclick = () => toggleMarker(markerId, m);
          row.appendChild(m);
      });

      container.appendChild(card);
  });
}

// 4. Toggle Marker & Grant Rocket
async function toggleMarker(id, element) {
  if (element.classList.contains('done')) return; // Already rewarded

  // 1. Update UI
  element.classList.add('done');
  localStorage.setItem(id, "true");

  // 2. Grant 1 Rocket via Firebase
  try {
      const { getDatabase, ref, get, set } = await import("firebase/database");
      // Re-using your existing workstation database setup
      const db = getDatabase(); 
      const rocketsRef = ref(db, 'user/rockets');
      
      const snap = await get(rocketsRef);
      const current = snap.val() || 0;
      await set(rocketsRef, current + 5);
      
      console.log("Marker Complete! +5 Rocket granted.");
  } catch (err) {
      console.error("Rocket grant failed:", err);
  }
}
// Add this to your JS file
window.openAI = (appKey) => {
    const aiLinks = {
        chatgpt: "https://chatgpt.com",
        google: "https://www.google.com",
        gemini: "https://gemini.google.com"
    };
    
    if (aiLinks[appKey]) {
        window.open(aiLinks[appKey], "_blank");
    } else {
        console.warn(`No URL found for: ${appKey}`);
    }
};