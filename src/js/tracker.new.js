// ============================================================================
// REPAIR TRACKER - API-BASED (PUBLIC)
// ============================================================================

let currentTicket = null;

/**
 * Initialize tracker
 */
document.addEventListener('DOMContentLoaded', function() {
    const trackForm = document.getElementById('trackForm');
    if (trackForm) {
        trackForm.addEventListener('submit', handleTrackSubmit);
    }

    // Check for ticket number in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ticketNumber = urlParams.get('ticket');
    if (ticketNumber) {
        document.getElementById('ticketId').value = ticketNumber;
        trackTicket(ticketNumber);
    }

    // Setup real-time updates
    setupRealtimeTracking();
});

/**
 * Handle track form submission
 */
async function handleTrackSubmit(e) {
    e.preventDefault();
    const ticketNumber = document.getElementById('ticketId').value.trim().toUpperCase();
    
    if (!ticketNumber) {
        showNotification('Please enter a ticket number.', 'error');
        return;
    }

    await trackTicket(ticketNumber);
}

/**
 * Track ticket by number
 */
async function trackTicket(ticketNumber) {
    const resultsContainer = document.getElementById('trackingResults');
    const submitBtn = document.querySelector('#trackForm button[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    }

    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Searching for ticket...</p>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }

    try {
        // Include auth token if user is logged in
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Get access token from userSession if available (user is logged in)
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
        
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TICKET_TRACK}/${ticketNumber}`, {
            method: 'GET',
            headers: headers
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ticket not found');
        }

        currentTicket = data.data;
        renderTrackingResults(currentTicket);

        // Subscribe to real-time updates
        socketClient.connect();
        socketClient.subscribeToTicket(ticketNumber);

        // Update URL for sharing
        const newUrl = `${window.location.pathname}?ticket=${ticketNumber}`;
        window.history.replaceState({}, '', newUrl);

    } catch (error) {
        console.error('Track error:', error);
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle fa-3x"></i>
                    <h3>Ticket Not Found</h3>
                    <p>${error.message}</p>
                    <p class="hint">Please check your ticket number and try again.</p>
                </div>
            `;
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-search"></i> Track';
        }
    }
}

/**
 * Render tracking results
 */
function renderTrackingResults(ticket) {
    const resultsContainer = document.getElementById('trackingResults');
    if (!resultsContainer) return;

    const statusClass = ticket.status.toLowerCase().replace(/_/g, '-');
    const statusText = getStatusText(ticket.status);
    const statusIcon = getStatusIcon(ticket.status);
    const progress = getStatusProgress(ticket.status);

    resultsContainer.innerHTML = `
        <div class="tracking-card">
            <!-- Header -->
            <div class="tracking-header">
                <div class="ticket-info">
                    <h2><i class="fas fa-ticket-alt"></i> ${ticket.ticketNumber}</h2>
                    <p class="device-info">
                        <i class="fas fa-laptop"></i> 
                        ${ticket.deviceModel?.toLowerCase().startsWith(ticket.deviceBrand?.toLowerCase()) ? ticket.deviceModel : `${ticket.deviceBrand} ${ticket.deviceModel}`}
                    </p>
                </div>
                <div class="status-badge large ${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                    ${statusText}
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${progress}% Complete</span>
            </div>

            <!-- Timeline -->
            <div class="timeline-section">
                <h3><i class="fas fa-history"></i> Repair Timeline</h3>
                <div class="timeline">
                    ${renderTimeline(ticket.timeline, ticket.status)}
                </div>
            </div>

            <!-- Details -->
            <div class="details-section">
                <div class="detail-row">
                    <span class="label"><i class="fas fa-calendar"></i> Drop-off Date</span>
                    <span class="value">${formatDate(ticket.createdAt)}</span>
                </div>
                ${ticket.estimatedCompletion ? `
                    <div class="detail-row">
                        <span class="label"><i class="fas fa-clock"></i> Estimated Completion</span>
                        <span class="value">${formatDate(ticket.estimatedCompletion)}</span>
                    </div>
                ` : ''}
                <div class="detail-row">
                    <span class="label"><i class="fas fa-flag"></i> Priority</span>
                    <span class="value priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                </div>
            </div>

            <!-- Actions -->
            <div class="actions-section">
                <button class="btn btn-secondary" onclick="copyTrackingLink()">
                    <i class="fas fa-link"></i> Copy Link
                </button>
                <button class="btn btn-secondary" onclick="printTrackingInfo()">
                    <i class="fas fa-print"></i> Print
                </button>
            </div>

            <!-- Real-time indicator -->
            <div class="realtime-indicator" id="realtimeIndicator">
                <span class="pulse"></span>
                <span>Live updates enabled</span>
            </div>
        </div>
    `;

    resultsContainer.style.display = 'block';
}

