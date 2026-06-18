/**
 * INTERACTIVE VIDEO QUIZ - CORE LOGIC
 * Educational Technology Framework
 */

// ==========================================
// 1. STATE & DATA MANAGEMENT
// ==========================================

// Default Initial JSON Schema. 
// You can load local files, direct links (.mp4), or YouTube IDs.
let appData = {
    videoSource: "dQw4w9WgXcQ", // e.g., YouTube ID or "assets/video.mp4"
    videoType: "youtube",       // "youtube" or "local"
    category: "Science",
    difficultyLevel: "Beginner",
    passingScore: 80,
    questions: [
        {
            timestamp: 5, // in seconds (00:05)
            text: "What color is the sky usually during the day?",
            options: ["Green", "Blue", "Red", "Purple"],
            correctIndex: 1,
            hint: "Look up on a sunny day!"
        },
        {
            timestamp: 15,
            text: "Which animal says 'Moo'?",
            options: ["Dog", "Cat", "Cow", "Bird"],
            correctIndex: 2,
            hint: "They give us milk."
        }
    ]
};

// Global Variables
let currentScore = 0;
let answeredQuestions = new Set(); // Track questions already answered to prevent re-firing
let timeCheckerInterval;
let currentActiveQuestion = null;

// Video Player Variables
let ytPlayer = null;
let isYtApiReady = false;
const html5Player = document.getElementById('html5-player');

// DOM Elements
const scoreDisplay = document.getElementById('score-display');
const appTitle = document.getElementById('app-title');
const quizModal = document.getElementById('quiz-modal');
const fxContainer = document.getElementById('fx-container');

// ==========================================
// 2. VIDEO API ABSTRACTION LAYER
// ==========================================
// This section handles switching between HTML5 and YouTube smoothly.

// Callback triggered automatically when YouTube script (in HTML) finishes loading
function onYouTubeIframeAPIReady() {
    isYtApiReady = true;
    if (appData.videoType === 'youtube') {
        initVideoPlayer();
    }
}

function initVideoPlayer() {
    // Reset state
    clearInterval(timeCheckerInterval);
    answeredQuestions.clear();
    
    // Hide both initially
    html5Player.classList.add('hidden');
    document.getElementById('youtube-player').classList.add('hidden');

    if (appData.videoType === 'local') {
        // --- Setup HTML5 Player ---
        if (ytPlayer) { ytPlayer.stopVideo(); } // Stop YT if playing
        
        html5Player.src = appData.videoSource;
        html5Player.classList.remove('hidden');
        
    } else if (appData.videoType === 'youtube') {
        // --- Setup YouTube Player ---
        html5Player.pause(); // Stop HTML5 if playing
        
        if (!isYtApiReady) return; // Wait for API

        document.getElementById('youtube-player').classList.remove('hidden');

        if (ytPlayer) {
            // Player exists, just load new video
            ytPlayer.loadVideoById(appData.videoSource);
            ytPlayer.pauseVideo();
        } else {
            // Create new player
            ytPlayer = new YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: appData.videoSource,
                playerVars: { 'controls': 0, 'disablekb': 1, 'rel': 0 }, // Hide YT controls for custom UI
                events: {
                    'onReady': () => { console.log("YT Player Ready"); }
                }
            });
        }
    }

    // Start checking time for quizzes
    timeCheckerInterval = setInterval(checkVideoTime, 500);
}

// Wrapper to Play Video
function playVideo() {
    if (appData.videoType === 'local') html5Player.play();
    else if (ytPlayer && typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
}

// Wrapper to Pause Video
function pauseVideo() {
    if (appData.videoType === 'local') html5Player.pause();
    else if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
}

// Wrapper to Stop Video
function stopVideo() {
    if (appData.videoType === 'local') {
        html5Player.pause();
        html5Player.currentTime = 0;
    } else if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
        ytPlayer.stopVideo();
    }
    answeredQuestions.clear(); // Reset quiz progress on stop
}

