/**
 * INTERACTIVE VIDEO QUIZ - CORE LOGIC
 * Features: LocalStorage, 2x2 MCQ, Multi-question Types, Secure PIN
 */

// ==========================================
// 1. STATE & STORAGE MANAGEMENT
// ==========================================

const DEFAULT_DATA = {
    pin: "1234",
    videoSource: "dQw4w9WgXcQ", 
    videoType: "youtube",       
    category: "Science",
    difficultyLevel: "Beginner",
    questions: [
        {
            type: "mcq",
            timestamp: 5,
            text: "What color is the sky usually during the day?",
            options: ["Green", "Blue", "Red", "Purple"],
            correctAnswer: 1, // Index of "Blue"
            hint: "Look up on a sunny day!"
        },
        {
            type: "identification",
            timestamp: 15,
            text: "Which animal produces milk and says 'Moo'?",
            correctAnswer: "cow", // String matching
            hint: "They live on farms."
        },
        {
            type: "essay",
            timestamp: 25,
            text: "In one sentence, describe why you like learning.",
            correctAnswer: "", // Any text is accepted
            hint: "There is no wrong answer!"
        }
    ]
};

// Load data from LocalStorage or use defaults
let appData = JSON.parse(localStorage.getItem('quizAppData')) || DEFAULT_DATA;

function saveToLocalStorage() {
    localStorage.setItem('quizAppData', JSON.stringify(appData));
}

// Global Variables
let currentScore = 0;
let answeredQuestions = new Set(); 
let timeCheckerInterval;
let currentActiveQuestion = null;

// Video Player Variables
let ytPlayer = null;
let isYtApiReady = false;
const html5Player = document.getElementById('html5-player');

// ==========================================
// 2. VIDEO API ABSTRACTION
// ==========================================

function onYouTubeIframeAPIReady() {
    isYtApiReady = true;
    if (appData.videoType === 'youtube') initVideoPlayer();
}

function initVideoPlayer() {
    clearInterval(timeCheckerInterval);
    answeredQuestions.clear();
    
    html5Player.classList.add('hidden');
    document.getElementById('youtube-player').classList.add('hidden');

    if (appData.videoType === 'local') {
        if (ytPlayer) ytPlayer.stopVideo();
        html5Player.src = appData.videoSource;
        html5Player.classList.remove('hidden');
    } else if (appData.videoType === 'youtube') {
        html5Player.pause();
        if (!isYtApiReady) return;

        document.getElementById('youtube-player').classList.remove('hidden');

        if (ytPlayer) {
            ytPlayer.loadVideoById(appData.videoSource);
            ytPlayer.pauseVideo();
        } else {
            ytPlayer = new YT.Player('youtube-player', {
                height: '100%', width: '100%', videoId: appData.videoSource,
                playerVars: { 'controls': 0, 'disablekb': 1, 'rel': 0 }
            });
        }
    }
    timeCheckerInterval = setInterval(checkVideoTime, 500);
}

function playVideo() { appData.videoType === 'local' ? html5Player.play() : ytPlayer?.playVideo(); }
function pauseVideo() { appData.videoType === 'local' ? html5Player.pause() : ytPlayer?.pauseVideo(); }
function stopVideo() {
    if (appData.videoType === 'local') { html5Player.pause(); html5Player.currentTime = 0; } 
    else { ytPlayer?.stopVideo(); }
    answeredQuestions.clear();
}
function getCurrentTime() {
    return appData.videoType === 'local' ? html5Player.currentTime : (ytPlayer?.getCurrentTime() || 0);
}

// ==========================================
// 3. STUDENT VIEW & MULTI-TYPE QUIZ LOGIC
// ==========================================

function checkVideoTime() {
    const currentTime = getCurrentTime();
    appData.questions.forEach((q, index) => {
        if (currentTime >= q.timestamp && currentTime <= q.timestamp + 1 && !answeredQuestions.has(index)) {
            triggerQuiz(q, index);
        }
    });
}

function triggerQuiz(questionObj, questionIndex) {
    pauseVideo();
    currentActiveQuestion = { obj: questionObj, index: questionIndex };
    
    document.getElementById('quiz-question').textContent = questionObj.text;
    document.getElementById('quiz-feedback').classList.add('hidden');
    document.getElementById('quiz-hint').classList.add('hidden');
    document.getElementById('quiz-hint').textContent = `💡 Hint: ${questionObj.hint}`;
    
    const answerArea = document.getElementById('quiz-answer-area');
    answerArea.innerHTML = ''; // Clear previous

    if (questionObj.type === 'mcq') {
        // Render 2x2 MCQ Grid
        const grid = document.createElement('div');
        grid.className = 'mcq-grid';
        questionObj.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.onclick = () => validateAnswer(idx, btn);
            grid.appendChild(btn);
        });
        answerArea.appendChild(grid);
    } 
    else if (questionObj.type === 'identification') {
        // Render Short Answer
        answerArea.innerHTML = `
            <input type="text" id="student-text-input" class="text-answer-input" placeholder="Type your answer here...">
            <button class="btn primary" onclick="validateAnswer(document.getElementById('student-text-input').value, this)">Submit Answer</button>
        `;
    }
    else if (questionObj.type === 'essay') {
        // Render Essay (Textarea)
        answerArea.innerHTML = `
            <textarea id="student-text-input" class="text-answer-input" placeholder="Write your thoughts here..."></textarea>
            <button class="btn primary" onclick="validateAnswer(document.getElementById('student-text-input').value, this)">Submit Essay</button>
        `;
    }

    document.getElementById('quiz-modal').classList.remove('hidden');
}

