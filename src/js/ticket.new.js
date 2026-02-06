// ============================================================================
// TICKET MANAGEMENT SYSTEM - API-BASED
// ============================================================================

/**
 * Initialize ticket module
 */
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

    // Load tickets if on view-tickets page
    if (document.getElementById('ticketsContainer')) {
        // Check if technician - only show assigned tickets
        const session = getUserSession();
        const role = session?.role?.toUpperCase();
        if (role === 'TECHNICIAN') {
            loadAllTickets({ assignedToMe: 'true' });
        } else {
            loadAllTickets();
        }
    }
});

// ============================================================================
// PHOTO HANDLING
// ============================================================================

function handlePhotoPreview(event, previewId) {
    const file = event.target.files[0];
    const preview = document.getElementById(previewId);
    
    if (file) {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File too large. Maximum size is 5MB.', 'error');
            event.target.value = '';
            return;
        }

        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
            showNotification('Invalid file type. Only JPEG, PNG, GIF, WebP allowed.', 'error');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-photo" onclick="removePhoto('${event.target.id}', '${previewId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.classList.add('has-image');
        };
        
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
        preview.classList.remove('has-image');
    }
}

function removePhoto(inputId, previewId) {
    document.getElementById(inputId).value = '';
    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    preview.classList.remove('has-image');
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

function validateTicketForm() {
    const requiredFields = [
        { id: 'firstName', label: 'First Name' },
        { id: 'lastName', label: 'Last Name' },
        { id: 'email', label: 'Email Address' },
        { id: 'phone', label: 'Phone Number' },
        { id: 'laptopModel', label: 'Laptop Model' },
        { id: 'serialNumber', label: 'Serial Number' },
        { id: 'issue', label: 'Issue Description' },
        { id: 'technicianId', label: 'Assigned Technician' },
        { id: 'priority', label: 'Priority' },
        { id: 'estimatedDate', label: 'Estimated Completion Date' }
    ];

    const missingFields = [];
    let firstInvalidField = null;

    // Clear previous validation styles
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('invalid');
    });
    document.querySelectorAll('.field-error').forEach(error => {
        error.remove();
    });

    // Check each required field
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            const value = element.value.trim();
            if (!value) {
                missingFields.push(field.label);
                markFieldInvalid(element, `${field.label} is required`);
                if (!firstInvalidField) {
                    firstInvalidField = element;
                }
            } else {
                // Additional validation for specific fields
                if (field.id === 'email' && !isValidEmail(value)) {
                    missingFields.push(`${field.label} (invalid format)`);
                    markFieldInvalid(element, 'Please enter a valid email address');
                    if (!firstInvalidField) {
                        firstInvalidField = element;
                    }
                }
                if (field.id === 'phone' && !isValidPhone(value)) {
                    missingFields.push(`${field.label} (invalid format)`);
                    markFieldInvalid(element, 'Please enter a valid phone number (e.g., 09123456789)');
                    if (!firstInvalidField) {
                        firstInvalidField = element;
                    }
                }
            }
        }
    });

    // Check for at least 1 photo
    let photoCount = 0;
    for (let i = 1; i <= 5; i++) {
        const photoInput = document.getElementById(`photo${i}`);
        if (photoInput && photoInput.files.length > 0) {
            photoCount++;
        }
    }
    
    if (photoCount < 1) {
        missingFields.push('At least 1 photo');
        // Highlight the photo section
        const photoSection = document.querySelector('.photo-upload-grid');
        if (photoSection) {
            photoSection.classList.add('invalid');
        }
    }

    if (missingFields.length > 0) {
        const message = missingFields.length === 1 
            ? `Please fill in: ${missingFields[0]}`
            : `Please fill in the following fields:\n• ${missingFields.join('\n• ')}`;
        return { valid: false, message, firstInvalidField, missingFields };
    }

    return { valid: true };
}

