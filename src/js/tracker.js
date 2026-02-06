// ============================================================================
// TRACKER.JS - Repair tracking system functionality
// ============================================================================

// ============================================================================
// TRACKING FORM SUBMISSION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const trackingForm = document.getElementById('trackingForm');
    if (trackingForm) {
        trackingForm.addEventListener('submit', handleTrackingSubmit);
    }
});

async function handleTrackingSubmit(e) {
    e.preventDefault();
    
    const searchValue = document.getElementById('repairId').value.trim();
    
    // Check if input looks like a phone number
    if (isPhoneNumber(searchValue)) {
        // Search by phone number
        await searchByPhone(searchValue);
    } else {
        // Search by repair ID
        await searchByRepairId(searchValue.toUpperCase());
    }
}

// Search by phone number
async function searchByPhone(phone) {
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Get access token if user is logged in
        const sessionData = localStorage.getItem('userSession');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                if (session.accessToken) {
                    headers['Authorization'] = `Bearer ${session.accessToken}`;
                }
            } catch (e) {
                console.error('Error parsing session:', e);
            }
        }
        
        // Normalize phone number
        const normalizedPhone = phone.replace(/\D/g, '');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/tickets/search/phone/${normalizedPhone}`, {
            method: 'GET',
            headers: headers
        });
        const data = await response.json();
        
        if (response.ok && data.data && data.data.length > 0) {
            // Display phone search results
            displayPhoneSearchResults(data.data);
            scrollToResults();
            return;
        } else {
            showNotification(data.message || 'No tickets found for this phone number.', 'error');
        }
    } catch (error) {
        console.error('Phone search failed:', error);
        showNotification('Unable to search by phone number. Please try your Repair ID instead.', 'error');
    }
}

// Search by repair ID
async function searchByRepairId(repairId) {
    // First check local storage for tickets
    const localTicket = typeof getTicketById === 'function' ? getTicketById(repairId) : null;
    
    if (localTicket) {
        // For local tickets, check if user is logged in and phone matches
        const session = typeof getUserSession === 'function' ? getUserSession() : null;
        let canViewSensitiveData = false;
        
        if (session) {
            // Admin and Technician can always see all data
            if (['ADMIN', 'TECHNICIAN'].includes(session.role?.toUpperCase())) {
                canViewSensitiveData = true;
            } else {
                // Customer can see data if their phone matches
                const userPhone = session.phone?.replace(/\D/g, '') || '';
                const ticketPhone = (localTicket.customerPhone || localTicket.notificationPhone || '').replace(/\D/g, '');
                canViewSensitiveData = userPhone && ticketPhone && userPhone === ticketPhone;
            }
        }
        
        localTicket.canViewSensitiveData = canViewSensitiveData;
        displayRepairStatus(localTicket);
        scrollToResults();
        return;
    }
    
    // Try to fetch from API
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Get access token from userSession if available
        const sessionData = localStorage.getItem('userSession');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                if (session.accessToken) {
                    headers['Authorization'] = `Bearer ${session.accessToken}`;
                }
            } catch (e) {
                console.error('Error parsing session:', e);
            }
        }
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TICKET_TRACK}/${repairId}`, {
            method: 'GET',
            headers: headers
        });
        const data = await response.json();
        
        if (response.ok && data.data) {
            // Transform API response to match expected format
            const apiTicket = transformApiTicket(data.data);
            displayRepairStatus(apiTicket);
            scrollToResults();
            return;
        } else {
            showNotification(data.message || 'Repair ID not found. Please check and try again.', 'error');
        }
    } catch (error) {
        console.error('API fetch failed:', error);
        showNotification('Unable to track repair. Please check your Repair ID and try again.', 'error');
    }
}

// Store original results HTML for restoration
let originalResultsHTML = null;

