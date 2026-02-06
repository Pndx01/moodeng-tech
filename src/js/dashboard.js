// ============================================================================
// DASHBOARD FUNCTIONALITY
// ============================================================================

function loadDashboardData() {
    const session = getUserSession();
    
    if (!session) {
        return;
    }

    // Update welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const greeting = getTimeBasedGreeting();
        welcomeMessage.textContent = `${greeting}, ${session.firstName} ${session.lastName}!`;
    }

    const role = session.role?.toUpperCase();
    
    // Configure UI based on role
    configureUIForRole(role, session);

    // Load statistics based on role
    loadStatistics(role, session);

    // Load role-specific sections
    if (role === 'TECHNICIAN') {
        loadTechnicianDashboard(session);
    } else if (role === 'ADMIN') {
        loadAdminDashboard(session);
        loadPendingApprovals();
    } else {
        // Customer
        loadCustomerDashboard(session);
    }
}

// ============================================================================
// TIME-BASED GREETING
// ============================================================================

function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

// ============================================================================
// CONFIGURE UI BASED ON ROLE
// ============================================================================

function configureUIForRole(role, session) {
    const createTicketBtn = document.getElementById('createTicketBtn');
    const trackTicketBtn = document.getElementById('trackTicketBtn');
    const viewMessagesBtn = document.getElementById('viewMessagesBtn');
    const statsTitle = document.getElementById('statsTitle');
    
    if (role === 'CUSTOMER') {
        // Customers can only view/track tickets, not create
        if (createTicketBtn) createTicketBtn.style.display = 'none';
        if (trackTicketBtn) trackTicketBtn.style.display = 'inline-flex';
        if (viewMessagesBtn) viewMessagesBtn.style.display = 'none';
        if (statsTitle) statsTitle.textContent = 'My Tickets';
    } else if (role === 'TECHNICIAN') {
        // Technicians
        if (createTicketBtn) createTicketBtn.style.display = 'inline-flex';
        if (trackTicketBtn) trackTicketBtn.style.display = 'none';
        if (viewMessagesBtn) viewMessagesBtn.style.display = 'none';
        if (statsTitle) statsTitle.textContent = 'My Repair Stats';
        
        // Show technician sections
        showElement('myOngoingSection');
        showElement('backJobsSection');
        showElement('releasedSection');
    } else {
        // Admin - show everything including messages
        if (createTicketBtn) createTicketBtn.style.display = 'inline-flex';
        if (trackTicketBtn) trackTicketBtn.style.display = 'none';
        if (viewMessagesBtn) viewMessagesBtn.style.display = 'inline-flex';
        if (statsTitle) statsTitle.textContent = 'Overall Statistics';
        
        // Show admin sections
        showElement('recentTicketsSection');
    }
}

function showElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
}

// ============================================================================
// LOAD STATISTICS
// ============================================================================

function loadStatistics(role, session) {
    const tickets = getAllTickets();
    let filteredTickets = tickets;
    
    // For technicians, only show their assigned tickets
    if (role === 'TECHNICIAN') {
        filteredTickets = tickets.filter(t => t.assignedTechId === session.id || t.createdById === session.id);
    }
    
    const stats = calculateStats(filteredTickets);
    
    const totalTicketsEl = document.getElementById('totalTickets');
    const activeTicketsEl = document.getElementById('activeTickets');
    const completedTicketsEl = document.getElementById('completedTickets');
    
    // Animate count up
    if (totalTicketsEl) animateCount(totalTicketsEl, stats.total);
    if (activeTicketsEl) animateCount(activeTicketsEl, stats.active);
    if (completedTicketsEl) animateCount(completedTicketsEl, stats.completed);
    
    // Update stats grid for technicians with more detailed stats
    if (role === 'TECHNICIAN') {
        updateTechnicianStats(filteredTickets);
    }
}

function calculateStats(tickets) {
    const activeStatuses = ['received', 'diagnosed', 'parts-ordered', 'repair-progress'];
    const completedStatuses = ['ready', 'completed', 'released'];
    
    return {
        total: tickets.length,
        active: tickets.filter(t => activeStatuses.includes(t.status)).length,
        completed: tickets.filter(t => completedStatuses.includes(t.status)).length
    };
}

function animateCount(element, target) {
    let current = 0;
    const increment = Math.ceil(target / 20);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = current;
        }
    }, 30);
}

