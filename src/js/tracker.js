// ============================================================================
// TRACKER.JS - Repair tracking system functionality
// ============================================================================

// Sample repair data for demonstration
const sampleRepairs = {
    'MOO-2025-001': {
        id: 'MOO-2025-001',
        device: 'Dell XPS 13 (9300)',
        issue: 'Battery not charging',
        dropoffDate: '2025-01-20',
        estimatedDate: '2025-01-23',
        notificationPhone: '09123456789',
        notificationEmail: 'customer@example.com',
        currentStatus: 'ready', // received, diagnosed, parts-ordered, repair-progress, ready
        timeline: [
            { stage: 'Received', date: '2025-01-20 09:30 AM', status: 'completed', message: 'Device received and logged into system' },
            { stage: 'Diagnosed', date: '2025-01-20 10:15 AM', status: 'completed', message: 'Issue identified: Faulty battery and charger port' },
            { stage: 'Parts Ordered', date: '2025-01-20 11:00 AM', status: 'completed', message: 'Replacement battery ordered and expected arrival 01-22' },
            { stage: 'Repair in Progress', date: '2025-01-22 02:00 PM', status: 'completed', message: 'Battery replacement completed, charger port cleaned' },
            { stage: 'Ready for Pickup', date: '2025-01-23 11:00 AM', status: 'active', message: 'Device fully tested and ready for pickup!' }
        ]
    },
    'MOO-2025-002': {
        id: 'MOO-2025-002',
        device: 'HP Pavilion 15',
        issue: 'Screen flickering',
        dropoffDate: '2025-01-22',
        estimatedDate: '2025-01-25',
        notificationPhone: '09987654321',
        notificationEmail: 'user@example.com',
        currentStatus: 'repair-progress',
        timeline: [
            { stage: 'Received', date: '2025-01-22 03:00 PM', status: 'completed', message: 'Device received and initial inspection done' },
            { stage: 'Diagnosed', date: '2025-01-22 03:45 PM', status: 'completed', message: 'Issue identified: GPU driver conflict' },
            { stage: 'Parts Ordered', date: '2025-01-22 04:00 PM', status: 'completed', message: 'No parts needed - software fix required' },
            { stage: 'Repair in Progress', date: '2025-01-23 10:00 AM', status: 'active', message: 'Driver update and GPU settings optimization in progress' },
            { stage: 'Ready for Pickup', date: '2025-01-25', status: 'pending', message: 'Estimated completion' }
        ]
    },
    'MOO-2025-003': {
        id: 'MOO-2025-003',
        device: 'Lenovo ThinkPad E15',
        issue: 'SSD upgrade',
        dropoffDate: '2025-01-23',
        estimatedDate: '2025-01-23',
        notificationPhone: '09111222333',
        notificationEmail: 'admin@example.com',
        currentStatus: 'parts-ordered',
        timeline: [
            { stage: 'Received', date: '2025-01-23 08:00 AM', status: 'completed', message: 'Device received for SSD upgrade' },
            { stage: 'Diagnosed', date: '2025-01-23 08:15 AM', status: 'completed', message: 'Current SSD assessed: 256GB SSD found' },
            { stage: 'Parts Ordered', date: '2025-01-23 08:30 AM', status: 'active', message: 'Samsung 970 EVO Plus 512GB ordered - Express delivery' },
            { stage: 'Repair in Progress', date: '2025-01-23', status: 'pending', message: 'Expected after parts arrival' },
            { stage: 'Ready for Pickup', date: '2025-01-23', status: 'pending', message: 'Estimated completion (same day)' }
        ]
    },
    'MOO-2025-004': {
        id: 'MOO-2025-004',
        device: 'ASUS VivoBook 14',
        issue: 'Keyboard replacement',
        dropoffDate: '2025-01-23',
        estimatedDate: '2025-01-23',
        notificationPhone: '09444555666',
        notificationEmail: 'student@example.com',
        currentStatus: 'diagnosed',
        timeline: [
            { stage: 'Received', date: '2025-01-23 01:00 PM', status: 'completed', message: 'Device received - Quickie Moodeng service' },
            { stage: 'Diagnosed', date: '2025-01-23 01:30 PM', status: 'active', message: 'Keyboard malfunction confirmed - Ready for quick replacement' },
            { stage: 'Parts Ordered', date: '2025-01-23', status: 'pending', message: 'Keyboard available in stock' },
            { stage: 'Repair in Progress', date: '2025-01-23', status: 'pending', message: 'Will begin shortly' },
            { stage: 'Ready for Pickup', date: '2025-01-23 03:00 PM', status: 'pending', message: 'Estimated (30-60 min service)' }
        ]
    }
};

