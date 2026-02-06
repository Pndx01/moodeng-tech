// ============================================================================
// AUTHENTICATION SYSTEM
// ============================================================================

// ============================================================================
// NOTIFICATION BADGES
// ============================================================================

// Pending Accounts Badge (Admin only)
async function loadPendingBadgeCount() {
    try {
        const response = await api.get('/users/pending');
        if (response.success) {
            const pendingUsers = response.data.users || response.data || [];
            const count = Array.isArray(pendingUsers) ? pendingUsers.length : 0;
            updatePendingBadge(count);
        }
    } catch (error) {
        console.error('Failed to load pending count:', error);
    }
}

function updatePendingBadge(count) {
    const badge = document.getElementById('pendingBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Messages Badge (Admin only - contact form messages)
function loadMessagesBadgeCount() {
    const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    const unreadCount = messages.filter(m => !m.isRead).length;
    updateMessagesBadge(unreadCount);
}

function updateMessagesBadge(count) {
    const badge = document.getElementById('messagesBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// System Notifications Badge (All users)
async function loadNotificationsBadgeCount() {
    try {
        if (typeof api === 'undefined' || !api.isAuthenticated()) return;
        
        const response = await api.get(API_CONFIG.ENDPOINTS.UNREAD_COUNT);
        if (response.success) {
            const count = response.data.count || 0;
            updateNotificationsBadge(count);
        }
    } catch (error) {
        console.error('Failed to load notifications count:', error);
    }
}

function updateNotificationsBadge(count) {
    const badge = document.getElementById('notificationsBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Load all applicable badges
function loadAllBadges() {
    const session = getUserSession();
    if (!session) return;
    
    const role = session.role?.toUpperCase();
    
    // Load notifications for all users
    loadNotificationsBadgeCount();
    
    if (role === 'ADMIN') {
        loadPendingBadgeCount();
        loadMessagesBadgeCount();
    }
    
    if (role === 'TECHNICIAN') {
        loadActiveTicketsBadgeCount();
    }
}

// Active Tickets Badge (Technician only)
async function loadActiveTicketsBadgeCount() {
    try {
        if (typeof api === 'undefined' || !api.isAuthenticated()) return;
        
        const session = getUserSession();
        if (!session) return;
        
        const response = await api.get(`${API_CONFIG.ENDPOINTS.TICKETS}?limit=100`);
        if (response.success) {
            const tickets = response.data.tickets || [];
            // Count tickets assigned to this technician that are active (not completed/cancelled)
            const activeStatuses = ['RECEIVED', 'DIAGNOSED', 'WAITING_PARTS', 'IN_PROGRESS', 'READY', 'RETURNED'];
            const activeCount = tickets.filter(t => 
                t.technicianId === session.id && activeStatuses.includes(t.status)
            ).length;
            updateActiveTicketsBadge(activeCount);
        }
    } catch (error) {
        console.error('Failed to load active tickets count:', error);
    }
}

function updateActiveTicketsBadge(count) {
    const badge = document.getElementById('activeTicketsBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Make functions globally available
window.loadPendingBadgeCount = loadPendingBadgeCount;
window.updatePendingBadge = updatePendingBadge;
window.loadMessagesBadgeCount = loadMessagesBadgeCount;
window.updateMessagesBadge = updateMessagesBadge;
window.loadNotificationsBadgeCount = loadNotificationsBadgeCount;
window.updateNotificationsBadge = updateNotificationsBadge;
window.loadActiveTicketsBadgeCount = loadActiveTicketsBadgeCount;
window.updateActiveTicketsBadge = updateActiveTicketsBadge;
window.loadAllBadges = loadAllBadges;

// ============================================================================
// PASSWORD TOGGLE VISIBILITY
// ============================================================================

function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleBtn = passwordInput.parentElement.querySelector('.password-toggle');
    const eyeIcon = toggleBtn.querySelector('.eye-icon');
    const eyeOffIcon = toggleBtn.querySelector('.eye-off-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.style.display = 'none';
        eyeOffIcon.style.display = 'block';
    } else {
        passwordInput.type = 'password';
        eyeIcon.style.display = 'block';
        eyeOffIcon.style.display = 'none';
    }
}

// ============================================================================
// HIGHLIGHT ACTIVE NAV LINK
// ============================================================================

function highlightActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || 
            (currentPage === '' && href === 'index.html') ||
            (currentPage === 'index.html' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Demo users (in production, this would be a real database)
const demoUsers = [
    {
        id: 1,
        email: 'admin@moodengtech.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        phone: '09123456789'
    },
    {
        id: 2,
        email: 'tech@moodengtech.com',
        password: 'tech123',
        firstName: 'Tech',
        lastName: 'Support',
        role: 'tech',
        phone: '09987654321'
    }
];

// ============================================================================
// LOGIN FUNCTIONALITY
// ============================================================================

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.querySelector('button[type="submit"]');

    // Disable button during request
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
    }

    // Try API login first (if API is available)
    if (typeof api !== 'undefined' && typeof API_CONFIG !== 'undefined') {
        try {
            // Use skipAuth to prevent token refresh logic during login
            const response = await api.post(API_CONFIG.ENDPOINTS.LOGIN, { email, password }, { skipAuth: true });
            
            if (response.success) {
                // Store session with tokens
                api.setTokens(response.data);
                
                showNotification(`Welcome back, ${response.data.user.firstName}!`, 'success');
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
                return;
            } else {
                // API returned error
                const errorMsg = response.message || 'Invalid email or password.';
                showNotification(errorMsg, 'error');
                showLoginError(errorMsg);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Login';
                }
                return;
            }
        } catch (error) {
            // Check if it's a pending approval error
            if (error.message && error.message.includes('under review')) {
                showPendingApprovalMessage();
            } else if (error.message && error.message.includes('REJECTED')) {
                showRejectedMessage();
            } else {
                const errorMsg = error.message || 'Login failed. Please try again.';
                showNotification(errorMsg, 'error');
                showLoginError(errorMsg);
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
            return;
        }
    }

    // Fallback to localStorage-based login ONLY if API not available
    const user = demoUsers.find(u => u.email === email && u.password === password);
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const registeredUser = registeredUsers.find(u => u.email === email && u.password === password);

    const authenticatedUser = user || registeredUser;

    if (authenticatedUser) {
        const sessionData = {
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            firstName: authenticatedUser.firstName,
            lastName: authenticatedUser.lastName,
            role: authenticatedUser.role,
            phone: authenticatedUser.phone,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('userSession', JSON.stringify(sessionData));
        showNotification(`Welcome back, ${authenticatedUser.firstName}!`, 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        const errorMsg = 'Invalid email or password. Please try again.';
        showNotification(errorMsg, 'error');
        showLoginError(errorMsg);
    }

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

// ============================================================================
// REGISTER FUNCTIONALITY
// ============================================================================

async function handleRegister() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = document.querySelector('button[type="submit"]');

    // Validate passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    // Validate password strength
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters!', 'error');
        return;
    }

    // Validate username
    if (!username || username.length < 3) {
        showNotification('Username must be at least 3 characters!', 'error');
        return;
    }

    // Disable button during request
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
    }

    try {
        // Use API if available
        if (typeof api !== 'undefined' && typeof API_CONFIG !== 'undefined') {
            const response = await api.post(API_CONFIG.ENDPOINTS.REGISTER, {
                email,
                username,
                password,
                firstName,
                lastName,
                phone
            });

            if (response.success) {
                // Show pending approval message
                showNotification('Registration submitted! Waiting for admin approval.', 'success');
                
                // Show a more detailed message in the form area
                const form = document.getElementById('registerForm');
                if (form) {
                    form.innerHTML = `
                        <div style="text-align: center; padding: 2rem;">
                            <div style="font-size: 4rem; margin-bottom: 1rem;"></div>
                            <h2 style="color: #f59e0b; margin-bottom: 1rem;">Waiting for Approval</h2>
                            <p style="color: #6b7280; margin-bottom: 1.5rem;">
                                Your account has been submitted for review.<br>
                                An administrator will review and approve your account shortly.
                            </p>
                            <p style="color: #6b7280; font-size: 0.9rem;">
                                You will be able to log in once your account is approved.
                            </p>
                            <a href="login.html" class="btn btn-primary" style="display: inline-block; margin-top: 1.5rem;">Return to Login</a>
                        </div>
                    `;
                }
            }
        } else {
            // Fallback to localStorage if API not available
            fallbackLocalStorageRegister(firstName, lastName, email, phone, password);
        }
    } catch (error) {
        // Handle specific error messages from API
        if (error.errors && error.errors.length > 0) {
            // Show the first validation error
            const firstError = error.errors[0];
            showNotification(firstError.message || `${firstError.field}: Invalid value`, 'error');
        } else if (error.message && error.message.includes('already registered')) {
            showNotification('This email is already registered. Please login instead.', 'error');
        } else if (error.message) {
            showNotification(error.message, 'error');
        } else {
            showNotification('Registration failed. Please try again.', 'error');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    }
}

// Fallback for localStorage registration (when API is not available)
function fallbackLocalStorageRegister(firstName, lastName, email, phone, password) {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const existingUser = registeredUsers.find(u => u.email === email);
    
    if (existingUser) {
        showNotification('Email already registered. Please login instead.', 'error');
        return;
    }

    // Create new user
    const newUser = {
        id: Date.now(),
        firstName,
        lastName,
        email,
        phone,
        password,
        role: 'customer',
        isApproved: false,
        createdAt: new Date().toISOString()
    };

    // Save to localStorage
    registeredUsers.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

    showNotification('Registration submitted! Waiting for admin approval.', 'success');
    
    const form = document.getElementById('registerForm');
    if (form) {
        form.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;"></div>
                <h2 style="color: #f59e0b; margin-bottom: 1rem;">Waiting for Approval</h2>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">
                    Your account has been submitted for review.<br>
                    An administrator will review and approve your account shortly.
                </p>
                <a href="login.html" class="btn btn-primary" style="display: inline-block; margin-top: 1.5rem;">Return to Login</a>
            </div>
        `;
    }
}

// ============================================================================
// CHECK AUTHENTICATION
// ============================================================================

function checkAuthentication() {
    const session = getUserSession();
    
    if (!session) {
        // Not logged in, redirect to login
        showNotification('Please login to access this page.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }

    return true;
}

// ============================================================================
// GET USER SESSION
// ============================================================================

function getUserSession() {
    const localSession = localStorage.getItem('userSession');
    
    if (localSession) {
        try {
            const parsed = JSON.parse(localSession);
            // Handle both old format (direct properties) and new API format (nested user object)
            if (parsed.user) {
                return {
                    id: parsed.user.id,
                    email: parsed.user.email,
                    firstName: parsed.user.firstName,
                    lastName: parsed.user.lastName,
                    role: parsed.user.role,
                    phone: parsed.user.phone,
                    loginTime: parsed.loginTime
                };
            }
            return parsed;
        } catch (e) {
            console.error('Error parsing session:', e);
            return null;
        }
    }
    
    return null;
}

// ============================================================================
// LOGOUT FUNCTIONALITY
// ============================================================================

function logoutUser() {
    localStorage.removeItem('userSession');
    
    showNotification('Logged out successfully!', 'success');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// ============================================================================
// UPDATE HEADER FOR AUTHENTICATED USERS
// ============================================================================

function updateHeaderForAuth() {
    const session = getUserSession();
    const nav = document.querySelector('.nav');
    
    if (!nav) return;
    
    // Remove any existing auth links to prevent duplicates
    const existingAuthLinks = nav.querySelectorAll('.auth-link');
    existingAuthLinks.forEach(link => link.remove());
    
    // Remove the default login link from header.html
    const defaultLoginLink = nav.querySelector('a[href="login.html"]:not(.auth-link)');
    if (defaultLoginLink) {
        defaultLoginLink.remove();
    }
    
    if (session) {
        // User is logged in - show Dashboard and Logout
        const dashboardLink = document.createElement('a');
        dashboardLink.href = 'dashboard.html';
        dashboardLink.className = 'nav-link auth-link';
        dashboardLink.textContent = 'Dashboard';
        
        nav.appendChild(dashboardLink);
        
        // Show admin/tech links
        const role = session.role?.toUpperCase();
        
        // Hide links based on role
        if (role === 'CUSTOMER') {
            // Customers only see: Repair Tracker, Dashboard, Logout
            const hideForCustomer = ['index.html', 'about.html', 'services.html', 'contact.html'];
            hideForCustomer.forEach(href => {
                const link = nav.querySelector(`a[href="${href}"]`);
                if (link) {
                    link.style.display = 'none';
                }
            });
        } else if (role === 'ADMIN' || role === 'TECHNICIAN') {
            // Hide Home, About Us, Services, Contact links for admin and technician
            const publicLinks = ['index.html', 'about.html', 'services.html', 'contact.html'];
            publicLinks.forEach(href => {
                const link = nav.querySelector(`a[href="${href}"]`);
                if (link) {
                    link.style.display = 'none';
                }
            });
        }
        
        // View Tickets link with badge for technicians
        if (role === 'TECHNICIAN') {
            const viewTicketsLink = document.createElement('a');
            viewTicketsLink.href = 'view-tickets.html';
            viewTicketsLink.className = 'nav-link auth-link nav-badge-link';
            viewTicketsLink.innerHTML = 'My Tickets <span class="nav-badge warning" id="activeTicketsBadge" style="display: none;">0</span>';
            nav.appendChild(viewTicketsLink);
            
            // Load active tickets count for technician
            loadActiveTicketsBadgeCount();
        }
        
        if (role === 'ADMIN') {
            
            // Manage Accounts link
            const manageLink = document.createElement('a');
            manageLink.href = 'manage-accounts.html';
            manageLink.className = 'nav-link auth-link';
            manageLink.textContent = 'Manage Accounts';
            nav.appendChild(manageLink);
            
            // Messages link with badge
            const messagesLink = document.createElement('a');
            messagesLink.href = 'messages.html';
            messagesLink.className = 'nav-link auth-link nav-badge-link';
            messagesLink.innerHTML = 'Messages <span class="nav-badge" id="messagesBadge" style="display: none;">0</span>';
            nav.appendChild(messagesLink);
            
            // Pending Accounts link with badge
            const pendingLink = document.createElement('a');
            pendingLink.href = 'pending-accounts.html';
            pendingLink.className = 'nav-link auth-link nav-badge-link';
            pendingLink.innerHTML = 'Pending <span class="nav-badge" id="pendingBadge" style="display: none;">0</span>';
            nav.appendChild(pendingLink);
            
            // Load badges for admin
            loadPendingBadgeCount();
            loadMessagesBadgeCount();
        }
        
        // Hide register link when logged in
        const registerLink = document.getElementById('register-link');
        if (registerLink) {
            registerLink.style.display = 'none';
        }
        
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.className = 'nav-link auth-link';
        logoutLink.textContent = 'Logout';
        logoutLink.onclick = (e) => {
            e.preventDefault();
            logoutUser();
        };
        
        nav.appendChild(logoutLink);
    } else {
        // User is not logged in - show Login
        const loginLink = document.createElement('a');
        loginLink.href = 'login.html';
        loginLink.className = 'nav-link auth-link';
        loginLink.textContent = 'Login';
        
        nav.appendChild(loginLink);
    }
    
    // Highlight the active page link
    highlightActiveNavLink();
}

// ============================================================================
// LOGIN ERROR DISPLAY
// ============================================================================

function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.classList.add('show');
        
        // Re-trigger shake animation
        errorDiv.style.animation = 'none';
        errorDiv.offsetHeight; // Force reflow
        errorDiv.style.animation = 'shake 0.5s ease-in-out';
        
        // Scroll to error message to make sure it's visible
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function hideLoginError() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.classList.remove('show');
    }
}

// Clear error when user starts typing
function setupLoginErrorClear() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.addEventListener('input', hideLoginError);
    }
    if (passwordInput) {
        passwordInput.addEventListener('input', hideLoginError);
    }
}

// Initialize error clear on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLoginErrorClear);
} else {
    setupLoginErrorClear();
}

// ============================================================================
// NOTIFICATION FUNCTION
// ============================================================================

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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// ============================================================================
// PENDING APPROVAL MESSAGE
// ============================================================================

function showPendingApprovalMessage() {
    // Remove any existing pending modal
    const existingModal = document.getElementById('pendingApprovalModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'pendingApprovalModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            padding: 2.5rem;
            border-radius: 16px;
            max-width: 420px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.4s ease;
        ">
            <div style="font-size: 4rem; margin-bottom: 1rem;"></div>
            <h2 style="color: #1f2937; margin-bottom: 0.75rem; font-size: 1.5rem;">Account Under Review</h2>
            <p style="color: #6b7280; margin-bottom: 1.5rem; line-height: 1.6;">
                Your account registration has been received and is currently being reviewed by an administrator.
            </p>
            <p style="color: #f59e0b; font-weight: 500; margin-bottom: 1.5rem;">
                Please check back later once your account has been approved.
            </p>
            <button onclick="document.getElementById('pendingApprovalModal').remove()" style="
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 500;
                transition: transform 0.2s, box-shadow 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 15px rgba(59, 130, 246, 0.4)';" 
               onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                Got it
            </button>
        </div>
    `;

    // Add animation styles if not present
    if (!document.getElementById('pendingModalStyles')) {
        const style = document.createElement('style');
        style.id = 'pendingModalStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ============================================================================
// REJECTED ACCOUNT MESSAGE
// ============================================================================

function showRejectedMessage() {
    // Remove any existing modal
    const existingModal = document.getElementById('rejectedModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'rejectedModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            padding: 2.5rem;
            border-radius: 16px;
            max-width: 450px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.4s ease;
        ">
            <div style="font-size: 4rem; margin-bottom: 1rem;"></div>
            <h2 style="color: #dc2626; margin-bottom: 0.75rem; font-size: 1.5rem;">Registration Rejected</h2>
            <p style="color: #6b7280; margin-bottom: 1.5rem; line-height: 1.6;">
                We're sorry, but your account registration was not approved by an administrator.
            </p>
            <p style="color: #6b7280; margin-bottom: 1.5rem; line-height: 1.6; font-size: 0.9rem;">
                This may be due to incomplete or invalid information. Please try registering again with accurate details.
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <a href="register.html" style="
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                    text-decoration: none;
                    display: inline-block;
                    transition: transform 0.2s, box-shadow 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 15px rgba(16, 185, 129, 0.4)';" 
                   onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                    Register Again
                </a>
                <button onclick="document.getElementById('rejectedModal').remove()" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                    transition: transform 0.2s, box-shadow 0.2s;
                " onmouseover="this.style.background='#4b5563';" 
                   onmouseout="this.style.background='#6b7280';">
                    Close
                </button>
            </div>
        </div>
    `;

    // Add animation styles if not present
    if (!document.getElementById('pendingModalStyles')) {
        const style = document.createElement('style');
        style.id = 'pendingModalStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}