function updateTechnicianStats(tickets) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    const backJobCount = tickets.filter(t => t.isBackJob).length;
    const todayCount = tickets.filter(t => {
        const today = new Date().toDateString();
        return new Date(t.createdAt).toDateString() === today;
    }).length;
    
    // Add additional stat boxes for technicians
    statsGrid.innerHTML = `
        <div class="stat-box">
            <h3 id="totalTickets">${tickets.length}</h3>
            <p>My Total</p>
        </div>
        <div class="stat-box highlight">
            <h3 id="activeTickets">${tickets.filter(t => ['received', 'diagnosed', 'parts-ordered', 'repair-progress'].includes(t.status)).length}</h3>
            <p>In Progress</p>
        </div>
        <div class="stat-box success">
            <h3 id="completedTickets">${tickets.filter(t => ['ready', 'completed', 'released'].includes(t.status)).length}</h3>
            <p>Completed</p>
        </div>
        <div class="stat-box warning">
            <h3>${backJobCount}</h3>
            <p>Back Jobs</p>
        </div>
    `;
}

// ============================================================================
// TECHNICIAN DASHBOARD
// ============================================================================

function loadTechnicianDashboard(session) {
    const tickets = getAllTickets();
    
    // Filter tickets assigned to or created by this technician
    const myTickets = tickets.filter(t => 
        t.assignedTechId === session.id || t.createdById === session.id
    );
    
    // Categorize tickets
    const ongoingTickets = myTickets.filter(t => 
        ['received', 'diagnosed', 'parts-ordered', 'repair-progress'].includes(t.status) && !t.isBackJob
    );
    
    const backJobTickets = myTickets.filter(t => t.isBackJob && t.status !== 'released' && t.status !== 'completed');
    
    const releasedTickets = myTickets.filter(t => 
        ['ready', 'completed', 'released'].includes(t.status)
    );
    
    // Render each section
    renderTicketSection('myOngoingContainer', ongoingTickets, 'No ongoing repairs. You\'re all caught up!', 'ongoing');
    renderTicketSection('backJobsContainer', backJobTickets, 'No back jobs. Great work!', 'backjob');;
    renderTicketSection('releasedContainer', releasedTickets.slice(0, 10), 'No completed tickets yet.', 'released');
    
    // Update badges
    updateBadge('ongoingCount', ongoingTickets.length);
    updateBadge('backJobCount', backJobTickets.length);
    updateBadge('releasedCount', releasedTickets.length);
}