// ============================================================================
// TRACKING FORM SUBMISSION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const trackingForm = document.getElementById('trackingForm');
    if (trackingForm) {
        trackingForm.addEventListener('submit', handleTrackingSubmit);
    }
});

function handleTrackingSubmit(e) {
    e.preventDefault();
    
    const repairId = document.getElementById('repairId').value.trim().toUpperCase();
    
    // First check real tickets from database
    const realTicket = getTicketById(repairId);
    
    if (realTicket) {
        displayRepairStatus(realTicket);
        scrollToResults();
    } else if (sampleRepairs[repairId]) {
        // Fallback to sample data for demo
        displayRepairStatus(sampleRepairs[repairId]);
        scrollToResults();
    } else {
        // Check if it looks like a phone number
        if (isPhoneNumber(repairId)) {
            showNotification('Phone number search: Please use your Repair ID (e.g., MOO-2025-001)', 'info');
        } else {
            showNotification('Repair ID not found. Please check and try again.', 'error');
        }
    }
}

// ============================================================================
// DISPLAY REPAIR STATUS
// ============================================================================

function displayRepairStatus(repair) {
    const resultsSection = document.getElementById('trackerResults');
    
    // Populate repair information
    document.getElementById('repairIdDisplay').textContent = `Repair ID: ${repair.id}`;
    document.getElementById('deviceInfo').textContent = repair.device;
    document.getElementById('issueInfo').textContent = repair.issue;
    document.getElementById('dropoffDate').textContent = formatDate(repair.dropoffDate);
    document.getElementById('estimatedDate').textContent = formatDate(repair.estimatedDate);
    
    // Generate timeline
    generateTimeline(repair);
    
    // Show current status
    displayCurrentStatus(repair.currentStatus);
    
    // Show notifications preference
    displayNotificationPreference(repair);
    
    // Generate history log
    generateHistoryLog(repair);
    
    // Show results section
    resultsSection.style.display = 'block';
}

// ============================================================================
// GENERATE TIMELINE
// ============================================================================

function generateTimeline(repair) {
    const timelineContainer = document.getElementById('timelineStages');
    timelineContainer.innerHTML = '';
    
    const stages = ['received', 'diagnosed', 'parts-ordered', 'repair-progress', 'ready'];
    const stageLabels = ['Received', 'Diagnosed', 'Parts Ordered', 'Repair in Progress', 'Ready for Pickup'];
    
    let html = '<div class="timeline-stages">';
    
    stages.forEach((stage, index) => {
        const timeline = repair.timeline[index];
        let stageStatus = 'pending';
        
        if (stage === repair.currentStatus) {
            stageStatus = 'active';
        } else if (stages.indexOf(repair.currentStatus) > index) {
            stageStatus = 'completed';
        }
        
        html += `
            <div class="timeline-stage ${stageStatus}">
                <div class="timeline-stage-dot">${index + 1}</div>
                <div class="timeline-stage-label">${stageLabels[index]}</div>
                <div class="timeline-stage-date">${timeline ? new Date(timeline.date).toLocaleDateString() : 'Pending'}</div>
            </div>
        `;
        
        if (index < stages.length - 1) {
            html += '<div class="timeline-arrow">→</div>';
        }
    });
    
    html += '</div>';
    timelineContainer.innerHTML = html;
}

// ============================================================================
// DISPLAY CURRENT STATUS
// ============================================================================

function displayCurrentStatus(currentStatus) {
    const statusBox = document.getElementById('statusBox');
    
    const statusMessages = {
        'received': { message: '🚚 Your laptop has been received and is being inspected.', class: 'status-received' },
        'diagnosed': { message: '🔍 We\'ve identified the issue and are preparing the repair.', class: 'status-diagnosed' },
        'parts-ordered': { message: '📦 Parts have been ordered and are on the way.', class: 'status-parts-ordered' },
        'repair-progress': { message: '🔧 Your laptop is currently being repaired.', class: 'status-repair-progress' },
        'ready': { message: '✅ Your laptop is ready for pickup!', class: 'status-ready' }
    };
    
    const status = statusMessages[currentStatus] || statusMessages['received'];
    statusBox.innerHTML = status.message;
    statusBox.className = `status-box ${status.class}`;
}