function validateAnswer(studentAnswer, elementClicked) {
    const qType = currentActiveQuestion.obj.type;
    const correctAns = currentActiveQuestion.obj.correctAnswer;
    const feedback = document.getElementById('quiz-feedback');
    
    let isCorrect = false;

    if (qType === 'mcq') {
        // studentAnswer is the index clicked
        isCorrect = (studentAnswer === correctAns);
        
        // Lock grid
        const grid = document.querySelector('.mcq-grid');
        Array.from(grid.children).forEach(b => b.style.pointerEvents = 'none');
        
        if (isCorrect) elementClicked.classList.add('correct');
        else {
            elementClicked.classList.add('wrong');
            grid.children[correctAns].classList.add('correct'); // Highlight actual correct answer
        }

    } else if (qType === 'identification') {
        // Compare lowercase trimmed strings
        isCorrect = studentAnswer.trim().toLowerCase() === correctAns.trim().toLowerCase();
        elementClicked.style.display = 'none'; // hide submit btn
    } else if (qType === 'essay') {
        // Any non-empty answer is accepted for points
        isCorrect = studentAnswer.trim().length > 0;
        elementClicked.style.display = 'none';
    }

    if (isCorrect) {
        currentScore += 10;
        document.getElementById('score-display').textContent = currentScore;
        
        const fxContainer = document.getElementById('fx-container');
        fxContainer.textContent = qType === 'essay' ? "✨ Great Job! ✨" : "🎉 Correct! 🎉";
        fxContainer.classList.remove('hidden');
        fxContainer.classList.add('animate-bounce');
        
        setTimeout(() => {
            fxContainer.classList.remove('hidden', 'animate-bounce');
            closeQuizAndResume();
        }, 1500);
    } else {
        feedback.textContent = qType === 'essay' ? "Please write something to continue." : "Oops! Try again next time.";
        feedback.classList.remove('hidden');
        if(qType !== 'essay') {
            setTimeout(closeQuizAndResume, 2500);
        } else {
             elementClicked.style.display = 'inline-block'; // Let them try essay again
        }
    }
}

function closeQuizAndResume() {
    answeredQuestions.add(currentActiveQuestion.index);
    document.getElementById('quiz-modal').classList.add('hidden');
    playVideo();
}

// Controls
document.getElementById('btn-play').addEventListener('click', playVideo);
document.getElementById('btn-pause').addEventListener('click', pauseVideo);
document.getElementById('btn-stop').addEventListener('click', stopVideo);
document.getElementById('btn-hint').addEventListener('click', () => {
    document.getElementById('quiz-hint').classList.remove('hidden');
});

// ==========================================
// 4. TEACHER DASHBOARD LOGIC
// ==========================================

document.getElementById('btn-teacher-login').addEventListener('click', () => {
    pauseVideo();
    document.getElementById('pin-modal').classList.remove('hidden');
});

document.getElementById('btn-cancel-pin').addEventListener('click', () => {
    document.getElementById('pin-modal').classList.add('hidden');
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-error').classList.add('hidden');
});

document.getElementById('btn-submit-pin').addEventListener('click', () => {
    const input = document.getElementById('pin-input').value;
    if (input === appData.pin) {
        document.getElementById('pin-modal').classList.add('hidden');
        document.getElementById('student-view').classList.add('hidden');
        document.getElementById('teacher-view').classList.remove('hidden');
        document.getElementById('pin-input').value = '';
        renderTeacherDashboard();
    } else {
        document.getElementById('pin-error').classList.remove('hidden');
    }
});

// Exit and Auto-Save
document.getElementById('btn-exit-teacher').addEventListener('click', () => {
    // Save Settings
    appData.pin = document.getElementById('t-pin').value || appData.pin;
    appData.videoType = document.getElementById('t-video-type').value;
    appData.videoSource = document.getElementById('t-video-source').value;
    appData.category = document.getElementById('t-category').value;
    appData.difficultyLevel = document.getElementById('t-difficulty').value;
    
    saveToLocalStorage(); // Write to browser memory
    
    document.getElementById('teacher-view').classList.add('hidden');
    document.getElementById('student-view').classList.remove('hidden');
    
    document.getElementById('app-title').textContent = `${appData.category} - ${appData.difficultyLevel}`;
    initVideoPlayer();
});