function updateBadge(id, count) {
    const badge = document.getElementById(id);
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

function renderTicketSection(containerId, tickets, emptyMessage, sectionType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (tickets.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>${emptyMessage}</p></div>`;
        return;
    }
    
    // Sort by date (newest first for released, oldest first for ongoing)
    const sortedTickets = [...tickets].sort((a, b) => {
        if (sectionType === 'released') {
            return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    let html = '<div class="tickets-list compact">';
    
    sortedTickets.forEach(ticket => {
        const statusClass = ticket.status.replace(/ /g, '-');
        const statusText = formatStatus(ticket.status);
        const urgencyClass = getUrgencyClass(ticket);
        const daysOld = getDaysOld(ticket.createdAt);
        
        html += `
            <div class="ticket-item ${urgencyClass} ${ticket.isBackJob ? 'back-job' : ''}">
                <div class="ticket-left">
                    <div class="ticket-id">${ticket.id}</div>
                    ${ticket.isBackJob ? '<span class="back-job-badge">Back Job</span>' : ''}
                </div>
                <div class="ticket-info">
                    <h4>${ticket.firstName} ${ticket.lastName}</h4>
                    <p class="ticket-device"><strong>Device:</strong> ${ticket.laptopModel}</p>
                    <p class="ticket-issue"><strong>Issue:</strong> ${ticket.issue.substring(0, 50)}${ticket.issue.length > 50 ? '...' : ''}</p>
                    <div class="ticket-meta">
                        <span class="meta-item">${formatDate(ticket.createdAt)}</span>
                        ${daysOld > 0 ? `<span class="meta-item ${daysOld > 3 ? 'warning' : ''}">${daysOld} day${daysOld > 1 ? 's' : ''} ago</span>` : '<span class="meta-item new">Today</span>'}
                    </div>
                </div>
                <div class="ticket-actions">
                    <div class="ticket-status ${statusClass}">${statusText}</div>
                    <div class="action-btns">
                        <button onclick="updateStatus('${ticket.id}')" class="btn btn-sm btn-primary">Update</button>
                        ${sectionType === 'ongoing' ? `<button onclick="markAsBackJob('${ticket.id}')" class="btn btn-sm btn-warning" title="Mark as Back Job">Back Job</button>` : ''}
                        ${ticket.status === 'ready' ? `<button onclick="releaseTicket('${ticket.id}')" class="btn btn-sm btn-success">Release</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function getUrgencyClass(ticket) {
    const daysOld = getDaysOld(ticket.createdAt);
    if (ticket.priority === 'urgent' || daysOld > 5) return 'urgent';
    if (daysOld > 3) return 'warning';
    return '';
}

function getDaysOld(dateString) {
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

function loadAdminDashboard(session) {
    // Show all sections for admin
    showElement('myOngoingSection');
    showElement('backJobsSection');
    showElement('releasedSection');
    showElement('recentTicketsSection');
    
    const tickets = getAllTickets();
    
    // For admin, show all tickets
    const ongoingTickets = tickets.filter(t => 
        ['received', 'diagnosed', 'parts-ordered', 'repair-progress'].includes(t.status) && !t.isBackJob
    );
    
    const backJobTickets = tickets.filter(t => t.isBackJob && t.status !== 'released' && t.status !== 'completed');
    
    const releasedTickets = tickets.filter(t => 
        ['ready', 'completed', 'released'].includes(t.status)
    );
    
    // Render sections
    renderTicketSection('myOngoingContainer', ongoingTickets, 'No ongoing repairs.', 'ongoing');
    renderTicketSection('backJobsContainer', backJobTickets, 'No back jobs.', 'backjob');
    renderTicketSection('releasedContainer', releasedTickets.slice(0, 10), 'No completed tickets.', 'released');
    
    // Update section titles for admin
    const ongoingHeader = document.querySelector('#myOngoingSection h2');
    if (ongoingHeader) ongoingHeader.textContent = 'All Ongoing Repairs';
    
    // Update badges
    updateBadge('ongoingCount', ongoingTickets.length);
    updateBadge('backJobCount', backJobTickets.length);
    updateBadge('releasedCount', releasedTickets.length);
    
    // Load recent tickets
    loadRecentTickets();
}

// ============================================================================
// CUSTOMER DASHBOARD
// ============================================================================

function loadCustomerDashboard(session) {
    // Hide technician/admin sections for customers
    hideElement('myOngoingSection');
    hideElement('backJobsSection');
    hideElement('releasedSection');
    hideElement('recentTicketsSection');
    
    // Could add customer-specific sections here in the future
}

function hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

// ============================================================================
// TICKET ACTIONS
// ============================================================================

function markAsBackJob(ticketId) {
    if (!confirm('Mark this ticket as a Back Job? This means the customer returned with the same issue.')) {
        return;
    }
    
    const tickets = getAllTickets();
    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    
    if (ticketIndex !== -1) {
        tickets[ticketIndex].isBackJob = true;
        tickets[ticketIndex].backJobDate = new Date().toISOString();
        tickets[ticketIndex].status = 'received'; // Reset status
        
        // Add to timeline
        tickets[ticketIndex].timeline.push({
            stage: 'Back Job',
            date: new Date().toISOString(),
            status: 'active',
            message: 'Customer returned - issue needs re-attention'
        });
        
        localStorage.setItem('repairTickets', JSON.stringify(tickets));
        showNotification('Ticket marked as Back Job', 'warning');
        loadDashboardData();
    }
}

function releaseTicket(ticketId) {
    if (!confirm('Release this ticket? This marks it as picked up by the customer.')) {
        return;
    }
    
    const tickets = getAllTickets();
    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    
    if (ticketIndex !== -1) {
        tickets[ticketIndex].status = 'released';
        tickets[ticketIndex].releasedDate = new Date().toISOString();
        tickets[ticketIndex].updatedAt = new Date().toISOString();
        
        // Add to timeline
        tickets[ticketIndex].timeline.push({
            stage: 'Released',
            date: new Date().toISOString(),
            status: 'completed',
            message: 'Device released to customer'
        });
        
        localStorage.setItem('repairTickets', JSON.stringify(tickets));
        showNotification('Ticket released successfully!', 'success');
        loadDashboardData();
    }
}

// ============================================================================
// LOAD RECENT TICKETS
// ============================================================================

function loadRecentTickets() {
    const tickets = getAllTickets();
    const recentTicketsContainer = document.getElementById('recentTicketsContainer');
    
    if (!recentTicketsContainer) return;

    if (tickets.length === 0) {
        recentTicketsContainer.innerHTML = `
            <div class="no-tickets">
                <p>No tickets found. Create your first ticket to get started!</p>
                <a href="create-ticket.html" class="btn btn-primary">Create Ticket</a>
            </div>
        `;
        return;
    }

    // Sort by creation date (newest first) and take top 5
    const recentTickets = tickets
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    let html = '<div class="tickets-list">';
    
    recentTickets.forEach(ticket => {
        const statusClass = ticket.status.replace(/ /g, '-');
        const statusText = formatStatus(ticket.status);
        
        html += `
            <div class="ticket-item">
                <div class="ticket-id">${ticket.id}</div>
                <div class="ticket-info">
                    <h4>${ticket.firstName} ${ticket.lastName}</h4>
                    <p><strong>Device:</strong> ${ticket.laptopModel}</p>
                    <p><strong>Issue:</strong> ${ticket.issue.substring(0, 60)}${ticket.issue.length > 60 ? '...' : ''}</p>
                    <p><strong>Created:</strong> ${formatDate(ticket.createdAt)}</p>
                </div>
                <div class="ticket-status ${statusClass}">${statusText}</div>
            </div>
        `;
    });
    
    html += '</div>';
    recentTicketsContainer.innerHTML = html;
}

// ============================================================================
// FORMAT STATUS
// ============================================================================

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

// ============================================================================
// FORMAT DATE
// ============================================================================

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString(undefined, options);
}

// ============================================================================
// LOAD PENDING APPROVALS (Admin only)
// ============================================================================

async function loadPendingApprovals() {
    const pendingSection = document.getElementById('pendingApprovalsSection');
    const pendingContainer = document.getElementById('pendingApprovalsContainer');
    
    if (!pendingSection || !pendingContainer) {
        return;
    }

    // Check if API is available
    if (typeof api === 'undefined' || typeof API_CONFIG === 'undefined') {
        pendingSection.style.display = 'none';
        return;
    }

    // Check if user has access token
    if (!api.isAuthenticated()) {
        pendingContainer.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h4 style="color: #856404; margin: 0 0 10px 0;">Re-login Required</h4>
                <p style="color: #856404; margin: 0 0 15px 0;">To manage pending user approvals, please log out and log back in.</p>
                <button onclick="logoutUser()" class="btn btn-primary">Logout & Login Again</button>
            </div>
        `;
        pendingSection.style.display = 'block';
        return;
    }
    
    try {
        const response = await api.get(API_CONFIG.ENDPOINTS.USERS_PENDING);
        
        if (response.success && response.data.users) {
            const users = response.data.users;
            
            if (users.length === 0) {
                pendingSection.style.display = 'none';
                return;
            }

            pendingSection.style.display = 'block';
            
            let html = '<div class="pending-users-list">';
            
            users.forEach(user => {
                const createdDate = formatDate(user.createdAt);
                
                html += `
                    <div class="pending-user-item" id="pending-user-${user.id}">
                        <div class="user-info">
                            <h4>${user.firstName} ${user.lastName}</h4>
                            <p><strong>Email:</strong> ${user.email}</p>
                            <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
                            <p><strong>Requested:</strong> ${createdDate}</p>
                        </div>
                        <div class="user-actions">
                            <button class="btn btn-success btn-sm" onclick="approveUser('${user.id}')">
                                Approve
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="rejectUser('${user.id}')">
                                Reject
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            pendingContainer.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading pending approvals:', error);
        pendingSection.style.display = 'none';
    }
}

// ============================================================================
// APPROVE USER
// ============================================================================

async function approveUser(userId) {
    if (!confirm('Are you sure you want to approve this user?')) return;

    try {
        const response = await api.patch(`${API_CONFIG.ENDPOINTS.USERS}/${userId}/approve`);
        
        if (response.success) {
            showNotification(response.message || 'User approved successfully!', 'success');
            // Remove from list
            const userElement = document.getElementById(`pending-user-${userId}`);
            if (userElement) {
                userElement.remove();
            }
            // Check if list is now empty
            const container = document.getElementById('pendingApprovalsContainer');
            if (container && container.querySelector('.pending-users-list').children.length === 0) {
                document.getElementById('pendingApprovalsSection').style.display = 'none';
            }
        }
    } catch (error) {
        showNotification(error.message || 'Failed to approve user', 'error');
    }
}

// ============================================================================
// REJECT USER
// ============================================================================

async function rejectUser(userId) {
    const reason = prompt('Enter reason for rejection (optional):');
    
    if (reason === null) return; // User cancelled

    try {
        const response = await api.delete(`${API_CONFIG.ENDPOINTS.USERS}/${userId}/reject`, { reason });
        
        if (response.success) {
            showNotification(response.message || 'User rejected', 'success');
            // Remove from list
            const userElement = document.getElementById(`pending-user-${userId}`);
            if (userElement) {
                userElement.remove();
            }
            // Check if list is now empty
            const container = document.getElementById('pendingApprovalsContainer');
            if (container && container.querySelector('.pending-users-list').children.length === 0) {
                document.getElementById('pendingApprovalsSection').style.display = 'none';
            }
        }
    } catch (error) {
        showNotification(error.message || 'Failed to reject user', 'error');
    }
}

// ============================================================================
// STATUS UPDATE MODAL
// ============================================================================

function updateStatus(ticketId) {
    // Get current ticket to show current status
    const tickets = getAllTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    const currentStatus = ticket?.status || 'received';
    
    // Show modal
    showStatusModal(ticketId, currentStatus);
}

function showStatusModal(ticketId, currentStatus) {
    const statuses = [
        { value: 'received', label: 'Received', icon: '', color: '#6b7280' },
        { value: 'diagnosed', label: 'Diagnosed', icon: '', color: '#8b5cf6' },
        { value: 'parts-ordered', label: 'Parts Ordered', icon: '', color: '#f59e0b' },
        { value: 'repair-progress', label: 'In Progress', icon: '', color: '#3b82f6' },
        { value: 'ready', label: 'Ready for Pickup', icon: '', color: '#10b981' }
    ];
    
    const modal = document.createElement('div');
    modal.className = 'status-modal-overlay';
    modal.onclick = (e) => {
        if (e.target === modal) closeStatusModal();
    };
    
    modal.innerHTML = `
        <div class="status-modal">
            <div class="status-modal-header">
                <h3>Update Ticket Status</h3>
                <button class="status-modal-close" onclick="closeStatusModal()">×</button>
            </div>
            <div class="status-modal-body">
                <div class="status-options">
                    ${statuses.map(s => `
                        <label class="status-option ${s.value === currentStatus ? 'selected' : ''}" data-status="${s.value}">
                            <input type="radio" name="ticketStatus" value="${s.value}" ${s.value === currentStatus ? 'checked' : ''}>
                            <span class="status-icon">${s.icon}</span>
                            <span class="status-label">${s.label}</span>
                            <span class="status-check"></span>
                        </label>
                    `).join('')}
                </div>
                <div class="form-group" style="margin-top: 1.5rem;">
                    <label for="statusNote" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                        Add a Note (optional)
                    </label>
                    <textarea id="statusNote" placeholder="e.g., Waiting for replacement screen to arrive..." 
                        style="width: 100%; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 12px; 
                               font-size: 1rem; resize: vertical; min-height: 80px; font-family: inherit;
                               transition: border-color 0.3s ease;"></textarea>
                </div>
            </div>
            <div class="status-modal-footer">
                <button class="btn btn-secondary" onclick="closeStatusModal()">Cancel</button>
                <button class="btn btn-primary" id="updateStatusBtn" onclick="submitStatusUpdate('${ticketId}')">
                    <span class="btn-text">Update Status</span>
                    <span class="btn-loading" style="display: none;">
                        <span class="spinner"></span> Updating...
                    </span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Add click handlers for status options
    modal.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', function() {
            modal.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input').checked = true;
        });
    });
    
    // Focus on textarea
    setTimeout(() => {
        document.getElementById('statusNote').focus();
    }, 100);
}

function closeStatusModal() {
    const modal = document.querySelector('.status-modal-overlay');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 200);
    }
}

// Legacy submitStatusUpdate removed - using the one from ticket.new.js for API-based updates

// ============================================================================
// UPDATE TICKET STATUS (Local Storage)
// ============================================================================

function updateTicketStatus(ticketId, newStatus, message) {
    const tickets = getAllTickets();
    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    
    if (ticketIndex !== -1) {
        const ticket = tickets[ticketIndex];
        ticket.status = newStatus;
        ticket.updatedAt = new Date().toISOString();
        
        // Update timeline
        const stageMap = {
            'received': 0,
            'diagnosed': 1,
            'parts-ordered': 2,
            'repair-progress': 3,
            'ready': 4
        };
        
        const stageIndex = stageMap[newStatus];
        if (stageIndex !== undefined && ticket.timeline[stageIndex]) {
            ticket.timeline[stageIndex].status = 'completed';
            ticket.timeline[stageIndex].date = new Date().toISOString();
            ticket.timeline[stageIndex].message = message;
        }
        
        // Mark subsequent stages as pending
        for (let i = stageIndex + 1; i < ticket.timeline.length; i++) {
            ticket.timeline[i].status = 'pending';
        }
        
        localStorage.setItem('repairTickets', JSON.stringify(tickets));
    }
}