function markFieldInvalid(element, message) {
    const formGroup = element.closest('.form-group');
    if (formGroup) {
        formGroup.classList.add('invalid');
        
        // Add error message below field
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        formGroup.appendChild(errorDiv);
    }
    
    // Add red border to the input
    element.classList.add('input-error');
    
    // Remove error styling on input
    element.addEventListener('input', function onInput() {
        element.classList.remove('input-error');
        const formGroup = element.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('invalid');
            const error = formGroup.querySelector('.field-error');
            if (error) error.remove();
        }
        element.removeEventListener('input', onInput);
    }, { once: true });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    // Philippine phone format: 09XXXXXXXXX or +639XXXXXXXXX
    const phoneRegex = /^(\+63|0)?9\d{9}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

// ============================================================================
// CREATE TICKET
// ============================================================================

async function handleTicketSubmit(e) {
    e.preventDefault();
    
    if (!checkAuthentication()) {
        showNotification('You must be logged in to create tickets.', 'error');
        return;
    }

    // Validate required fields first
    const validationResult = validateTicketForm();
    if (!validationResult.valid) {
        showNotification(validationResult.message, 'error');
        // Scroll to first invalid field
        if (validationResult.firstInvalidField) {
            validationResult.firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            validationResult.firstInvalidField.focus();
        }
        return;
    }

    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Ticket...';
    }

    try {
        // Create FormData for file upload
        const formData = new FormData();
        
        // Get laptop model and try to extract brand
        let laptopModelValue = document.getElementById('laptopModel').value.trim();
        const laptopBrandValue = document.getElementById('laptopBrand')?.value?.trim() || '';
        
        // Try to extract brand from model if not specified (e.g., "Dell XPS 13" -> brand: "Dell")
        let brand = laptopBrandValue;
        if (!brand) {
            const parts = laptopModelValue.split(' ');
            brand = parts[0] || 'Unknown';
        }
        
        // Remove brand from model if model starts with brand name (to avoid duplication like "Dell Dell XPS")
        if (brand && laptopModelValue.toLowerCase().startsWith(brand.toLowerCase())) {
            laptopModelValue = laptopModelValue.substring(brand.length).trim();
            // If model becomes empty after removing brand, use original
            if (!laptopModelValue) {
                laptopModelValue = document.getElementById('laptopModel').value.trim();
            }
        }
        
        // Map form priority to API priority
        const priorityMap = {
            'standard': 'MEDIUM',
            'express': 'HIGH',
            'urgent': 'URGENT',
            'low': 'LOW',
            'medium': 'MEDIUM',
            'high': 'HIGH'
        };
        const formPriority = document.getElementById('priority').value.toLowerCase();
        const apiPriority = priorityMap[formPriority] || 'MEDIUM';
        
        // Add form fields
        formData.append('customerName', `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`);
        formData.append('customerEmail', document.getElementById('email').value);
        formData.append('customerPhone', document.getElementById('phone').value);
        formData.append('deviceType', 'Laptop');
        formData.append('deviceBrand', brand);
        formData.append('deviceModel', laptopModelValue);
        formData.append('serialNumber', document.getElementById('serialNumber').value);
        formData.append('issueDescription', document.getElementById('issue').value);
        formData.append('priority', apiPriority);
        
        // Add assigned technician if selected
        const technicianId = document.getElementById('technicianId')?.value;
        if (technicianId) {
            formData.append('technicianId', technicianId);
        }

        // Add photos
        let photoCount = 0;
        for (let i = 1; i <= 5; i++) {
            const photoInput = document.getElementById(`photo${i}`);
            if (photoInput && photoInput.files.length > 0) {
                formData.append('photos', photoInput.files[0]);
                photoCount++;
            }
        }

        // Validate minimum photos (at least 1 for now, can increase to 3 for production)
        if (photoCount < 1) {
            showNotification('Please upload at least 1 photo!', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Ticket';
            }
            return;
        }

        // Submit to API
        const response = await api.upload(API_CONFIG.ENDPOINTS.TICKETS, formData);

        if (response.success) {
            showNotification(`Ticket ${response.data.ticketNumber} created successfully!`, 'success');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Ticket creation error:', error);
        if (error.errors) {
            const firstError = error.errors[0];
            showNotification(`${firstError.field}: ${firstError.message}`, 'error');
        } else {
            showNotification(error.message || 'Failed to create ticket. Please try again.', 'error');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Create Ticket';
        }
    }
}