// Display phone search results as a list of clickable tickets
function displayPhoneSearchResults(tickets) {
    const resultsSection = document.getElementById('trackerResults');
    
    // Store original HTML if not already stored
    if (!originalResultsHTML) {
        originalResultsHTML = resultsSection.innerHTML;
    }
    
    // Create phone search results HTML
    let html = `
        <div class="result-card">
            <div class="result-header">
                <h2>Found ${tickets.length} Ticket${tickets.length > 1 ? 's' : ''}</h2>
                <a href="tracker.html" class="btn btn-secondary">Search Another</a>
            </div>
            <p style="color: #6b7280; margin-bottom: 1.5rem;">Click on a ticket to view its full details</p>
            <div class="phone-search-results">
    `;
    
    tickets.forEach(ticket => {
        const statusClass = getStatusClass(ticket.status);
        const statusText = formatStatusText(ticket.status);
        const device = ticket.deviceBrand && ticket.deviceModel 
            ? (ticket.deviceModel.toLowerCase().startsWith(ticket.deviceBrand.toLowerCase()) ? ticket.deviceModel : `${ticket.deviceBrand} ${ticket.deviceModel}`) 
            : 'Unknown Device';
        const date = formatDate(ticket.createdAt);
        
        html += `
            <div class="phone-result-card ${statusClass}" onclick="viewTicketDetails('${ticket.ticketNumber}')">
                <div class="phone-result-header">
                    <h3>${ticket.ticketNumber}</h3>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="phone-result-details">
                    <p><strong>Device:</strong> ${device}</p>
                    <p><strong>Drop-off:</strong> ${date}</p>
                    ${ticket.technicianName ? `<p><strong>Technician:</strong> ${ticket.technicianName}</p>` : ''}
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    resultsSection.innerHTML = `<div class="container">${html}</div>`;
    resultsSection.style.display = 'block';
}

// View ticket details - restores original HTML structure first
async function viewTicketDetails(ticketNumber) {
    const resultsSection = document.getElementById('trackerResults');
    
    // Restore original HTML structure
    if (originalResultsHTML) {
        resultsSection.innerHTML = originalResultsHTML;
    }
    
    // Now search for the ticket
    document.getElementById('repairId').value = ticketNumber;
    await searchByRepairId(ticketNumber);
}

// Helper functions for phone search results
function getStatusClass(status) {
    const normalizedStatus = (status || 'received').toLowerCase().replace(/_/g, '-');
    const statusClasses = {
        'received': 'status-received',
        'diagnosed': 'status-diagnosed',
        'parts-ordered': 'status-parts-ordered',
        'waiting-parts': 'status-parts-ordered',
        'repair-progress': 'status-repair-progress',
        'in-progress': 'status-repair-progress',
        'ready': 'status-ready',
        'completed': 'status-completed',
        'returned': 'status-returned',
        'cancelled': 'status-cancelled'
    };
    return statusClasses[normalizedStatus] || 'status-received';
}

function formatStatusText(status) {
    const normalizedStatus = (status || 'received').toLowerCase().replace(/_/g, '-');
    const statusTexts = {
        'received': 'Received',
        'diagnosed': 'Diagnosed',
        'parts-ordered': 'Parts Ordered',
        'waiting-parts': 'Waiting for Parts',
        'repair-progress': 'In Progress',
        'in-progress': 'In Progress',
        'ready': 'Ready for Pickup',
        'completed': 'Completed',
        'returned': 'Returned (Back Job)',
        'cancelled': 'Cancelled'
    };
    return statusTexts[normalizedStatus] || 'Received';
}

// Transform API ticket to tracker format
function transformApiTicket(ticket) {
    return {
        id: ticket.ticketNumber || ticket.id,
        device: ticket.deviceBrand && ticket.deviceModel 
            ? (ticket.deviceModel.toLowerCase().startsWith(ticket.deviceBrand.toLowerCase()) ? ticket.deviceModel : `${ticket.deviceBrand} ${ticket.deviceModel}`) 
            : ticket.device || 'Unknown Device',
        issue: ticket.issueDescription || ticket.issue || 'N/A',
        dropoffDate: ticket.createdAt,
        estimatedDate: ticket.estimatedCompletion,
        currentStatus: ticket.status,
        status: ticket.status,
        notificationPhone: ticket.customerPhone,
        notificationEmail: ticket.customerEmail,
        technicianName: ticket.technicianName || null,
        timeline: ticket.timeline || [],
        photos: ticket.photos || [],
        history: ticket.history || [],
        // Include flag for sensitive data access
        canViewSensitiveData: ticket.canViewSensitiveData || false
    };
}

// ============================================================================
// DISPLAY REPAIR STATUS
// ============================================================================

function displayRepairStatus(repair) {
    const resultsSection = document.getElementById('trackerResults');
    
    // Populate repair information
    document.getElementById('repairIdDisplay').textContent = `Repair ID: ${repair.id}`;
    document.getElementById('deviceInfo').textContent = repair.device || `${repair.deviceBrand || ''} ${repair.deviceModel || ''}`.trim() || 'N/A';
    document.getElementById('issueInfo').textContent = repair.issue || repair.issueDescription || 'N/A';
    document.getElementById('dropoffDate').textContent = formatDate(repair.dropoffDate || repair.createdAt);
    
    // For estimated completion, calculate based on status if not set
    let estimatedDate = repair.estimatedDate || repair.estimatedCompletion;
    if (!estimatedDate) {
        // Auto-calculate based on drop-off date and status
        const dropoff = new Date(repair.dropoffDate || repair.createdAt);
        const status = (repair.currentStatus || repair.status || '').toLowerCase().replace(/_/g, '-');
        let daysToAdd = 3; // Default 3 days
        
        if (status === 'ready' || status === 'completed') {
            estimatedDate = 'Completed';
        } else if (status === 'waiting-parts' || status === 'parts-ordered') {
            daysToAdd = 5; // Parts usually take longer
            dropoff.setDate(dropoff.getDate() + daysToAdd);
            estimatedDate = dropoff.toISOString();
        } else {
            dropoff.setDate(dropoff.getDate() + daysToAdd);
            estimatedDate = dropoff.toISOString();
        }
    }
    document.getElementById('estimatedDate').textContent = estimatedDate === 'Completed' ? 'Completed' : formatDate(estimatedDate);
    
    // Display technician info
    const technicianElement = document.getElementById('technicianInfo');
    if (technicianElement) {
        technicianElement.textContent = repair.technicianName || 'Not yet assigned';
    }
    
    // Generate timeline
    generateTimeline(repair);
    
    // Show current status
    displayCurrentStatus(repair.currentStatus || repair.status);
    
    // Show notifications preference
    displayNotificationPreference(repair);
    
    // Display photos if available
    displayPhotos(repair);
    
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
    
    // Stage definitions with all possible status values that map to each stage
    const stages = [
        { key: 'received', label: 'Received', aliases: ['received', 'RECEIVED'] },
        { key: 'diagnosed', label: 'Diagnosed', aliases: ['diagnosed', 'DIAGNOSED'] },
        { key: 'parts-ordered', label: 'Parts Ordered', aliases: ['parts-ordered', 'WAITING_PARTS', 'waiting_parts'] },
        { key: 'repair-progress', label: 'Repair in Progress', aliases: ['repair-progress', 'IN_PROGRESS', 'in_progress'] },
        { key: 'ready', label: 'Ready for Pickup', aliases: ['ready', 'READY', 'COMPLETED', 'completed'] }
    ];
    
    // Normalize the current status to find its index
    const currentStatus = (repair.currentStatus || repair.status || '').toLowerCase().replace(/_/g, '-');
    let currentStageIndex = -1;
    
    stages.forEach((stage, index) => {
        const normalizedAliases = stage.aliases.map(a => a.toLowerCase().replace(/_/g, '-'));
        if (normalizedAliases.includes(currentStatus)) {
            currentStageIndex = index;
        }
    });
    
    let html = '<div class="timeline-stages">';
    
    stages.forEach((stage, index) => {
        let stageStatus = 'pending';
        let stageDate = 'Pending';
        
        // Determine the stage status based on current progress
        if (currentStageIndex >= 0) {
            if (index < currentStageIndex) {
                stageStatus = 'completed';
            } else if (index === currentStageIndex) {
                stageStatus = 'active';
            }
        }
        
        // Get date from timeline if available
        if (repair.timeline && repair.timeline[index]) {
            const timelineEntry = repair.timeline[index];
            const entryDate = timelineEntry.date || timelineEntry.createdAt;
            if (entryDate && entryDate !== '' && !entryDate.includes('pending')) {
                const parsedDate = new Date(entryDate);
                if (!isNaN(parsedDate.getTime())) {
                    stageDate = parsedDate.toLocaleDateString();
                }
            }
        }
        
        html += `
            <div class="timeline-stage ${stageStatus}">
                <div class="timeline-stage-dot">${index + 1}</div>
                <div class="timeline-stage-label">${stage.label}</div>
                <div class="timeline-stage-date">${stageDate}</div>
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
    
    // Normalize status to handle different formats (API uses uppercase with underscores)
    const normalizedStatus = (currentStatus || 'received').toLowerCase().replace(/_/g, '-');
    
    const statusMessages = {
        'received': { message: 'Your laptop has been received and is being inspected.', class: 'status-received' },
        'diagnosed': { message: 'We\'ve identified the issue and are preparing the repair.', class: 'status-diagnosed' },
        'parts-ordered': { message: 'Parts have been ordered and are on the way.', class: 'status-parts-ordered' },
        'waiting-parts': { message: 'Parts have been ordered and are on the way.', class: 'status-parts-ordered' },
        'repair-progress': { message: 'Your laptop is currently being repaired.', class: 'status-repair-progress' },
        'in-progress': { message: 'Your laptop is currently being repaired.', class: 'status-repair-progress' },
        'ready': { message: 'Your laptop is ready for pickup!', class: 'status-ready' },
        'completed': { message: 'Repair completed! Thank you for choosing us.', class: 'status-ready' },
        'returned': { message: 'This repair has been returned for re-repair (Back Job).', class: 'status-returned' },
        'cancelled': { message: 'This repair has been cancelled.', class: 'status-cancelled' }
    };
    
    const status = statusMessages[normalizedStatus] || statusMessages['received'];
    statusBox.innerHTML = status.message;
    statusBox.className = `status-box ${status.class}`;
}

// ============================================================================
// DISPLAY NOTIFICATION PREFERENCE
// ============================================================================

function displayNotificationPreference(repair) {
    const notificationPref = document.getElementById('notificationPref');
    
    // Check if user can view sensitive data (customer info)
    if (repair.canViewSensitiveData) {
        notificationPref.innerHTML = `
            You'll receive updates via:<br>
            SMS: ${repair.notificationPhone || repair.customerPhone || 'Not provided'}<br>
            Email: ${repair.notificationEmail || repair.customerEmail || 'Not provided'}
        `;
    } else {
        // Hide contact info for unauthenticated users or non-matching phone
        notificationPref.innerHTML = `
            <em style="color: #6b7280;">
                <i class="fas fa-lock" style="margin-right: 0.5rem;"></i>
                Contact details are only visible to the ticket owner.<br>
                Please <a href="login.html" style="color: #2563eb;">log in</a> with the registered phone number to view full details.
            </em>
        `;
    }
}

// ============================================================================
// DISPLAY PHOTOS
// ============================================================================

function displayPhotos(repair) {
    const photosSection = document.getElementById('devicePhotosSection');
    const photoGallery = document.getElementById('photoGallery');
    
    if (!photosSection || !photoGallery) return;
    
    // Only show photos if user can view sensitive data
    if (!repair.canViewSensitiveData) {
        photosSection.style.display = 'block';
        photoGallery.style.display = 'block'; // Override grid layout
        photoGallery.innerHTML = `
            <p style="color: #6b7280; margin: 0; font-style: italic;">
                Device photos are only visible to the ticket owner.
                Please <a href="login.html" style="color: #2563eb;">log in</a> with the registered phone number to view photos.
            </p>
        `;
        return;
    }
    
    // Reset to grid layout for actual photos
    photoGallery.style.display = '';
    
    // Check if photos exist
    const photos = repair.photos || [];
    
    if (photos.length === 0) {
        photosSection.style.display = 'none';
        return;
    }
    
    photosSection.style.display = 'block';
    
    let html = '';
    photos.forEach((photo, index) => {
        // Handle both base64 (old format) and URL (new API format)
        let photoSrc = '';
        
        if (typeof photo === 'string') {
            // Base64 encoded photo (old localStorage format)
            photoSrc = photo;
        } else if (photo.path) {
            // API format with path
            photoSrc = photo.path;
            // If path is relative, use the Node.js server URL directly
            if (!photoSrc.startsWith('http') && !photoSrc.startsWith('data:')) {
                // Node.js server runs on port 3000
                photoSrc = `http://localhost:3000${photoSrc}`;
            }
        } else if (photo.url) {
            photoSrc = photo.url;
        }
        
        if (photoSrc) {
            html += `
                <div class="photo-item" onclick="openPhotoViewer('${photoSrc.replace(/'/g, "\\'")}')">
                    <img src="${photoSrc}" alt="Device photo ${index + 1}" loading="lazy">
                </div>
            `;
        }
    });
    
    photoGallery.innerHTML = html || '<p style="color: #6b7280;">No photos available.</p>';
}

// ============================================================================
// PHOTO VIEWER
// ============================================================================

function openPhotoViewer(src) {
    const viewer = document.createElement('div');
    viewer.className = 'photo-viewer-overlay';
    viewer.onclick = (e) => {
        if (e.target === viewer) viewer.remove();
    };
    viewer.innerHTML = `
        <div class="photo-viewer-content">
            <img src="${src}" alt="Full size photo">
            <button class="photo-viewer-close" onclick="this.parentElement.parentElement.remove()">
                X
            </button>
        </div>
    `;
    document.body.appendChild(viewer);
}

// ============================================================================
// GENERATE HISTORY LOG
// ============================================================================

function generateHistoryLog(repair) {
    const historyLog = document.getElementById('historyLog');
    const historySection = historyLog?.closest('.repair-history');
    
    if (!historyLog) return;
    
    historyLog.innerHTML = '';
    
    // Show only completed and active updates
    const recentUpdates = repair.timeline.filter(item => 
        item.status === 'completed' || item.status === 'active'
    ).reverse();
    
    if (recentUpdates.length === 0) {
        // Hide the entire section if no updates
        if (historySection) historySection.style.display = 'none';
        return;
    }
    
    // Show section if there are updates
    if (historySection) historySection.style.display = 'block';
    
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
    if (!dateString) {
        return 'Not set';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Not set';
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
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
    // Store original results HTML for later restoration
    const resultsSection = document.getElementById('trackerResults');
    if (resultsSection) {
        originalResultsHTML = resultsSection.innerHTML;
    }
    
    // Add some sample tracking tips
    const tracker = document.querySelector('.tracker-form');
    if (tracker) {
        console.log('Tracker loaded. Enter your Repair ID or Phone Number to track your repair.');
    }
    
    // Check if ticket ID is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');
    
    if (ticketId) {
        document.getElementById('repairId').value = ticketId;
        document.getElementById('trackingForm').dispatchEvent(new Event('submit'));
    }
});