// Wrapper to Get Current Time
function getCurrentTime() {
    if (appData.videoType === 'local') return html5Player.currentTime;
    if (appData.videoType === 'youtube' && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') return ytPlayer.getCurrentTime();
    return 0;
}

// ==========================================
// 3. STUDENT VIEW & GAMIFICATION LOGIC
// ==========================================

function checkVideoTime() {
    const currentTime = getCurrentTime();
    
    // Check if current time matches any question timestamp
    appData.questions.forEach((q, index) => {
        // If within 1 second of timestamp and not yet answered
        if (currentTime >= q.timestamp && currentTime <= q.timestamp + 1 && !answeredQuestions.has(index)) {
            triggerQuiz(q, index);
        }
    });
}

function triggerQuiz(questionObj, questionIndex) {
    pauseVideo(); // Interrupt playback
    currentActiveQuestion = { obj: questionObj, index: questionIndex };
    
    // Populate Modal
    document.getElementById('quiz-question').textContent = questionObj.text;
    const optionsGrid = document.getElementById('quiz-options');
    optionsGrid.innerHTML = ''; // Clear old buttons
    
    document.getElementById('quiz-feedback').classList.add('hidden');
    document.getElementById('quiz-hint').classList.add('hidden');
    document.getElementById('quiz-hint').textContent = `💡 Hint: ${questionObj.hint}`;

    // Create Option Buttons
    questionObj.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => handleAnswer(idx, btn);
        optionsGrid.appendChild(btn);
    });

    quizModal.classList.remove('hidden');
}

function handleAnswer(selectedIndex, btnElement) {
    const correctIndex = currentActiveQuestion.obj.correctIndex;
    const feedback = document.getElementById('quiz-feedback');
    const optionsGrid = document.getElementById('quiz-options');
    
    // Disable all buttons to prevent multiple clicks
    Array.from(optionsGrid.children).forEach(b => b.style.pointerEvents = 'none');

    if (selectedIndex === correctIndex) {
        // Correct Answer Logic
        btnElement.classList.add('correct');
        currentScore += 10;
        scoreDisplay.textContent = currentScore;
        
        // Gamification FX
        fxContainer.textContent = "🎉 Correct! 🎉";
        fxContainer.classList.remove('hidden');
        fxContainer.classList.add('animate-bounce');
        
        setTimeout(() => {
            fxContainer.classList.remove('hidden', 'animate-bounce');
            closeQuizAndResume();
        }, 1500);

    } else {
        // Incorrect Answer Logic
        btnElement.classList.add('wrong');
        feedback.textContent = "Oops! Try again next time.";
        feedback.classList.remove('hidden');
        
        // Highlight correct answer
        optionsGrid.children[correctIndex].classList.add('correct');
        
        setTimeout(() => {
            closeQuizAndResume();
        }, 2000);
    }
}

function closeQuizAndResume() {
    answeredQuestions.add(currentActiveQuestion.index); // Mark as answered
    quizModal.classList.add('hidden');
    playVideo();
}

// Student Controls Event Listeners
document.getElementById('btn-play').addEventListener('click', playVideo);
document.getElementById('btn-pause').addEventListener('click', pauseVideo);
document.getElementById('btn-stop').addEventListener('click', stopVideo);
document.getElementById('btn-hint').addEventListener('click', () => {
    document.getElementById('quiz-hint').classList.remove('hidden');
});


// ==========================================
// 4. TEACHER DASHBOARD & JSON MANAGEMENT
// ==========================================

const PIN = "1234"; // Default Teacher PIN

// Show PIN Modal
document.getElementById('btn-teacher-login').addEventListener('click', () => {
    pauseVideo();
    document.getElementById('pin-modal').classList.remove('hidden');
});

// Cancel PIN
document.getElementById('btn-cancel-pin').addEventListener('click', () => {
    document.getElementById('pin-modal').classList.add('hidden');
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-error').classList.add('hidden');
});

