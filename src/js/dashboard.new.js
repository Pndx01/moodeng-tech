// ============================================================================
// DASHBOARD FUNCTIONALITY - API-BASED
// ============================================================================

/**
 * Initialize dashboard
 */
async function initDashboard() {
    if (!checkAuthentication()) {
        return;
    }

    // Load dashboard data
    await loadDashboardData();
    
    // Setup real-time updates
    setupRealtimeUpdates();
}

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    const session = getUserSession();
    
    if (!session) {
        return;
    }

    // Update welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome back, ${session.firstName} ${session.lastName}!`;
    }

    // Show user role
    const roleEl = document.getElementById('userRole');
    if (roleEl) {
        roleEl.textContent = session.role;
        roleEl.className = `role-badge role-${session.role.toLowerCase()}`;
    }
    
    const role = session.role?.toUpperCase();
    
    // Configure UI visibility based on role
    configureUIForRole(role, session);

    // Load data in parallel
    await Promise.all([
        loadStatistics(),
        role === 'CUSTOMER' ? loadCustomerTickets(session) : loadRecentTickets(),
        loadNotifications(),
        role === 'TECHNICIAN' ? loadTechnicianDashboard(session) : Promise.resolve(),
        role === 'ADMIN' ? loadPendingApprovals() : Promise.resolve()
    ]);
}

/**
 * Load customer's tickets (matched by phone number or customerId)
 */