function renderTeacherDashboard() {
    document.getElementById('t-pin').value = appData.pin;
    document.getElementById('t-video-type').value = appData.videoType;
    document.getElementById('t-video-source').value = appData.videoSource;
    document.getElementById('t-category').value = appData.category;
    document.getElementById('t-difficulty').value = appData.difficultyLevel;

    const list = document.getElementById('questions-list');
    list.innerHTML = '';

    appData.questions.forEach((q, idx) => {
        const div = document.createElement('div');
        div.className = 'question-edit-box';
        
        let specificInputs = '';
        if (q.type === 'mcq') {
            specificInputs = `
                <div class="mt-10">
                    <label>Comma-separated Options (4 max):</label>
                    <input type="text" value="${q.options.join(',')}" onchange="updateQ(${idx}, 'options', this.value)">
                </div>
                <div class="mt-10">
                    <label>Correct Answer Index (0 = 1st, 1 = 2nd...):</label>
                    <input type="number" value="${q.correctAnswer}" min="0" max="3" onchange="updateQ(${idx}, 'correctAnswer', this.value)">
                </div>
            `;
        } else if (q.type === 'identification') {
            specificInputs = `
                <div class="mt-10">
                    <label>Correct Answer (Exact word/phrase):</label>
                    <input type="text" value="${q.correctAnswer}" onchange="updateQ(${idx}, 'correctAnswer', this.value)">
                </div>
            `;
        } else if (q.type === 'essay') {
            specificInputs = `<p class="mt-10" style="color:var(--text-light);font-size:0.9rem;">Essays do not require a correct answer input. Any student response awards points.</p>`;
        }

        div.innerHTML = `
            <div class="q-header">
                <h4>Question ${idx + 1}</h4>
                <button class="btn danger small" onclick="deleteQuestion(${idx})">Delete</button>
            </div>
            
            <div class="grid-2-col">
                <div>
                    <label>Question Type:</label>
                    <select onchange="changeQuestionType(${idx}, this.value)">
                        <option value="mcq" ${q.type === 'mcq' ? 'selected' : ''}>Multiple Choice (2x2)</option>
                        <option value="identification" ${q.type === 'identification' ? 'selected' : ''}>Identification (Short Answer)</option>
                        <option value="essay" ${q.type === 'essay' ? 'selected' : ''}>Essay (Paragraph)</option>
                    </select>
                </div>
                <div>
                    <label>Popup Timestamp (Seconds):</label>
                    <input type="number" value="${q.timestamp}" onchange="updateQ(${idx}, 'timestamp', this.value)">
                </div>
            </div>

            <div class="mt-10">
                <label>Question Prompt / Text:</label>
                <input type="text" value="${q.text}" onchange="updateQ(${idx}, 'text', this.value)">
            </div>
            
            ${specificInputs}

            <div class="mt-10">
                <label>Hint (Optional):</label>
                <input type="text" value="${q.hint}" onchange="updateQ(${idx}, 'hint', this.value)">
            </div>
        `;
        list.appendChild(div);
    });
}

// Teacher Data Handlers
window.updateQ = function(index, field, value) {
    if (field === 'options') appData.questions[index][field] = value.split(',').map(s => s.trim());
    else if (field === 'timestamp' || (field === 'correctAnswer' && appData.questions[index].type === 'mcq')) {
        appData.questions[index][field] = parseInt(value, 10) || 0;
    } 
    else appData.questions[index][field] = value;
    saveToLocalStorage();
};

window.changeQuestionType = function(index, newType) {
    const q = appData.questions[index];
    q.type = newType;
    if (newType === 'mcq') { q.options = ["Option 1", "Option 2", "Option 3", "Option 4"]; q.correctAnswer = 0; }
    else if (newType === 'identification') { q.correctAnswer = "Answer"; delete q.options; }
    else if (newType === 'essay') { q.correctAnswer = ""; delete q.options; }
    saveToLocalStorage();
    renderTeacherDashboard();
};

window.deleteQuestion = function(index) {
    appData.questions.splice(index, 1);
    saveToLocalStorage();
    renderTeacherDashboard();
};

document.getElementById('btn-add-question').addEventListener('click', () => {
    appData.questions.push({ type: "mcq", timestamp: 0, text: "New Question", options: ["A", "B", "C", "D"], correctAnswer: 0, hint: "" });
    saveToLocalStorage();
    renderTeacherDashboard();
});

// JSON Export/Import Backups
document.getElementById('btn-export-json').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const dl = document.getElementById('download-anchor');
    dl.setAttribute("href", dataStr); dl.setAttribute("download", "quiz-backup.json"); dl.click();
});

document.getElementById('import-json').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            appData = JSON.parse(e.target.result);
            saveToLocalStorage();
            alert("Backup imported successfully!");
            renderTeacherDashboard();
        } catch(err) { alert("Invalid backup file."); }
    };
    reader.readAsText(file);
});

// Init
window.onload = () => {
    document.getElementById('app-title').textContent = `${appData.category} - ${appData.difficultyLevel}`;
    if (appData.videoType === 'local') initVideoPlayer();
};