// Submit PIN
document.getElementById('btn-submit-pin').addEventListener('click', () => {
    const input = document.getElementById('pin-input').value;
    if (input === PIN) {
        document.getElementById('pin-modal').classList.add('hidden');
        document.getElementById('student-view').classList.add('hidden');
        document.getElementById('teacher-view').classList.remove('hidden');
        document.getElementById('pin-input').value = '';
        renderTeacherDashboard();
    } else {
        document.getElementById('pin-error').classList.remove('hidden');
    }
});

// Exit Teacher View
document.getElementById('btn-exit-teacher').addEventListener('click', () => {
    // Save settings back to appData
    appData.videoType = document.getElementById('t-video-type').value;
    appData.videoSource = document.getElementById('t-video-source').value;
    appData.category = document.getElementById('t-category').value;
    appData.difficultyLevel = document.getElementById('t-difficulty').value;
    
    document.getElementById('teacher-view').classList.add('hidden');
    document.getElementById('student-view').classList.remove('hidden');
    
    // Re-initialize app with new settings
    appTitle.textContent = `${appData.category} - ${appData.difficultyLevel}`;
    initVideoPlayer();
});

// Render Teacher Data
function renderTeacherDashboard() {
    document.getElementById('t-video-type').value = appData.videoType;
    document.getElementById('t-video-source').value = appData.videoSource;
    document.getElementById('t-category').value = appData.category;
    document.getElementById('t-difficulty').value = appData.difficultyLevel;

    const list = document.getElementById('questions-list');
    list.innerHTML = '';

    appData.questions.forEach((q, idx) => {
        const div = document.createElement('div');
        div.className = 'question-edit-box';
        div.innerHTML = `
            <strong>Question ${idx + 1}</strong>
            <button class="btn danger small" onclick="deleteQuestion(${idx})" style="float:right;">Delete</button>
            <label>Timestamp (Seconds):</label>
            <input type="number" value="${q.timestamp}" onchange="updateQ(${idx}, 'timestamp', this.value)">
            <label>Text:</label>
            <input type="text" value="${q.text}" onchange="updateQ(${idx}, 'text', this.value)">
            <label>Comma-separated Options:</label>
            <input type="text" value="${q.options.join(',')}" onchange="updateQ(${idx}, 'options', this.value)">
            <label>Correct Answer Index (0-3):</label>
            <input type="number" value="${q.correctIndex}" min="0" max="3" onchange="updateQ(${idx}, 'correctIndex', this.value)">
        `;
        list.appendChild(div);
    });
}

// Teacher CRUD Operations (exposed to global for inline handlers)
window.updateQ = function(index, field, value) {
    if (field === 'options') {
        appData.questions[index][field] = value.split(',').map(s => s.trim());
    } else if (field === 'timestamp' || field === 'correctIndex') {
        appData.questions[index][field] = parseInt(value, 10);
    } else {
        appData.questions[index][field] = value;
    }
};

window.deleteQuestion = function(index) {
    appData.questions.splice(index, 1);
    renderTeacherDashboard();
};

document.getElementById('btn-add-question').addEventListener('click', () => {
    appData.questions.push({
        timestamp: 0, text: "New Question", options: ["A", "B", "C", "D"], correctIndex: 0, hint: ""
    });
    renderTeacherDashboard();
});

// Export JSON
document.getElementById('btn-export-json').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const dlAnchorElem = document.getElementById('download-anchor');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "quiz-data.json");
    dlAnchorElem.click();
});

// Import JSON
document.getElementById('import-json').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            appData = parsed;
            alert("JSON Data Imported Successfully!");
            renderTeacherDashboard();
        } catch(err) {
            alert("Invalid JSON file.");
        }
    };
    reader.readAsText(file);
});

// Initialize the app on page load
window.onload = () => {
    appTitle.textContent = `${appData.category} - ${appData.difficultyLevel}`;
    if (appData.videoType === 'local') {
        initVideoPlayer();
    }
    // If it's Youtube, it waits for `onYouTubeIframeAPIReady`
};