async function loadCustomerTickets(session) {
    const recentTicketsContainer = document.getElementById('recentTicketsContainer');
    const recentTicketsSection = document.getElementById('recentTicketsSection');
    
    if (!recentTicketsContainer) return;
    
    // Show the section for customers
    if (recentTicketsSection) {
        recentTicketsSection.style.display = 'block';
        const sectionTitle = recentTicketsSection.querySelector('h2');
        if (sectionTitle) sectionTitle.textContent = 'My Repair Tickets';
    }
    
    try {
        const response = await api.get(`${API_CONFIG.ENDPOINTS.TICKETS}?limit=50`);
        
        if (response.success) {
            const tickets = response.data.tickets;
            
            if (tickets.length === 0) {
                recentTicketsContainer.innerHTML = `
                    <div class="no-tickets">
                        <i class="fas fa-ticket-alt"></i>
                        <p>No repair tickets found. When you bring your device for repair, your tickets will appear here.</p>
                        <a href="tracker.html" class="btn btn-primary">
                            <i class="fas fa-search"></i> Track a Repair
                        </a>
                    </div>
                `;
                return;
            }
            
            let html = '<div class="tickets-list">';
            
            tickets.forEach(ticket => {
                const statusClass = ticket.status.toLowerCase().replace(/_/g, '-');
                const statusText = formatStatus(ticket.status);
                const technicianName = ticket.technician 
                    ? `${ticket.technician.firstName} ${ticket.technician.lastName}` 
                    : 'Not yet assigned';
                
                html += `
                    <div class="ticket-item customer-ticket" onclick="trackTicket('${ticket.ticketNumber}')">
                        <div class="ticket-header">
                            <span class="ticket-id">${ticket.ticketNumber}</span>
                            <span class="ticket-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="ticket-info">
                            <p><strong>Device:</strong> ${ticket.deviceModel?.toLowerCase().startsWith(ticket.deviceBrand?.toLowerCase()) ? ticket.deviceModel : `${ticket.deviceBrand} ${ticket.deviceModel}`}</p>
                            <p><strong>Issue:</strong> ${truncate(ticket.issueDescription, 60)}</p>
                            <p><strong>Technician:</strong> ${technicianName}</p>
                            <p class="ticket-date"><i class="fas fa-clock"></i> ${formatDate(ticket.createdAt)}</p>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            recentTicketsContainer.innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load tickets:', error);
        recentTicketsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load tickets. <a href="#" onclick="loadCustomerTickets(getUserSession())">Try again</a></p>
            </div>
        `;
    }
}

/**
 * Navigate to tracker with ticket number
 */
function trackTicket(ticketNumber) {
    window.location.href = `tracker.html?id=${ticketNumber}`;
}

/**
 * Configure UI visibility based on role
 */
function configureUIForRole(role, session) {
    const createTicketBtn = document.getElementById('createTicketBtn');
    const trackTicketBtn = document.getElementById('trackTicketBtn');
    const viewMessagesBtn = document.getElementById('viewMessagesBtn');
    const statsTitle = document.getElementById('statsTitle');
    const statsCard = document.getElementById('statsCard');
    const quickActionsCard = document.querySelector('.dashboard-card:has(#actionButtons)');
    const viewAllTicketsBtn = document.querySelector('a[href="view-tickets.html"]');
    
    if (role === 'CUSTOMER') {
        if (createTicketBtn) createTicketBtn.style.display = 'none';
        if (trackTicketBtn) trackTicketBtn.style.display = 'inline-flex';
        if (viewMessagesBtn) viewMessagesBtn.style.display = 'none';
        if (viewAllTicketsBtn) viewAllTicketsBtn.style.display = 'none';
        // Hide stats card for customers
        if (statsCard) statsCard.style.display = 'none';
        // Hide quick actions for customers
        if (quickActionsCard) quickActionsCard.style.display = 'none';
        
        // Show recent tickets section for customer's tickets
        showElement('recentTicketsSection');
    } else if (role === 'TECHNICIAN') {
        if (createTicketBtn) createTicketBtn.style.display = 'inline-flex';
        if (trackTicketBtn) trackTicketBtn.style.display = 'none';
        if (viewMessagesBtn) viewMessagesBtn.style.display = 'none';
        if (statsTitle) statsTitle.textContent = 'My Repair Stats';
        
        // Show technician sections
        showElement('myOngoingSection');
        showElement('backJobsSection');
        showElement('forPickUpSection');
        showElement('releasedSection');
    } else if (role === 'ADMIN') {
        if (createTicketBtn) createTicketBtn.style.display = 'inline-flex';
        if (trackTicketBtn) trackTicketBtn.style.display = 'none';
        if (viewMessagesBtn) viewMessagesBtn.style.display = 'inline-flex';
        if (statsTitle) statsTitle.textContent = 'Overall Statistics';
        
        showElement('recentTicketsSection');
        // Pending approvals removed - accessible via navigation bar
    }
}

function showElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
}

/**
 * Load technician-specific dashboard sections
 */
async function loadTechnicianDashboard(session) {
    try {
        // Load all tickets assigned to this technician
        const response = await api.get(`${API_CONFIG.ENDPOINTS.TICKETS}?limit=100`);
        
        if (!response.success) return;
        
        const allTickets = response.data.tickets;
        
        // Filter tickets assigned to this technician
        const myTickets = allTickets.filter(t => t.technicianId === session.id);
        
        // Categorize tickets
        const ongoingStatuses = ['RECEIVED', 'DIAGNOSED', 'WAITING_PARTS', 'IN_PROGRESS'];
        
        const ongoingTickets = myTickets.filter(t => 
            ongoingStatuses.includes(t.status) && t.status !== 'BACK_JOB'
        );
        
        const backJobTickets = myTickets.filter(t => 
            t.status === 'RETURNED' || t.status === 'BACK_JOB' || t.isBackJob
        );
        
        const forPickUpTickets = myTickets.filter(t => 
            t.status === 'READY'
        );
        
        const releasedTickets = myTickets.filter(t => 
            t.status === 'COMPLETED'
        );
        
        // Render each section
        renderTechnicianTicketSection('myOngoingContainer', ongoingTickets, 'No ongoing repairs. You\'re all caught up!', 'ongoing');
        renderTechnicianTicketSection('backJobsContainer', backJobTickets, 'No back jobs. Great work!', 'backjob');
        renderTechnicianTicketSection('forPickUpContainer', forPickUpTickets, 'No tickets ready for pick up.', 'forpickup');
        renderTechnicianTicketSection('releasedContainer', releasedTickets.slice(0, 10), 'No completed tickets yet.', 'released');
        
        // Update badges
        updateBadge('ongoingCount', ongoingTickets.length);
        updateBadge('backJobCount', backJobTickets.length);
        updateBadge('forPickUpCount', forPickUpTickets.length);
        updateBadge('releasedCount', releasedTickets.length);
        
    } catch (error) {
        console.error('Failed to load technician dashboard:', error);
    }
}

function updateBadge(id, count) {
    const badge = document.getElementById(id);
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

function renderTechnicianTicketSection(containerId, tickets, emptyMessage, sectionType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (tickets.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>${emptyMessage}</p></div>`;
        return;
    }
    
    let html = '<div class="tickets-list compact">';
    
    tickets.forEach(ticket => {
        const statusClass = ticket.status.toLowerCase().replace(/_/g, '-');
        const statusText = formatStatus(ticket.status);
        
        html += `
            <div class="ticket-item">
                <div class="ticket-left">
                    <div class="ticket-id">${ticket.ticketNumber}</div>
                </div>
                <div class="ticket-info">
                    <h4>${ticket.customerName}</h4>
                    <p class="ticket-device"><strong>Device:</strong> ${ticket.deviceModel?.toLowerCase().startsWith(ticket.deviceBrand?.toLowerCase()) ? ticket.deviceModel : `${ticket.deviceBrand} ${ticket.deviceModel}`}</p>
                    <p class="ticket-issue"><strong>Issue:</strong> ${truncate(ticket.issueDescription, 50)}</p>
                    <div class="ticket-meta">
                        <span class="meta-item">${formatRelativeTime(ticket.createdAt)}</span>
                        <span class="priority-badge ${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                    </div>
                </div>
                <div class="ticket-actions">
                    <div class="ticket-status ${statusClass}">${statusText}</div>
                    <button onclick="viewTicket('${ticket.id}')" class="btn btn-sm btn-primary">View</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Load pending user approvals (Admin only)
 */
async function loadPendingApprovals() {
    const container = document.getElementById('pendingApprovalsContainer');
    if (!container) return;
    
    try {
        const response = await api.get('/users/pending');
        
        if (response.success) {
            const pendingUsers = response.data.users || response.data || [];
            
            if (!Array.isArray(pendingUsers) || pendingUsers.length === 0) {
                container.innerHTML = '<p class="no-pending">No pending approvals</p>';
                return;
            }
            
            let html = '<div class="pending-list">';
            pendingUsers.forEach(user => {
                html += `
                    <div class="pending-item">
                        <div class="user-info">
                            <strong>${user.firstName} ${user.lastName}</strong>
                            <span>${user.email}</span>
                            <span class="role-badge">${user.role}</span>
                        </div>
                        <div class="action-btns">
                            <button onclick="approveUser('${user.id}')" class="btn btn-sm btn-success">Approve</button>
                            <button onclick="rejectUser('${user.id}')" class="btn btn-sm btn-danger">Reject</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load pending approvals:', error);
        container.innerHTML = '<p class="error">Failed to load pending approvals</p>';
    }
}

async function approveUser(userId) {
    try {
        const response = await api.patch(`/users/${userId}/approve`);
        if (response.success) {
            showNotification('User approved successfully', 'success');
            loadPendingApprovals();
            // Update nav badge
            if (typeof loadPendingBadgeCount === 'function') {
                loadPendingBadgeCount();
            }
        }
    } catch (error) {
        showNotification('Failed to approve user', 'error');
    }
}

async function rejectUser(userId) {
    if (!confirm('Are you sure you want to reject this user?')) return;
    
    try {
        const response = await api.delete(`/users/${userId}/reject`);
        if (response.success) {
            showNotification('User rejected', 'info');
            loadPendingApprovals();
            // Update nav badge
            if (typeof loadPendingBadgeCount === 'function') {
                loadPendingBadgeCount();
            }
        }
    } catch (error) {
        showNotification('Failed to reject user', 'error');
    }
}

/**
 * Load ticket statistics from API
 */
async function loadStatistics() {
    try {
        const response = await api.get(API_CONFIG.ENDPOINTS.TICKET_STATS);
        
        if (response.success) {
            const stats = response.data;
            
            const totalTicketsEl = document.getElementById('totalTickets');
            const activeTicketsEl = document.getElementById('activeTickets');
            const completedTicketsEl = document.getElementById('completedTickets');
            
            if (totalTicketsEl) animateNumber(totalTicketsEl, stats.total);
            if (activeTicketsEl) animateNumber(activeTicketsEl, stats.active);
            if (completedTicketsEl) animateNumber(completedTicketsEl, stats.completed);
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
        showNotification('Failed to load statistics', 'error');
    }
}

/**
 * Load recent tickets from API (Admin/Technician only)
 */
async function loadRecentTickets() {
    const recentTicketsContainer = document.getElementById('recentTicketsContainer');
    const recentTicketsSection = document.getElementById('recentTicketsSection');
    
    if (!recentTicketsContainer) return;

    // Only show recent tickets for Admin and Technician roles
    const session = getUserSession();
    if (!session || !['ADMIN', 'TECHNICIAN'].includes(session.role?.toUpperCase())) {
        if (recentTicketsSection) {
            recentTicketsSection.style.display = 'none';
        }
        return;
    }

    // Show the section for authorized users
    if (recentTicketsSection) {
        recentTicketsSection.style.display = 'block';
    }

    try {
        const response = await api.get(`${API_CONFIG.ENDPOINTS.TICKETS}?limit=5`);
        
        if (response.success) {
            const tickets = response.data.tickets;

            if (tickets.length === 0) {
                recentTicketsContainer.innerHTML = `
                    <div class="no-tickets">
                        <i class="fas fa-ticket-alt"></i>
                        <p>No tickets found. Create your first ticket to get started!</p>
                        <a href="create-ticket.html" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Create Ticket
                        </a>
                    </div>
                `;
                return;
            }

            let html = '<div class="tickets-list">';
            
            tickets.forEach(ticket => {
                const statusClass = ticket.status.toLowerCase().replace(/_/g, '-');
                const statusText = formatStatus(ticket.status);
                const priorityClass = ticket.priority.toLowerCase();
                
                html += `
                    <div class="ticket-item" onclick="viewTicket('${ticket.id}')">
                        <div class="ticket-header">
                            <span class="ticket-id">${ticket.ticketNumber}</span>
                            <span class="priority-badge ${priorityClass}">${ticket.priority}</span>
                        </div>
                        <div class="ticket-info">
                            <h4>${ticket.customerName}</h4>
                            <p><strong>Device:</strong> ${ticket.deviceModel?.toLowerCase().startsWith(ticket.deviceBrand?.toLowerCase()) ? ticket.deviceModel : `${ticket.deviceBrand} ${ticket.deviceModel}`}</p>
                            <p><strong>Issue:</strong> ${truncate(ticket.issueDescription, 60)}</p>
                            <p class="ticket-date"><i class="fas fa-clock"></i> ${formatDate(ticket.createdAt)}</p>
                        </div>
                        <div class="ticket-status ${statusClass}">${statusText}</div>
                    </div>
                `;
            });
            
            html += '</div>';
            recentTicketsContainer.innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load tickets:', error);
        recentTicketsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load tickets. <a href="#" onclick="loadRecentTickets()">Try again</a></p>
            </div>
        `;
    }
}

/**
 * Load notifications
 */
async function loadNotifications() {
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationList = document.getElementById('notificationList');
    
    try {
        const response = await api.get(API_CONFIG.ENDPOINTS.UNREAD_COUNT);
        
        if (response.success && notificationBadge) {
            const count = response.data.count;
            notificationBadge.textContent = count;
            notificationBadge.style.display = count > 0 ? 'flex' : 'none';
        }

        // Load notification list if container exists
        if (notificationList) {
            const listResponse = await api.get(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}?limit=5`);
            
            if (listResponse.success) {
                renderNotifications(listResponse.data.notifications);
            }
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

/**
 * Render notifications list
 */
function renderNotifications(notifications) {
    const container = document.getElementById('notificationList');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = '<p class="no-notifications">No new notifications</p>';
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}">
            <div class="notification-icon">
                <i class="fas ${getNotificationIcon(n.type)}"></i>
            </div>
            <div class="notification-content">
                <strong>${n.title}</strong>
                <p>${n.message}</p>
                <span class="notification-time">${formatRelativeTime(n.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Setup real-time updates
 */
function setupRealtimeUpdates() {
    // Listen for ticket updates
    socketClient.on('ticket:updated', (data) => {
        showNotification(`Ticket ${data.ticketNumber} updated to: ${formatStatus(data.status)}`, 'info');
        loadRecentTickets();
        loadStatistics();
    });

    // Listen for new notifications
    socketClient.on('notification', (data) => {
        showNotification(data.message, 'info');
        loadNotifications();
    });

    // Listen for new tickets (for staff)
    socketClient.on('ticket:created', (data) => {
        showNotification(`New ticket created: ${data.ticketNumber}`, 'info');
        loadRecentTickets();
        loadStatistics();
    });
}

/**
 * View ticket details
 */
function viewTicket(ticketId) {
    // Open ticket details modal if openTicketDetails function exists (from ticket.new.js)
    if (typeof openTicketDetails === 'function') {
        openTicketDetails(ticketId);
    } else {
        // Fallback to redirect with ID parameter
        window.location.href = `view-tickets.html?id=${ticketId}`;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format ticket status for display
 */
function formatStatus(status) {
    const statusMap = {
        'RECEIVED': 'Received',
        'DIAGNOSED': 'Diagnosed',
        'WAITING_PARTS': 'Waiting for Parts',
        'IN_PROGRESS': 'In Progress',
        'READY': 'Ready for Pickup',
        'COMPLETED': 'Completed',
        'RETURNED': 'Returned (Back Job)',
        'CANCELLED': 'Cancelled'
    };
    
    return statusMap[status] || status;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString(undefined, options);
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
}

/**
 * Truncate text
 */
function truncate(text, length) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
}

/**
 * Animate number count
 */
function animateNumber(element, target) {
    const duration = 500;
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

/**
 * Get notification icon based on type
 */
function getNotificationIcon(type) {
    const icons = {
        'TICKET_CREATED': 'fa-ticket-alt',
        'TICKET_UPDATED': 'fa-sync',
        'TICKET_COMPLETED': 'fa-check-circle',
        'SYSTEM': 'fa-info-circle'
    };
    return icons[type] || 'fa-bell';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);
