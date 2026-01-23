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
        welcomeMessage.textContent = `Welcome back, ${session.firstName} ${session.lastName}!`;
    }

    // Load statistics
    loadStatistics();

    // Load recent tickets
    loadRecentTickets();
}

// ============================================================================
// LOAD STATISTICS
// ============================================================================

function loadStatistics() {
    const stats = getTicketStatistics();
    
    const totalTicketsEl = document.getElementById('totalTickets');
    const activeTicketsEl = document.getElementById('activeTickets');
    const completedTicketsEl = document.getElementById('completedTickets');
    
    if (totalTicketsEl) totalTicketsEl.textContent = stats.total;
    if (activeTicketsEl) activeTicketsEl.textContent = stats.active;
    if (completedTicketsEl) completedTicketsEl.textContent = stats.completed;
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
