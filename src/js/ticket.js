// ============================================================================
// TICKET MANAGEMENT SYSTEM
// ============================================================================

// Initialize photo previews
document.addEventListener('DOMContentLoaded', function() {
    // Setup photo preview handlers
    for (let i = 1; i <= 5; i++) {
        const photoInput = document.getElementById(`photo${i}`);
        if (photoInput) {
            photoInput.addEventListener('change', function(e) {
                handlePhotoPreview(e, `preview${i}`);
            });
        }
    }

    // Handle form submission
    const ticketForm = document.getElementById('createTicketForm');
    if (ticketForm) {
        ticketForm.addEventListener('submit', handleTicketSubmit);
    }
});

// ============================================================================
// PHOTO PREVIEW HANDLER
// ============================================================================

function handlePhotoPreview(event, previewId) {
    const file = event.target.files[0];
    const preview = document.getElementById(previewId);
    
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.classList.add('has-image');
        };
        
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
        preview.classList.remove('has-image');
    }
}

// ============================================================================
// HANDLE TICKET SUBMISSION
// ============================================================================

function handleTicketSubmit(e) {
    e.preventDefault();
    
    const session = getUserSession();
    if (!session) {
        showNotification('You must be logged in to create tickets.', 'error');
        return;
    }

    // Get form data
    const formData = {
        // Generate ticket ID
        id: generateTicketId(),
        
        // Customer Information
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        
        // Device Information
        laptopModel: document.getElementById('laptopModel').value,
        serialNumber: document.getElementById('serialNumber').value,
        issue: document.getElementById('issue').value,
        
        // Photos (store as base64)
        photos: [],
        
        // Repair Information
        priority: document.getElementById('priority').value,
        estimatedDate: document.getElementById('estimatedDate').value,
        notes: document.getElementById('notes').value,
        
        // System Information
        status: 'received',
        createdBy: `${session.firstName} ${session.lastName}`,
        createdById: session.id,
        createdAt: new Date().toISOString(),
        dropoffDate: new Date().toISOString().split('T')[0],
        
        // Timeline
        timeline: [
            {
                stage: 'Received',
                date: new Date().toISOString(),
                status: 'active',
                message: `Device received and logged by ${session.firstName} ${session.lastName}`
            },
            {
                stage: 'Diagnosed',
                date: '',
                status: 'pending',
                message: 'Awaiting diagnosis'
            },
            {
                stage: 'Parts Ordered',
                date: '',
                status: 'pending',
                message: 'Awaiting parts if needed'
            },
            {
                stage: 'Repair in Progress',
                date: '',
                status: 'pending',
                message: 'Repair not yet started'
            },
            {
                stage: 'Ready for Pickup',
                date: '',
                status: 'pending',
                message: 'Not yet completed'
            }
        ]
    };

    // Get photo data
    const photoPromises = [];
    for (let i = 1; i <= 5; i++) {
        const photoInput = document.getElementById(`photo${i}`);
        if (photoInput && photoInput.files.length > 0) {
            photoPromises.push(getFileAsBase64(photoInput.files[0]));
        }
    }

    // Wait for all photos to be converted
    Promise.all(photoPromises).then(photos => {
        formData.photos = photos;
        
        // Validate minimum 3 photos
        if (formData.photos.length < 3) {
            showNotification('Please upload at least 3 photos!', 'error');
            return;
        }

        // Save ticket to localStorage
        saveTicket(formData);
        
        showNotification(`Ticket ${formData.id} created successfully!`, 'success');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    });
}

// ============================================================================
// GENERATE TICKET ID
// ============================================================================

function generateTicketId() {
    const year = new Date().getFullYear();
    const tickets = getAllTickets();
    const ticketNumber = (tickets.length + 1).toString().padStart(3, '0');
    return `MOO-${year}-${ticketNumber}`;
}

// ============================================================================
// SAVE TICKET
// ============================================================================

function saveTicket(ticket) {
    const tickets = getAllTickets();
    tickets.push(ticket);
    localStorage.setItem('repairTickets', JSON.stringify(tickets));
}

// ============================================================================
// GET ALL TICKETS
// ============================================================================

function getAllTickets() {
    const tickets = localStorage.getItem('repairTickets');
    return tickets ? JSON.parse(tickets) : [];
}

// ============================================================================
// GET TICKET BY ID
// ============================================================================

function getTicketById(ticketId) {
    const tickets = getAllTickets();
    return tickets.find(t => t.id === ticketId);
}

// ============================================================================
// UPDATE TICKET STATUS
// ============================================================================

function updateTicketStatus(ticketId, newStatus, message) {
    const tickets = getAllTickets();
    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    
    if (ticketIndex !== -1) {
        const ticket = tickets[ticketIndex];
        ticket.status = newStatus;
        
        // Update timeline
        const statusMap = {
            'received': 0,
            'diagnosed': 1,
            'parts-ordered': 2,
            'repair-progress': 3,
            'ready': 4
        };
        
        const stageIndex = statusMap[newStatus];
        if (stageIndex !== undefined && ticket.timeline[stageIndex]) {
            ticket.timeline[stageIndex].date = new Date().toISOString();
            ticket.timeline[stageIndex].status = 'active';
            ticket.timeline[stageIndex].message = message || ticket.timeline[stageIndex].message;
            
            // Mark previous stages as completed
            for (let i = 0; i < stageIndex; i++) {
                if (ticket.timeline[i].status !== 'completed') {
                    ticket.timeline[i].status = 'completed';
                }
            }
        }
        
        tickets[ticketIndex] = ticket;
        localStorage.setItem('repairTickets', JSON.stringify(tickets));
        
        return true;
    }
    
    return false;
}

// ============================================================================
// GET FILE AS BASE64
// ============================================================================

function getFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================================================
// DELETE TICKET
// ============================================================================

function deleteTicket(ticketId) {
    if (confirm('Are you sure you want to delete this ticket?')) {
        let tickets = getAllTickets();
        tickets = tickets.filter(t => t.id !== ticketId);
        localStorage.setItem('repairTickets', JSON.stringify(tickets));
        showNotification('Ticket deleted successfully!', 'success');
        return true;
    }
    return false;
}

// ============================================================================
// GET TICKET STATISTICS
// ============================================================================

function getTicketStatistics() {
    const tickets = getAllTickets();
    
    return {
        total: tickets.length,
        received: tickets.filter(t => t.status === 'received').length,
        diagnosed: tickets.filter(t => t.status === 'diagnosed').length,
        partsOrdered: tickets.filter(t => t.status === 'parts-ordered').length,
        repairProgress: tickets.filter(t => t.status === 'repair-progress').length,
        ready: tickets.filter(t => t.status === 'ready').length,
        active: tickets.filter(t => t.status !== 'ready').length,
        completed: tickets.filter(t => t.status === 'ready').length
    };
}