// ============================================================================
// DISPLAY NOTIFICATION PREFERENCE
// ============================================================================

function displayNotificationPreference(repair) {
    const notificationPref = document.getElementById('notificationPref');
    notificationPref.innerHTML = `
        You'll receive updates via:<br>
        📱 SMS: ${repair.notificationPhone}<br>
        📧 Email: ${repair.notificationEmail}
    `;
}

// ============================================================================
// GENERATE HISTORY LOG
// ============================================================================

function generateHistoryLog(repair) {
    const historyLog = document.getElementById('historyLog');
    historyLog.innerHTML = '';
    
    // Show only completed and active updates
    const recentUpdates = repair.timeline.filter(item => 
        item.status === 'completed' || item.status === 'active'
    ).reverse();
    
    if (recentUpdates.length === 0) {
        historyLog.innerHTML = '<p style="color: #6b7280;">No updates yet. Your repair will be updated soon.</p>';
        return;
    }
    
    recentUpdates.forEach(update => {
        const historyHTML = `
            <div class="history-entry">
                <div class="history-entry-time">${new Date(update.date).toLocaleString()}</div>
                <div class="history-entry-message">${update.message}</div>
                <div class="history-entry-status">${update.stage}</div>
            </div>
        `;
        historyLog.innerHTML += historyHTML;
    });
}

// ============================================================================
// SCROLL TO RESULTS
// ============================================================================

function scrollToResults() {
    const resultsSection = document.getElementById('trackerResults');
    if (resultsSection) {
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// ============================================================================
// TRACK REPAIR FROM SAMPLE CARDS
// ============================================================================

function trackRepair(repairId) {
    document.getElementById('repairId').value = repairId;
    document.getElementById('trackingForm').dispatchEvent(new Event('submit'));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function isPhoneNumber(value) {
    // Check if it's a valid phone number pattern
    return /^\d{10,11}$/.test(value.replace(/\D/g, ''));
}

function formatStatus(status) {
    const statusMap = {
        'received': 'Received',
        'diagnosed': 'Diagnosed',
        'parts-ordered': 'Parts Ordered',
        'repair-progress': 'Repair in Progress',
        'ready': 'Ready for Pickup'
    };
    
    return statusMap[status] || status;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ============================================================================
// PAGE INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Add some sample tracking tips
    const tracker = document.querySelector('.tracker-form');
    if (tracker) {
        console.log('Tracker loaded. Sample IDs: MOO-2025-001, MOO-2025-002, MOO-2025-003, MOO-2025-004');
    }
    
    // Load recent tickets
    loadRecentTicketsOnTracker();
    
    // Check if ticket ID is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');
    
    if (ticketId) {
        document.getElementById('repairId').value = ticketId;
        document.getElementById('trackingForm').dispatchEvent(new Event('submit'));
    }
});

// ============================================================================
// LOAD RECENT TICKETS ON TRACKER PAGE
// ============================================================================

function loadRecentTicketsOnTracker() {
    const grid = document.getElementById('recentTicketsGrid');
    if (!grid) return;
    
    // Check if getAllTickets function exists (from ticket.js)
    if (typeof getAllTickets !== 'function') {
        grid.innerHTML = '<p style="text-align: center; color: #6b7280;">No recent tickets available.</p>';
        return;
    }
    
    const tickets = getAllTickets();
    
    if (tickets.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #6b7280;">No tickets created yet. Try the demo samples below!</p>';
        return;
    }
    
    // Sort by creation date (newest first) and take top 6
    const recentTickets = tickets
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6);
    
    let html = '';
    recentTickets.forEach(ticket => {
        const statusText = formatStatus(ticket.status);
        html += `
            <div class="sample-card" onclick="trackRepair('${ticket.id}')">
                <h4>${ticket.id}</h4>
                <p>${ticket.firstName} ${ticket.lastName}</p>
                <p class="status">Status: ${statusText}</p>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}