// ============================================================================
// LOAD ALL TICKETS
// ============================================================================

async function loadAllTickets(filters = {}) {
    const container = document.getElementById('ticketsContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading tickets...</p>
        </div>
    `;

    // Check if user has valid auth token
    if (!api.isAuthenticated()) {
        console.log('No access token found. Session:', localStorage.getItem('userSession'));
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Session expired. Please <a href="login.html">log in again</a> to view tickets.</p>
            </div>
        `;
        return;
    }

    try {
        // Build query string
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.search) params.append('search', filters.search);
        if (filters.assignedToMe) params.append('assignedToMe', filters.assignedToMe);
        params.append('page', filters.page || 1);
        params.append('limit', filters.limit || 20);

        console.log('Fetching tickets from:', `${API_CONFIG.ENDPOINTS.TICKETS}?${params.toString()}`);
        const response = await api.get(`${API_CONFIG.ENDPOINTS.TICKETS}?${params.toString()}`);
        console.log('API Response:', response);

        if (response.success) {
            renderTicketsList(response.data.tickets, response.data.pagination);
        } else {
            throw new Error(response.message || 'Failed to load tickets');
        }
    } catch (error) {
        console.error('Failed to load tickets:', error);
        
        // Show more specific error message
        let errorMsg = 'Failed to load tickets.';
        if (error.message === 'Session expired' || error.status === 401) {
            errorMsg = 'Session expired. Please <a href="login.html">log in again</a>.';
        } else if (error.message && error.message.includes('Network')) {
            errorMsg = 'Network error. Please check your connection.';
        } else {
            errorMsg = `Error: ${error.message}`;
        }
        
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${errorMsg} <a href="#" onclick="loadAllTickets()">Try again</a></p>
            </div>
        `;
    }
}

function renderTicketsList(tickets, pagination) {
    const container = document.getElementById('ticketsContainer');
    if (!container) return;

    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="no-tickets">
                <i class="fas fa-ticket-alt"></i>
                <p>No tickets found.</p>
                <a href="create-ticket.html" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Create New Ticket
                </a>
            </div>
        `;
        return;
    }

    let html = '<div class="tickets-grid">';
    
    tickets.forEach(ticket => {
        const statusClass = ticket.status.toLowerCase().replace(/_/g, '-');
        const priorityClass = ticket.priority.toLowerCase();
        const technicianName = ticket.technician 
            ? `${ticket.technician.firstName} ${ticket.technician.lastName}` 
            : 'Unassigned';
        
        html += `
            <div class="ticket-card" onclick="openTicketDetails('${ticket.id}')">
                <div class="ticket-card-header">
                    <span class="ticket-number">${ticket.ticketNumber}</span>
                    <span class="status-badge ${statusClass}">${formatStatus(ticket.status)}</span>
                </div>
                <div class="ticket-card-body">
                    <h3>${ticket.customerName}</h3>
                    <div class="device-info">
                        <i class="fas fa-laptop"></i>
                        ${ticket.deviceModel?.toLowerCase().startsWith(ticket.deviceBrand?.toLowerCase()) ? ticket.deviceModel : `${ticket.deviceBrand} ${ticket.deviceModel}`}
                    </div>
                    <p class="issue-preview">${truncate(ticket.issueDescription, 80)}</p>
                    <div class="technician-info">
                        <i class="fas fa-user-cog"></i>
                        <span>${technicianName}</span>
                    </div>
                </div>
                <div class="ticket-card-footer">
                    <span class="priority-badge ${priorityClass}">
                        <i class="fas fa-flag"></i> ${ticket.priority}
                    </span>
                    <span class="ticket-date">
                        <i class="fas fa-clock"></i> ${formatRelativeTime(ticket.createdAt)}
                    </span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';

    // Add pagination
    if (pagination && pagination.pages > 1) {
        html += renderPagination(pagination);
    }

    container.innerHTML = html;
}

function renderPagination(pagination) {
    let html = '<div class="pagination">';
    
    // Previous button
    html += `
        <button class="page-btn" ${pagination.page <= 1 ? 'disabled' : ''} 
                onclick="changePage(${pagination.page - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page) {
            html += `<button class="page-btn active">${i}</button>`;
        } else if (i <= 3 || i > pagination.pages - 2 || Math.abs(i - pagination.page) <= 1) {
            html += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        } else if (i === 4 || i === pagination.pages - 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }

    // Next button
    html += `
        <button class="page-btn" ${pagination.page >= pagination.pages ? 'disabled' : ''} 
                onclick="changePage(${pagination.page + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    html += '</div>';
    return html;
}

function changePage(page) {
    const currentFilters = getCurrentFilters();
    loadAllTickets({ ...currentFilters, page });
}

function getCurrentFilters() {
    const session = getUserSession();
    const role = session?.role?.toUpperCase();
    
    const filters = {
        status: document.getElementById('statusFilter')?.value || '',
        priority: document.getElementById('priorityFilter')?.value || '',
        search: document.getElementById('searchInput')?.value || ''
    };
    
    // Technicians should only see their assigned tickets
    if (role === 'TECHNICIAN') {
        filters.assignedToMe = 'true';
    }
    
    return filters;
}

// ============================================================================
// TICKET DETAILS
// ============================================================================

async function openTicketDetails(ticketId) {
    try {
        const response = await api.get(`${API_CONFIG.ENDPOINTS.TICKETS}/${ticketId}`);
        console.log('Ticket details response:', response);
        
        if (response.success && response.data) {
            showTicketModal(response.data);
        } else if (response.data) {
            // Response might have data directly without success wrapper
            showTicketModal(response.data);
        } else {
            showNotification('Failed to load ticket details.', 'error');
        }
    } catch (error) {
        console.error('Error loading ticket details:', error);
        showNotification('Failed to load ticket details.', 'error');
    }
}

function showTicketModal(ticket) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    // Group photos by stage
    const photosByStage = {
        RECEIVED: [],
        DURING_REPAIR: [],
        REPAIRED: []
    };
    
    if (ticket.photos && ticket.photos.length > 0) {
        ticket.photos.forEach(p => {
            const stage = p.stage || 'RECEIVED';
            if (photosByStage[stage]) {
                photosByStage[stage].push(p);
            }
        });
    }

    const stageLabels = {
        RECEIVED: 'When Received',
        DURING_REPAIR: 'During Repair',
        REPAIRED: 'After Repair'
    };

    // Build photos HTML grouped by stage
    let photosHtml = '';
    Object.keys(photosByStage).forEach(stage => {
        const photos = photosByStage[stage];
        if (photos.length > 0) {
            photosHtml += `
                <div class="photo-stage-section">
                    <h4><i class="fas fa-camera"></i> ${stageLabels[stage]}</h4>
                    <div class="photo-gallery">
                        ${photos.map(p => {
                            const photoPath = p.path.startsWith('/') ? p.path.substring(1) : p.path;
                            return `<img src="${photoPath}" alt="Ticket photo" onclick="openImageViewer(this.src)">`;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    });

    modal.innerHTML = `
        <div class="modal-content ticket-details-modal">
            <div class="modal-header">
                <h2><i class="fas fa-ticket-alt"></i> ${ticket.ticketNumber}</h2>
                <button class="close-btn" onclick="closeModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="ticket-info-grid">
                    <div class="detail-section">
                        <h3><i class="fas fa-user"></i> Customer Information</h3>
                        <p><strong>Name:</strong> ${ticket.customerName}</p>
                        <p><strong>Email:</strong> ${ticket.customerEmail}</p>
                        <p><strong>Phone:</strong> ${ticket.customerPhone}</p>
                    </div>
                    <div class="detail-section">
                        <h3><i class="fas fa-laptop"></i> Device Information</h3>
                        <p><strong>Type:</strong> ${ticket.deviceType}</p>
                        <p><strong>Model:</strong> ${ticket.deviceModel}</p>
                        ${ticket.serialNumber ? `<p><strong>Serial:</strong> ${ticket.serialNumber}</p>` : ''}
                    </div>
                </div>
                <div class="detail-section">
                    <h3><i class="fas fa-user-cog"></i> Assigned Technician</h3>
                    <p class="technician-name">${ticket.technician ? `${ticket.technician.firstName} ${ticket.technician.lastName}` : '<span class="not-assigned">Not yet assigned</span>'}</p>
                </div>
                <div class="detail-section">
                    <h3><i class="fas fa-exclamation-circle"></i> Issue Description</h3>
                    <p class="issue-text">${ticket.issueDescription}</p>
                </div>
                ${ticket.warrantyDays && ticket.warrantyExpires ? `
                <div class="detail-section warranty-details">
                    <h3><i class="fas fa-shield-alt"></i> Warranty Information</h3>
                    <div class="warranty-info-box ${new Date(ticket.warrantyExpires) < new Date() ? 'expired' : 'active'}">
                        <div class="warranty-row">
                            <span><strong>Warranty Period:</strong></span>
                            <span>${ticket.warrantyDays} days</span>
                        </div>
                        <div class="warranty-row">
                            <span><strong>Expires On:</strong></span>
                            <span>${new Date(ticket.warrantyExpires).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div class="warranty-status">
                            ${new Date(ticket.warrantyExpires) < new Date() 
                                ? '<span class="warranty-badge expired"><i class="fas fa-times-circle"></i> Warranty Expired</span>'
                                : '<span class="warranty-badge active"><i class="fas fa-check-circle"></i> Warranty Active</span>'}
                        </div>
                    </div>
                </div>
                ` : ''}
                <div class="detail-section">
                    <h3><i class="fas fa-history"></i> Status Timeline</h3>
                    <div class="timeline">
                        ${renderTimeline(ticket.timeline)}
                    </div>
                </div>
                ${photosHtml ? `
                    <div class="detail-section photos-section">
                        <h3><i class="fas fa-images"></i> Photos</h3>
                        ${photosHtml}
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                ${canUpdateTicket() ? `
                    <button class="btn btn-primary" onclick="showUpdateStatusModal('${ticket.id}', '${ticket.status}')">
                        <i class="fas fa-edit"></i> Update Ticket
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Subscribe to real-time updates for this ticket (if socket is available)
    if (typeof socketClient !== 'undefined' && socketClient.subscribeToTicket) {
        socketClient.subscribeToTicket(ticket.ticketNumber);
    }
}

function renderTimeline(timeline) {
    if (!timeline || timeline.length === 0) return '<p>No timeline entries</p>';

    return timeline.map(entry => `
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <h4>${formatStatus(entry.status)}</h4>
                <p>${entry.description || ''}</p>
                <span class="timeline-date">${formatDate(entry.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// ============================================================================
// UPDATE TICKET STATUS
// ============================================================================

function canUpdateTicket() {
    const session = getUserSession();
    return session && ['TECHNICIAN', 'ADMIN'].includes(session.role);
}

function showUpdateStatusModal(ticketId, currentStatus) {
    const statuses = ['RECEIVED', 'DIAGNOSED', 'WAITING_PARTS', 'IN_PROGRESS', 'READY', 'COMPLETED', 'RETURNED', 'CANCELLED'];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay status-update-modal';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    modal.innerHTML = `
        <div class="modal-content update-modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Update Ticket</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body update-modal-body">
                <!-- Tab Navigation -->
                <div class="update-tabs">
                    <button class="update-tab active" data-tab="status">
                        <i class="fas fa-clipboard-check"></i> Update Status
                    </button>
                    <button class="update-tab" data-tab="transfer">
                        <i class="fas fa-exchange-alt"></i> Transfer
                    </button>
                    <button class="update-tab" data-tab="photos">
                        <i class="fas fa-camera"></i> Add Photos
                    </button>
                </div>

                <!-- Status Update Tab -->
                <div class="update-tab-content active" id="statusTab">
                    <div class="form-group">
                        <label for="newStatus">New Status</label>
                        <select id="newStatus" class="form-control" onchange="toggleWarrantySection()">
                            ${statuses.map(s => `
                                <option value="${s}" ${s === currentStatus ? 'selected' : ''}>
                                    ${formatStatus(s)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <!-- Warranty Section - Only visible when COMPLETED is selected -->
                    <div class="form-group warranty-section" id="warrantySection" style="display: none;">
                        <label for="warrantyDays">Warranty Period</label>
                        <select id="warrantyDays" class="form-control" onchange="calculateWarrantyExpiry()">
                            <option value="0">No Warranty</option>
                            <option value="7">7 Days</option>
                            <option value="14">14 Days</option>
                            <option value="30" selected>30 Days (1 Month)</option>
                            <option value="60">60 Days (2 Months)</option>
                            <option value="90">90 Days (3 Months)</option>
                            <option value="180">180 Days (6 Months)</option>
                            <option value="365">365 Days (1 Year)</option>
                        </select>
                        <div class="warranty-expiry-info" id="warrantyExpiryInfo" style="margin-top: 10px; padding: 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; display: none;">
                            <div style="display: flex; align-items: center; gap: 8px; color: #166534;">
                                <i class="fas fa-shield-alt"></i>
                                <span><strong>Warranty Expires:</strong> <span id="warrantyExpiryDate"></span></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="statusNote">Note (optional)</label>
                        <textarea id="statusNote" class="form-control" rows="3" 
                                  placeholder="Add a note about this status change..."></textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="submitStatusUpdate('${ticketId}')">
                            <i class="fas fa-save"></i> Update Status
                        </button>
                    </div>
                </div>

                <!-- Transfer Technician Tab -->
                <div class="update-tab-content" id="transferTab">
                    <div class="form-group">
                        <label for="transferTechnicianId">Transfer to Technician</label>
                        <select id="transferTechnicianId" class="form-control">
                            <option value="">Loading technicians...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="transferReason">Reason for Transfer (optional)</label>
                        <textarea id="transferReason" class="form-control" rows="3" 
                                  placeholder="e.g., Specialist needed for this type of repair..."></textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-warning" onclick="submitTransfer('${ticketId}')">
                            <i class="fas fa-exchange-alt"></i> Transfer Ticket
                        </button>
                    </div>
                </div>

                <!-- Add Photos Tab -->
                <div class="update-tab-content" id="photosTab">
                    <div class="form-group">
                        <label for="photoStage">Photo Stage <span class="required">*</span></label>
                        <select id="photoStage" class="form-control">
                            <option value="DURING_REPAIR">During Repair (Progress photos)</option>
                            <option value="REPAIRED">Repaired (Completed repair)</option>
                        </select>
                        <small class="form-hint">At least 1 photo required, maximum 3 photos per stage</small>
                    </div>
                    <div class="photo-upload-section">
                        <div class="update-photo-grid">
                            <div class="update-photo-slot" onclick="document.getElementById('updatePhoto1').click()">
                                <input type="file" id="updatePhoto1" accept="image/*" style="display:none;" onchange="handleUpdatePhotoPreview(1)">
                                <div class="upload-placeholder" id="uploadPlaceholder1">
                                    <i class="fas fa-camera"></i>
                                    <span>Photo 1</span>
                                </div>
                                <div class="photo-preview-img" id="updatePreview1"></div>
                            </div>
                            <div class="update-photo-slot" onclick="document.getElementById('updatePhoto2').click()">
                                <input type="file" id="updatePhoto2" accept="image/*" style="display:none;" onchange="handleUpdatePhotoPreview(2)">
                                <div class="upload-placeholder" id="uploadPlaceholder2">
                                    <i class="fas fa-camera"></i>
                                    <span>Photo 2</span>
                                </div>
                                <div class="photo-preview-img" id="updatePreview2"></div>
                            </div>
                            <div class="update-photo-slot" onclick="document.getElementById('updatePhoto3').click()">
                                <input type="file" id="updatePhoto3" accept="image/*" style="display:none;" onchange="handleUpdatePhotoPreview(3)">
                                <div class="upload-placeholder" id="uploadPlaceholder3">
                                    <i class="fas fa-camera"></i>
                                    <span>Photo 3</span>
                                </div>
                                <div class="photo-preview-img" id="updatePreview3"></div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-success" onclick="submitPhotos('${ticketId}')">
                            <i class="fas fa-upload"></i> Upload Photos
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Setup tab switching
    modal.querySelectorAll('.update-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active from all tabs and contents
            modal.querySelectorAll('.update-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.update-tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active to clicked tab and corresponding content
            this.classList.add('active');
            const tabId = this.dataset.tab + 'Tab';
            document.getElementById(tabId).classList.add('active');
            
            // Load technicians when transfer tab is clicked
            if (this.dataset.tab === 'transfer') {
                loadTechniciansForTransfer();
            }
        });
    });

    // Initialize warranty section visibility
    toggleWarrantySection();
}

// Toggle warranty section based on selected status
function toggleWarrantySection() {
    const status = document.getElementById('newStatus')?.value;
    const warrantySection = document.getElementById('warrantySection');
    
    if (warrantySection) {
        if (status === 'COMPLETED') {
            warrantySection.style.display = 'block';
            calculateWarrantyExpiry();
        } else {
            warrantySection.style.display = 'none';
        }
    }
}

// Calculate and display warranty expiry date
function calculateWarrantyExpiry() {
    const warrantyDays = parseInt(document.getElementById('warrantyDays')?.value || 0);
    const expiryInfo = document.getElementById('warrantyExpiryInfo');
    const expiryDate = document.getElementById('warrantyExpiryDate');
    
    if (warrantyDays > 0 && expiryInfo && expiryDate) {
        const today = new Date();
        const expiry = new Date(today);
        expiry.setDate(expiry.getDate() + warrantyDays);
        
        const formattedDate = expiry.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        expiryDate.textContent = formattedDate;
        expiryInfo.style.display = 'block';
    } else if (expiryInfo) {
        expiryInfo.style.display = 'none';
    }
}

// Handle photo preview for update modal
function handleUpdatePhotoPreview(index) {
    const input = document.getElementById(`updatePhoto${index}`);
    const preview = document.getElementById(`updatePreview${index}`);
    const placeholder = document.getElementById(`uploadPlaceholder${index}`);
    const file = input.files[0];
    
    if (file) {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File too large. Maximum size is 5MB.', 'error');
            input.value = '';
            return;
        }

        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
            showNotification('Invalid file type. Only JPEG, PNG, GIF, WebP allowed.', 'error');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-photo-btn" onclick="event.stopPropagation(); removeUpdatePhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.classList.add('has-image');
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function removeUpdatePhoto(index) {
    const input = document.getElementById(`updatePhoto${index}`);
    const preview = document.getElementById(`updatePreview${index}`);
    const placeholder = document.getElementById(`uploadPlaceholder${index}`);
    input.value = '';
    preview.innerHTML = '';
    preview.classList.remove('has-image');
    if (placeholder) placeholder.style.display = 'flex';
}

// Load technicians for transfer dropdown
async function loadTechniciansForTransfer() {
    const select = document.getElementById('transferTechnicianId');
    if (!select) return;
    
    try {
        const response = await api.get(API_CONFIG.ENDPOINTS.USERS + '/technicians');
        if (response.success && response.data) {
            select.innerHTML = '<option value="">Select a technician...</option>';
            response.data.forEach(tech => {
                select.innerHTML += `<option value="${tech.id}">${tech.firstName} ${tech.lastName}</option>`;
            });
        }
    } catch (error) {
        console.error('Failed to load technicians:', error);
        select.innerHTML = '<option value="">Failed to load technicians</option>';
    }
}

async function submitStatusUpdate(ticketId) {
    const status = document.getElementById('newStatus').value;
    const description = document.getElementById('statusNote').value;
    const warrantyDays = status === 'COMPLETED' ? parseInt(document.getElementById('warrantyDays')?.value || 0) : 0;
    const btn = document.querySelector('.status-update-modal .btn-primary');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    }

    try {
        const payload = {
            status,
            description
        };
        
        // Include warranty days if completing
        if (status === 'COMPLETED' && warrantyDays > 0) {
            payload.warrantyDays = warrantyDays;
        }

        const response = await api.patch(`${API_CONFIG.ENDPOINTS.TICKETS}/${ticketId}/status`, payload);

        if (response.success) {
            showNotification('Status updated successfully!', 'success');
            document.querySelector('.status-update-modal').remove();
            closeModal();
            loadAllTickets();
            // Refresh dashboard sections if on dashboard page
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
            // Refresh technician badge
            if (typeof loadActiveTicketsBadgeCount === 'function') {
                loadActiveTicketsBadgeCount();
            }
        }
    } catch (error) {
        showNotification(error.message || 'Failed to update status.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Update Status';
        }
    }
}

async function submitTransfer(ticketId) {
    const technicianId = document.getElementById('transferTechnicianId').value;
    const reason = document.getElementById('transferReason').value;
    const btn = document.querySelector('#transferTab .btn-warning');

    if (!technicianId) {
        showNotification('Please select a technician to transfer to.', 'error');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Transferring...';
    }

    try {
        const response = await api.patch(`${API_CONFIG.ENDPOINTS.TICKETS}/${ticketId}/transfer`, {
            technicianId,
            reason
        });

        if (response.success) {
            showNotification(response.message || 'Ticket transferred successfully!', 'success');
            document.querySelector('.status-update-modal').remove();
            closeModal();
            loadAllTickets();
        }
    } catch (error) {
        showNotification(error.message || 'Failed to transfer ticket.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-exchange-alt"></i> Transfer Ticket';
        }
    }
}

async function submitPhotos(ticketId) {
    const stage = document.getElementById('photoStage').value;
    const btn = document.querySelector('#photosTab .btn-success');
    
    // Collect photos
    const formData = new FormData();
    let photoCount = 0;
    
    for (let i = 1; i <= 3; i++) {
        const input = document.getElementById(`updatePhoto${i}`);
        if (input && input.files.length > 0) {
            formData.append('photos', input.files[0]);
            photoCount++;
        }
    }

    if (photoCount === 0) {
        showNotification('Please select at least 1 photo to upload.', 'error');
        return;
    }

    formData.append('stage', stage);

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    }

    try {
        const response = await api.upload(`${API_CONFIG.ENDPOINTS.TICKETS}/${ticketId}/photos`, formData);

        if (response.success) {
            showNotification(response.message || 'Photos uploaded successfully!', 'success');
            document.querySelector('.status-update-modal').remove();
            closeModal();
            loadAllTickets();
        }
    } catch (error) {
        showNotification(error.message || 'Failed to upload photos.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-upload"></i> Upload Photos';
        }
    }
}

// ============================================================================
// DELETE TICKET
// ============================================================================

async function deleteTicket(ticketId) {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await api.delete(`${API_CONFIG.ENDPOINTS.TICKETS}/${ticketId}`);
        
        if (response.success) {
            showNotification('Ticket deleted successfully!', 'success');
            closeModal();
            loadAllTickets();
        }
    } catch (error) {
        showNotification(error.message || 'Failed to delete ticket.', 'error');
    }
}

// ============================================================================
// SEARCH AND FILTER
// ============================================================================

function setupFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const searchInput = document.getElementById('searchInput');

    if (statusFilter) {
        statusFilter.addEventListener('change', () => loadAllTickets(getCurrentFilters()));
    }
    
    if (priorityFilter) {
        priorityFilter.addEventListener('change', () => loadAllTickets(getCurrentFilters()));
    }

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadAllTickets(getCurrentFilters());
            }, 300);
        });
    }
}

// Initialize filters
document.addEventListener('DOMContentLoaded', setupFilters);

// ============================================================================
// IMAGE VIEWER
// ============================================================================

function openImageViewer(src) {
    const viewer = document.createElement('div');
    viewer.className = 'image-viewer';
    viewer.onclick = () => viewer.remove();
    viewer.innerHTML = `
        <img src="${src}" alt="Full size image">
        <button class="close-viewer"><i class="fas fa-times"></i></button>
    `;
    document.body.appendChild(viewer);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Truncate text to specified length
 */
function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Format status for display
 */
function formatStatus(status) {
    if (!status) return 'Unknown';
    const statusMap = {
        'RECEIVED': 'Received',
        'DIAGNOSED': 'Diagnosed',
        'WAITING_PARTS': 'Parts Ordered',
        'IN_PROGRESS': 'Repair in Progress',
        'READY': 'Ready for Pickup',
        'COMPLETED': 'Completed',
        'RETURNED': 'Returned (Back Job)',
        'CANCELLED': 'Cancelled'
    };
    return statusMap[status.toUpperCase()] || status.replace(/_/g, ' ');
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 7) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
