const AppState = {
    activeTab: 'analyzer',
    theme: 'dark',
    apiKey: '',
    forceMockMode: true,
    uploadedFile: null,
    resumeData: null,
    jobDescription: '',
    matchData: null,
    chatMessages: [
        {
            role: 'assistant',
            content: 'Hello! I am your AI career assistant. Upload your resume or job description, and I can help you write tailored bullet points, critique your resume sections, or practice interview questions. How can I help you today?'
        }
    ]
};
// UI Selectors
const select = (id) => document.getElementById(id);
const selectAll = (selector) => document.querySelectorAll(selector);
// Safe LocalStorage Helper to prevent security restriction crashes (e.g. Incognito modes)
const safeLocalStorage = {
    getItem(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    setItem(key, value) {
        try { localStorage.setItem(key, value); } catch (e) {}
    },
    removeItem(key) {
        try { localStorage.removeItem(key); } catch (e) {}
    }
};
// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initSettings();
    initTheme();
    initTabs();
    initFileUpload();
    initJobMatcher();
    initChatAssistant();
});
// Load Settings from LocalStorage
function initSettings() {
    // Load Key
    const savedKey = safeLocalStorage.getItem('resu_gemini_api_key');
    if (savedKey) {
        AppState.apiKey = savedKey;
        select('api-key-input').value = savedKey;
    }
    
    // Load Mock Mode Toggle
    const savedMock = safeLocalStorage.getItem('resu_force_mock_mode');
    if (savedMock !== null) {
        AppState.forceMockMode = savedMock === 'true';
    } else {
        // Default to mock mode since no key is present initially
        AppState.forceMockMode = !AppState.apiKey;
    }
    
    select('mock-mode-toggle').checked = AppState.forceMockMode;
    updateStatusIndicator();
    // Event listener for mock toggle
    select('mock-mode-toggle').addEventListener('change', (e) => {
        AppState.forceMockMode = e.target.checked;
        safeLocalStorage.setItem('resu_force_mock_mode', AppState.forceMockMode);
        updateStatusIndicator();
    });
    // Save Key button
    select('save-key-btn').addEventListener('click', () => {
        const key = select('api-key-input').value.trim();
        if (key) {
            AppState.apiKey = key;
            safeLocalStorage.setItem('resu_gemini_api_key', key);
            
            // Turn off mock mode if a key is entered, unless they want mock mode
            AppState.forceMockMode = false;
            select('mock-mode-toggle').checked = false;
            safeLocalStorage.setItem('resu_force_mock_mode', 'false');
            
            updateStatusIndicator();
            alert('API Key saved successfully!');
        } else {
            alert('Please enter a valid API Key.');
        }
    });
    // Clear Key button
    select('clear-key-btn').addEventListener('click', () => {
        AppState.apiKey = '';
        safeLocalStorage.removeItem('resu_gemini_api_key');
        select('api-key-input').value = '';
        
        // Force mock mode if no key
        AppState.forceMockMode = true;
        select('mock-mode-toggle').checked = true;
        safeLocalStorage.setItem('resu_force_mock_mode', 'true');
        
        updateStatusIndicator();
        alert('API Key cleared.');
    });
}
function updateStatusIndicator() {
    const badge = select('api-status-badge');
    const label = badge.querySelector('.status-label');
    
    if (AppState.forceMockMode) {
        badge.className = 'status-indicator warning';
        label.textContent = 'Mock Mode Active';
    } else if (AppState.apiKey) {
        badge.className = 'status-indicator live';
        label.textContent = 'API Key Loaded';
    } else {
        badge.className = 'status-indicator error';
        label.textContent = 'API Key Required';
    }
    
    // Update Chat status items too
    updateChatContextBadges();
}
// Theme handling (Dark/Light)
function initTheme() {
    const savedTheme = safeLocalStorage.getItem('resu_theme');
    if (savedTheme) {
        AppState.theme = savedTheme;
    }
    
    document.body.className = AppState.theme + '-theme';
    updateThemeButtonUI();
    select('theme-toggle').addEventListener('click', () => {
        AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
        document.body.className = AppState.theme + '-theme';
        safeLocalStorage.setItem('resu_theme', AppState.theme);
        updateThemeButtonUI();
    });
}
function updateThemeButtonUI() {
    const btn = select('theme-toggle');
    if (AppState.theme === 'dark') {
        btn.innerHTML = '<i class="fa-solid fa-sun"></i> <span>Light Mode</span>';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-moon"></i> <span>Dark Mode</span>';
    }
}
// Tab Switching Routing
function initTabs() {
    const navButtons = selectAll('.nav-btn');
    const tabPanes = selectAll('.tab-pane');
    
    const titles = {
        analyzer: { title: 'Resume Analyzer', sub: 'Upload and parse your resume for career insights' },
        matcher: { title: 'Job Matcher', sub: 'Compare your skills against role specifications' },
        assistant: { title: 'AI Assistant', sub: 'Interact with your personal AI career advisor' },
        settings: { title: 'Settings', sub: 'Configure API connections and application preferences' }
    };
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            AppState.activeTab = targetTab;
            
            // Toggle active classes on nav
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle active classes on pane
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add('active');
                }
            });
            // Update title headers
            select('page-title').textContent = titles[targetTab].title;
            select('page-subtitle').textContent = titles[targetTab].sub;
        });
    });
}
// ==========================================
// FILE UPLOAD AND PARSING
// ==========================================
function initFileUpload() {
    const dropZone = select('drop-zone');
    const fileInput = select('file-input');
    const fileDetails = select('file-details');
    const parseBtn = select('parse-btn');
    const removeFileBtn = select('remove-file-btn');
    const uploadProgress = select('uploading-progress');
    // Drag events
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
    function handleFileSelection(file) {
        // Validate format
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx', 'txt', 'json'].includes(ext)) {
            alert('Invalid file format. Please upload PDF, DOCX, or TXT.');
            return;
        }
        
        AppState.uploadedFile = file;
        
        // Show file details UI
        select('filename-label').textContent = file.name;
        select('filesize-label').textContent = formatBytes(file.size);
        
        // Update file icon based on extension
        const icon = select('file-icon');
        icon.className = 'file-type-icon fa-solid ';
        if (ext === 'pdf') icon.classList.add('fa-file-pdf');
        else if (ext === 'docx') icon.classList.add('fa-file-word');
        else icon.classList.add('fa-file-lines');
        
        dropZone.style.display = 'none';
        fileDetails.style.display = 'flex';
    }
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileUploadUI();
    });
    function resetFileUploadUI() {
        AppState.uploadedFile = null;
        fileInput.value = '';
        fileDetails.style.display = 'none';
        dropZone.style.display = 'block';
    }
    parseBtn.addEventListener('click', async () => {
        if (!AppState.uploadedFile) return;
        
        // Show progress spinner
        fileDetails.style.display = 'none';
        uploadProgress.style.display = 'flex';
        select('upload-progress-fill').style.width = '30%';
        const formData = new FormData();
        formData.append('file', AppState.uploadedFile);
        
        const headers = {};
        if (!AppState.forceMockMode && AppState.apiKey) {
            headers['X-API-Key'] = AppState.apiKey;
        } else {
            headers['X-API-Key'] = 'null';
        }
        try {
            select('upload-progress-fill').style.width = '60%';
            
            const response = await fetch('/api/parse', {
                method: 'POST',
                headers: headers,
                body: formData
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to parse resume');
            }
            select('upload-progress-fill').style.width = '100%';
            const data = await response.json();
            
            setTimeout(() => {
                uploadProgress.style.display = 'none';
                renderResumeDashboard(data);
            }, 300);
        } catch (error) {
            console.error(error);
            alert(`Error parsing resume: ${error.message}`);
            uploadProgress.style.display = 'none';
            fileDetails.style.display = 'flex';
        }
    });
}
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
// RENDER RESUME DASHBOARD RESULTS
function renderResumeDashboard(data) {
    AppState.resumeData = data;
    
    // Hide placeholder
    select('analysis-results-placeholder').style.display = 'none';
    
    // Show real results
    const dashboard = select('analysis-dashboard');
    dashboard.style.display = 'flex';
    
    // Fill profile basics
    select('cand-name').textContent = data.name || 'Candidate Name';
    select('user-name-header').textContent = data.name || 'Guest User';
    select('user-status-header').textContent = data.work_experience && data.work_experience[0] ? data.work_experience[0].role : 'Resume Loaded';
    
    // Header avatar letter
    const avatar = select('user-avatar');
    if (data.name) avatar.textContent = data.name.charAt(0);
    
    // Contact Info Row
    const contactsWrap = select('cand-contacts');
    contactsWrap.innerHTML = '';
    const contact = data.contact || {};
    
    if (contact.email) {
        contactsWrap.innerHTML += `<a href="mailto:${contact.email}"><i class="fa-solid fa-envelope"></i> ${contact.email}</a>`;
    }
    if (contact.phone) {
        contactsWrap.innerHTML += `<a href="tel:${contact.phone}"><i class="fa-solid fa-phone"></i> ${contact.phone}</a>`;
    }
    if (contact.linkedin) {
        // clean protocol if missing
        const href = contact.linkedin.includes('http') ? contact.linkedin : `https://${contact.linkedin}`;
        contactsWrap.innerHTML += `<a href="${href}" target="_blank"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>`;
    }
    if (contact.website) {
        const href = contact.website.includes('http') ? contact.website : `https://${contact.website}`;
        contactsWrap.innerHTML += `<a href="${href}" target="_blank"><i class="fa-solid fa-globe"></i> Portfolio</a>`;
    }
    // Professional Summary
    select('cand-summary').textContent = data.professional_summary || 'No professional summary extracted.';
    // Strength score animation
    const strength = calculateResumeStrengthScore(data);
    select('strength-score').textContent = `${strength}%`;
    const circle = select('strength-circle');
    
    // Circumference of our circle is ~100 (2 * pi * r) where r = 15.9155
    circle.style.strokeDasharray = `${strength}, 100`;
    // Skills
    renderSkillsCloud('tags-technical', data.skills?.technical || []);
    renderSkillsCloud('tags-tools', data.skills?.tools || []);
    renderSkillsCloud('tags-soft', data.skills?.soft || []);
    // Timeline work experience
    const timeline = select('experience-timeline');
    timeline.innerHTML = '';
    
    if (data.work_experience && data.work_experience.length > 0) {
        data.work_experience.forEach(exp => {
            const bulletsHtml = exp.description_bullets?.map(bullet => `<li>${bullet}</li>`).join('') || '';
            const end = exp.end_date || 'Present';
            const duration = exp.start_date ? `${exp.start_date} - ${end}` : '';
            
            timeline.innerHTML += `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-role">${exp.role || 'Software Engineer'}</span>
                            <span class="timeline-duration">${duration}</span>
                        </div>
                        <span class="timeline-company">${exp.company || 'Tech Company'}</span>
                        <ul class="timeline-bullets">
                            ${bulletsHtml}
                        </ul>
                    </div>
                </div>
            `;
        });
    } else {
        timeline.innerHTML = '<p class="text-muted">No experience history parsed.</p>';
    }
    // Projects Showcase
    const projContainer = select('projects-container');
    projContainer.innerHTML = '';
    
    if (data.projects && data.projects.length > 0) {
        data.projects.forEach(proj => {
            const techMiniTags = proj.technologies?.map(tech => `<span class="tech-mini-tag">${tech}</span>`).join('') || '';
            
            projContainer.innerHTML += `
                <div class="project-item">
                    <span class="project-title">${proj.name}</span>
                    <div class="project-tech">
                        ${techMiniTags}
                    </div>
                    <p class="project-desc">${proj.description || ''}</p>
                </div>
            `;
        });
    } else {
        projContainer.innerHTML = '<p class="text-muted">No projects provided.</p>';
    }
    // Education & Certifications
    const eduContainer = select('education-container');
    eduContainer.innerHTML = '';
    if (data.education && data.education.length > 0) {
        data.education.forEach(edu => {
            const gpaStr = edu.gpa ? ` | GPA: ${edu.gpa}` : '';
            const grad = edu.graduation_date ? `Graduated: ${edu.graduation_date}` : '';
            eduContainer.innerHTML += `
                <div class="education-item">
                    <span class="edu-degree">${edu.degree || 'B.S. Computer Science'}</span>
                    <div class="edu-meta">
                        <span>${edu.institution || 'University'}</span>
                        <span>${grad}${gpaStr}</span>
                    </div>
                </div>
            `;
        });
    } else {
        eduContainer.innerHTML = '<p class="text-muted">No education details found.</p>';
    }
    // Certifications
    const certsContainer = select('certs-container');
    certsContainer.innerHTML = '';
    if (data.certifications && data.certifications.length > 0) {
        data.certifications.forEach(cert => {
            const dateStr = cert.date ? ` (${cert.date})` : '';
            certsContainer.innerHTML += `
                <div class="cert-item">
                    <span class="cert-name">${cert.name}</span>
                    <span class="text-muted text-xs block">${cert.issuing_organization || 'Issuer'}${dateStr}</span>
                </div>
            `;
        });
    } else {
        certsContainer.innerHTML = '<p class="text-muted">No certifications recorded.</p>';
    }
    // Update context state
    updateChatContextBadges();
}
function calculateResumeStrengthScore(data) {
    let score = 30; // base score for uploading
    if (data.name && data.name !== 'Jane Doe') score += 5;
    if (data.contact?.email) score += 5;
    if (data.contact?.linkedin) score += 5;
    if (data.professional_summary && data.professional_summary.length > 40) score += 10;
    
    // Skills check
    const skills = data.skills || {};
    const skillCount = (skills.technical?.length || 0) + (skills.tools?.length || 0);
    if (skillCount > 3) score += Math.min(15, skillCount * 1.5);
    
    // Work experience
    if (data.work_experience && data.work_experience.length > 0) {
        score += Math.min(25, data.work_experience.length * 10);
    }
    
    // Projects
    if (data.projects && data.projects.length > 0) {
        score += Math.min(10, data.projects.length * 5);
    }
    
    return Math.min(100, Math.round(score));
}
function renderSkillsCloud(containerId, skillsList) {
    const wrap = select(containerId);
    wrap.innerHTML = '';
    if (skillsList.length > 0) {
        skillsList.forEach(skill => {
            wrap.innerHTML += `<span class="tag">${skill}</span>`;
        });
    } else {
        wrap.innerHTML = '<span class="text-muted text-xs">None listed</span>';
    }
}
// ==========================================
// JOB DESCRIPTION COMPATIBILITY MATCHER
// ==========================================
function initJobMatcher() {
    const matchBtn = select('match-btn');
    const jdTextarea = select('jd-textarea');
    const clearJdBtn = select('clear-jd-btn');
    const resultsPlaceholder = select('match-results-placeholder');
    const matchDashboard = select('match-dashboard');
    clearJdBtn.addEventListener('click', () => {
        jdTextarea.value = '';
        AppState.jobDescription = '';
        matchDashboard.style.display = 'none';
        resultsPlaceholder.style.display = 'flex';
        updateChatContextBadges();
    });
    matchBtn.addEventListener('click', async () => {
        const jd = jdTextarea.value.trim();
        if (!jd) {
            alert('Please paste a job description first.');
            return;
        }
        
        if (!AppState.resumeData) {
            alert('Please upload and parse your resume in the Resume Analyzer tab before running the match test.');
            return;
        }
        AppState.jobDescription = jd;
        
        // Show loader state inside button
        matchBtn.disabled = true;
        matchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Job Context...';
        const headers = { 'Content-Type': 'application/json' };
        if (!AppState.forceMockMode && AppState.apiKey) {
            headers['X-API-Key'] = AppState.apiKey;
        } else {
            headers['X-API-Key'] = 'null';
        }
        try {
            const response = await fetch('/api/match', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    resume_data: AppState.resumeData,
                    job_description: jd
                })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to match resume');
            }
            const data = await response.json();
            renderMatchResults(data);
        } catch (error) {
            console.error(error);
            alert(`Matching failed: ${error.message}`);
        } finally {
            matchBtn.disabled = false;
            matchBtn.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Calculate Compatibility';
        }
    });
}
function renderMatchResults(data) {
    AppState.matchData = data;
    
    // Hide placeholder
    select('match-results-placeholder').style.display = 'none';
    
    // Show match dashboard
    const dashboard = select('match-dashboard');
    dashboard.style.display = 'flex';
    // Animating match score circular progress
    const score = data.match_score || 0;
    select('match-score-text').textContent = `${score}%`;
    select('match-circle').style.strokeDasharray = `${score}, 100`;
    // Match Verdict
    let verdict = 'Poor Match';
    let verdictClass = 'text-danger';
    if (score >= 80) {
        verdict = 'Excellent Match!';
        verdictClass = 'text-success';
    } else if (score >= 60) {
        verdict = 'Good Alignment';
        verdictClass = 'text-warning';
    }
    
    const verdictEl = select('match-verdict');
    verdictEl.textContent = verdict;
    verdictEl.className = `spacing-top ${verdictClass}`;
    // Matching vs Missing Skills
    const matchingContainer = select('match-matching-skills');
    const missingContainer = select('match-missing-skills');
    
    matchingContainer.innerHTML = '';
    missingContainer.innerHTML = '';
    
    const matchingList = data.skills_analysis?.matching_skills || [];
    const missingList = data.skills_analysis?.missing_skills || [];
    
    if (matchingList.length > 0) {
        matchingList.forEach(s => {
            matchingContainer.innerHTML += `<li><i class="fa-solid fa-circle-check text-success"></i> ${s}</li>`;
        });
    } else {
        matchingContainer.innerHTML = '<li><span class="text-muted">None matched</span></li>';
    }
    
    if (missingList.length > 0) {
        missingList.forEach(s => {
            missingContainer.innerHTML += `<li><i class="fa-solid fa-triangle-exclamation text-danger"></i> ${s}</li>`;
        });
    } else {
        missingContainer.innerHTML = '<li><span class="text-muted">No missing core keywords!</span></li>';
    }
    // Keyword Density Progress Bars
    const kwContainer = select('keyword-container');
    kwContainer.innerHTML = '';
    
    const kwAnalysis = data.keyword_analysis || [];
    if (kwAnalysis.length > 0) {
        kwAnalysis.forEach(kw => {
            const percentage = kw.relevance_score * 10;
            const statusClass = kw.status === 'found' ? 'found' : 'missing';
            const statusLabel = kw.status === 'found' ? 'Found' : 'Missing';
            
            kwContainer.innerHTML += `
                <div class="keyword-progress-item">
                    <div class="keyword-progress-header">
                        <span class="kw-name">${kw.keyword}</span>
                        <span class="kw-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="keyword-progress-track">
                        <div class="keyword-progress-fill ${statusClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });
    } else {
        kwContainer.innerHTML = '<p class="text-muted">No keyword density records analyzed.</p>';
    }
    // Optimization ATS suggestions
    const feedbackList = select('match-feedback');
    feedbackList.innerHTML = '';
    
    const feedback = data.resume_feedback || [];
    if (feedback.length > 0) {
        feedback.forEach(point => {
            feedbackList.innerHTML += `<li>${point}</li>`;
        });
    } else {
        feedbackList.innerHTML = '<li><span class="text-muted">No warnings found, you have standard optimization patterns.</span></li>';
    }
    // Tailoring improvements box
    const tailor = data.tailored_suggestions || {};
    select('tailor-summary-box').innerHTML = formatMarkdownText(tailor.summary || 'Summary tailoring advice not available.');
    
    // Tailored bullet points
    const expBox = select('tailor-exp-box');
    expBox.innerHTML = '';
    const expSuggestions = tailor.experience || [];
    if (expSuggestions.length > 0) {
        expSuggestions.forEach(bullet => {
            expBox.innerHTML += `<p class="spacing-bottom-sm"><i class="fa-solid fa-plus text-success"></i> ${bullet}</p>`;
        });
    } else {
        expBox.innerHTML = '<p class="text-muted">No experience suggestions generated.</p>';
    }
    
    // Projects Suggestions
    const projBox = select('tailor-proj-box');
    projBox.innerHTML = '';
    const projSuggestions = tailor.projects || [];
    if (projSuggestions.length > 0) {
        projSuggestions.forEach(p => {
            projBox.innerHTML += `<p><i class="fa-solid fa-lightbulb text-warning"></i> ${p}</p>`;
        });
    } else {
        projBox.innerHTML = '<p class="text-muted">No project tailoring generated.</p>';
    }
    // Update Context
    updateChatContextBadges();
}
// ==========================================
// AI CAREER CHAT ASSISTANT
// ==========================================
function initChatAssistant() {
    const chatSendBtn = select('chat-send-btn');
    const chatInput = select('chat-input');
    const clearChatBtn = select('clear-chat-btn');
    const quickPrompts = selectAll('.quick-prompt-btn');
    // Send on click
    chatSendBtn.addEventListener('click', handleChatSubmit);
    
    // Send on Enter (Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSubmit();
        }
    });
    // Clear Chat history
    clearChatBtn.addEventListener('click', () => {
        if (confirm('Clear the active chat history?')) {
            AppState.chatMessages = [
                {
                    role: 'assistant',
                    content: 'Hi! Let me know how I can help you tailor your resume, optimize keywords, or answer career queries.'
                }
            ];
            renderChatHistory();
        }
    });
    // Quick Prompts click listener
    quickPrompts.forEach(btn => {
        btn.addEventListener('click', () => {
            const promptText = btn.getAttribute('data-prompt');
            chatInput.value = promptText;
            chatInput.focus();
            
            // Auto send
            handleChatSubmit();
        });
    });
}
function updateChatContextBadges() {
    const resumeContext = select('context-resume');
    const jdContext = select('context-jd');
    
    if (AppState.resumeData) {
        resumeContext.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> <span>Resume: <strong class="text-success">Loaded</strong></span>`;
    } else {
        resumeContext.innerHTML = `<i class="fa-solid fa-circle-xmark text-danger"></i> <span>Resume: <strong>Not Loaded</strong></span>`;
    }
    
    if (AppState.jobDescription) {
        jdContext.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> <span>Job Desc: <strong class="text-success">Linked</strong></span>`;
    } else {
        jdContext.innerHTML = `<i class="fa-solid fa-circle-xmark text-danger"></i> <span>Job Desc: <strong>Not Linked</strong></span>`;
    }
}
async function handleChatSubmit() {
    const chatInput = select('chat-input');
    const query = chatInput.value.trim();
    if (!query) return;
    // Clear Input
    chatInput.value = '';
    // Add User Message
    AppState.chatMessages.push({ role: 'user', content: query });
    renderChatHistory();
    scrollChatToBottom();
    // Show Bot Typing Indicator
    showChatTypingIndicator();
    const headers = { 'Content-Type': 'application/json' };
    if (!AppState.forceMockMode && AppState.apiKey) {
        headers['X-API-Key'] = AppState.apiKey;
    } else {
        headers['X-API-Key'] = 'null';
    }
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                messages: AppState.chatMessages,
                resume_data: AppState.resumeData,
                job_description: AppState.jobDescription
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Chat query failed');
        }
        const data = await response.json();
        removeChatTypingIndicator();
        
        // Add Assistant Message
        AppState.chatMessages.push({ role: 'assistant', content: data.reply });
        renderChatHistory();
        scrollChatToBottom();
    } catch (error) {
        console.error(error);
        removeChatTypingIndicator();
        AppState.chatMessages.push({
            role: 'assistant',
            content: `Failed to fetch response: ${error.message}. Please verify your API Key and network status.`
        });
        renderChatHistory();
        scrollChatToBottom();
    }
}
function renderChatHistory() {
    const chatContainer = select('chat-messages-container');
    chatContainer.innerHTML = '';
    AppState.chatMessages.forEach(msg => {
        const isBot = msg.role === 'assistant';
        const avatarIcon = isBot ? 'fa-robot' : 'fa-user';
        const msgClass = isBot ? 'bot' : 'user';
        
        const contentFormatted = formatMarkdownText(msg.content);
        chatContainer.innerHTML += `
            <div class="chat-msg ${msgClass}">
                <div class="msg-avatar">
                    <i class="fa-solid ${avatarIcon}"></i>
                </div>
                <div class="msg-content">
                    ${contentFormatted}
                </div>
            </div>
        `;
    });
}
function showChatTypingIndicator() {
    const chatContainer = select('chat-messages-container');
    
    // Prevent double rendering
    if (select('typing-indicator-wrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'typing-indicator-wrap';
    wrap.className = 'chat-msg bot';
    wrap.innerHTML = `
        <div class="msg-avatar">
            <i class="fa-solid fa-robot"></i>
        </div>
        <div class="msg-content">
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;
    chatContainer.appendChild(wrap);
    scrollChatToBottom();
}
function removeChatTypingIndicator() {
    const indicator = select('typing-indicator-wrap');
    if (indicator) indicator.remove();
}
function scrollChatToBottom() {
    const chatContainer = select('chat-messages-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
// Simple Markdown Text Formatter
function formatMarkdownText(text) {
    if (!text) return '';
    
    // Safety Escape HTML
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code blocks: ``` ... ```
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code: `code`
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Bullet Lists: Line starting with * or -
    html = html.replace(/^\s*[\*\-]\s+(.*)$/gm, '<li>$1</li>');
    // Group bullets into list block tags
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Linebreaks
    html = html.replace(/\n/g, '<br>');
    
    // Cleanup double breaks inside list blocks if any
    html = html.replace(/<\/li><br><li>/g, '</li><li>');
    html = html.replace(/<ul><br><li>/g, '<ul><li>');
    html = html.replace(/<\/li><br><\/ul>/g, '</li></ul>');
    return html;
}