/**
 * Render timeline
 */
function renderTimeline(timeline, currentStatus) {
    const stages = [
        { key: 'RECEIVED', label: 'Received', icon: 'fa-inbox' },
        { key: 'DIAGNOSED', label: 'Diagnosed', icon: 'fa-search' },
        { key: 'WAITING_PARTS', label: 'Parts Ordered', icon: 'fa-box' },
        { key: 'IN_PROGRESS', label: 'Repair in Progress', icon: 'fa-tools' },
        { key: 'READY', label: 'Ready for Pickup', icon: 'fa-check-circle' }
    ];

    const statusOrder = stages.map(s => s.key);
    const currentIndex = statusOrder.indexOf(currentStatus);

    // Create a map of timeline entries by status
    const timelineMap = {};
    if (timeline) {
        timeline.forEach(entry => {
            timelineMap[entry.status] = entry;
        });
    }

    return stages.map((stage, index) => {
        let stateClass = 'pending';
        let timeInfo = '';
        let description = 'Awaiting this stage';

        if (timelineMap[stage.key]) {
            stateClass = index < currentIndex ? 'completed' : 
                        index === currentIndex ? 'active' : 'pending';
            timeInfo = formatDate(timelineMap[stage.key].createdAt);
            description = timelineMap[stage.key].description || stage.label;
        } else if (index < currentIndex) {
            stateClass = 'completed';
        } else if (index === currentIndex) {
            stateClass = 'active';
        }

        return `
            <div class="timeline-item ${stateClass}">
                <div class="timeline-marker">
                    <i class="fas ${stage.icon}"></i>
                </div>
                <div class="timeline-content">
                    <h4>${stage.label}</h4>
                    <p>${description}</p>
                    ${timeInfo ? `<span class="timeline-date">${timeInfo}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Setup real-time tracking updates
 */
function setupRealtimeTracking() {
    socketClient.on('ticket:updated', (data) => {
        if (currentTicket && data.ticketNumber === currentTicket.ticketNumber) {
            showNotification(`Status updated: ${getStatusText(data.status)}`, 'success');
            
            // Update the ticket data
            currentTicket.status = data.status;
            if (data.timeline) {
                currentTicket.timeline = data.timeline;
            }
            
            // Re-render
            renderTrackingResults(currentTicket);
            
            // Flash the indicator
            const indicator = document.getElementById('realtimeIndicator');
            if (indicator) {
                indicator.classList.add('flash');
                setTimeout(() => indicator.classList.remove('flash'), 1000);
            }
        }
    });

    socketClient.on('connectionChange', ({ connected }) => {
        const indicator = document.getElementById('realtimeIndicator');
        if (indicator) {
            indicator.classList.toggle('disconnected', !connected);
            indicator.querySelector('span:last-child').textContent = 
                connected ? 'Live updates enabled' : 'Reconnecting...';
        }
    });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusText(status) {
    const statusMap = {
        'RECEIVED': 'Device Received',
        'DIAGNOSED': 'Diagnosis Complete',
        'WAITING_PARTS': 'Waiting for Parts',
        'IN_PROGRESS': 'Repair in Progress',
        'READY': 'Ready for Pickup',
        'COMPLETED': 'Completed',
        'CANCELLED': 'Cancelled'
    };
    return statusMap[status] || status;
}

function getStatusIcon(status) {
    const iconMap = {
        'RECEIVED': 'fa-inbox',
        'DIAGNOSED': 'fa-search',
        'WAITING_PARTS': 'fa-box',
        'IN_PROGRESS': 'fa-tools',
        'READY': 'fa-check-circle',
        'COMPLETED': 'fa-check-double',
        'CANCELLED': 'fa-times-circle'
    };
    return iconMap[status] || 'fa-info-circle';
}

function getStatusProgress(status) {
    const progressMap = {
        'RECEIVED': 20,
        'DIAGNOSED': 40,
        'WAITING_PARTS': 55,
        'IN_PROGRESS': 75,
        'READY': 100,
        'COMPLETED': 100,
        'CANCELLED': 0
    };
    return progressMap[status] || 0;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function copyTrackingLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Tracking link copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy link.', 'error');
    });
}

function printTrackingInfo() {
    window.print();
}

function showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.notification-toast');
    existing.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 4000);
}
