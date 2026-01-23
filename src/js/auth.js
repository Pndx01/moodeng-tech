// ============================================================================
// AUTHENTICATION SYSTEM
// ============================================================================

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

function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    // Check if user exists
    const user = demoUsers.find(u => u.email === email && u.password === password);
    
    // Also check localStorage for registered users
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const registeredUser = registeredUsers.find(u => u.email === email && u.password === password);

    const authenticatedUser = user || registeredUser;

    if (authenticatedUser) {
        // Store user session
        const sessionData = {
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            firstName: authenticatedUser.firstName,
            lastName: authenticatedUser.lastName,
            role: authenticatedUser.role,
            phone: authenticatedUser.phone,
            loginTime: new Date().toISOString()
        };

        // Always use localStorage for persistent sessions
        localStorage.setItem('userSession', JSON.stringify(sessionData));

        showNotification(`Welcome back, ${authenticatedUser.firstName}!`, 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        showNotification('Invalid email or password. Please try again.', 'error');
    }
}

// ============================================================================
// REGISTER FUNCTIONALITY
// ============================================================================

function handleRegister() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('role').value;

    // Validate passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    // Check if email already exists
    const existingUser = demoUsers.find(u => u.email === email);
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const registeredUser = registeredUsers.find(u => u.email === email);

    if (existingUser || registeredUser) {
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
        role,
        createdAt: new Date().toISOString()
    };

    // Save to localStorage
    registeredUsers.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

    showNotification('Account created successfully! Redirecting to login...', 'success');

    // Redirect to login
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
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
        return JSON.parse(localSession);
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
        
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.className = 'nav-link auth-link';
        logoutLink.textContent = 'Logout';
        logoutLink.onclick = (e) => {
            e.preventDefault();
            logoutUser();
        };
        
        nav.appendChild(dashboardLink);
        nav.appendChild(logoutLink);
    } else {
        // User is not logged in - show Login
        const loginLink = document.createElement('a');
        loginLink.href = 'login.html';
        loginLink.className = 'nav-link auth-link';
        loginLink.textContent = 'Login';
        
        nav.appendChild(loginLink);
    }
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
