// ============================================================================
// AUTHENTICATION SYSTEM - API-BASED
// ============================================================================

/**
 * Handle user login
 */
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.querySelector('button[type="submit"]');

    // Disable button during request
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
    }

    try {
        const response = await api.post(API_CONFIG.ENDPOINTS.LOGIN, { email, password });
        
        if (response.success) {
            // Store session with tokens
            api.setTokens(response.data);
            
            showNotification(`Welcome back, ${response.data.user.firstName}!`, 'success');
            
            // Connect to socket for real-time updates
            socketClient.connect();
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    } catch (error) {
        showNotification(error.message || 'Invalid email or password. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    }
}

/**
 * Handle user registration
 */
async function handleRegister() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
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
    if (password.length < 8) {
        showNotification('Password must be at least 8 characters!', 'error');
        return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        showNotification('Password must contain uppercase, lowercase, and number!', 'error');
        return;
    }

    // Disable button during request
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
    }

    try {
        const response = await api.post(API_CONFIG.ENDPOINTS.REGISTER, {
            email,
            password,
            firstName,
            lastName,
            phone
        });

        if (response.success) {
            // Show pending approval message
            if (response.data.pendingApproval) {
                showNotification('Registration submitted! Please wait for admin approval before logging in.', 'success');
                
                // Show a more detailed message in the form area
                const form = document.getElementById('registerForm');
                if (form) {
                    form.innerHTML = `
                        <div style="text-align: center; padding: 2rem;">
                            <div style="font-size: 4rem; margin-bottom: 1rem;"></div>
                            <h2 style="color: #059669; margin-bottom: 1rem;">Registration Submitted!</h2>
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
            } else {
                showNotification('Account created successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        }
    } catch (error) {
        if (error.errors) {
            const firstError = error.errors[0];
            showNotification(`${firstError.field}: ${firstError.message}`, 'error');
        } else {
            showNotification(error.message || 'Registration failed. Please try again.', 'error');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    }
}

/**
 * Check if user is authenticated
 */
function checkAuthentication() {
    if (!api.isAuthenticated()) {
        showNotification('Please login to access this page.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
    return true;
}

/**
 * Get user session (for backwards compatibility)
 */
function getUserSession() {
    const tokens = api.getTokens();
    if (!tokens) return null;
    
    return {
        id: tokens.user?.id,
        email: tokens.user?.email,
        firstName: tokens.user?.firstName,
        lastName: tokens.user?.lastName,
        role: tokens.user?.role,
        loginTime: tokens.loginTime
    };
}

/**
 * Logout user
 */
async function logoutUser() {
    try {
        const refreshToken = api.getRefreshToken();
        
        if (refreshToken) {
            await api.post(API_CONFIG.ENDPOINTS.LOGOUT, { refreshToken });
        }
    } catch (error) {
        // Ignore logout errors
        console.log('Logout error:', error);
    } finally {
        api.clearTokens();
        socketClient.disconnect();
        
        showNotification('Logged out successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

/**
 * Update header navigation based on auth state
 */
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
        
        // Check if admin or tech and hide public links
        const role = session.role?.toUpperCase();
        if (role === 'ADMIN' || role === 'TECHNICIAN') {
            // Hide Home, About Us, Services, Contact links for admin and technician
            const publicLinks = ['index.html', 'about.html', 'services.html', 'contact.html'];
            publicLinks.forEach(href => {
                const link = nav.querySelector(`a[href="${href}"]`);
                if (link) {
                    link.style.display = 'none';
                }
            });
        }
        
        nav.appendChild(logoutLink);
        
        // Connect to socket for real-time updates
        if (!socketClient.connected) {
            socketClient.connect();
        }
    } else {
        // User is not logged in - show Login
        const loginLink = document.createElement('a');
        loginLink.href = 'login.html';
        loginLink.className = 'nav-link auth-link';
        loginLink.textContent = 'Login';
        
        nav.appendChild(loginLink);
    }
}

/**
 * Handle forgot password
 */
async function handleForgotPassword() {
    const email = document.getElementById('email').value;
    const submitBtn = document.querySelector('button[type="submit"]');

    if (!email) {
        showNotification('Please enter your email address.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
    }

    try {
        await api.post(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD, { email });
        showNotification('If an account exists, a password reset link will be sent.', 'success');
    } catch (error) {
        showNotification(error.message || 'Request failed. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
        }
    }
}

/**
 * Handle password reset
 */
async function handleResetPassword() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = document.querySelector('button[type="submit"]');

    if (!token) {
        showNotification('Invalid or missing reset token.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Resetting...';
    }

    try {
        await api.post(API_CONFIG.ENDPOINTS.RESET_PASSWORD, { token, newPassword });
        showNotification('Password reset successful! Redirecting to login...', 'success');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        showNotification(error.message || 'Reset failed. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Reset Password';
        }
    }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    // Remove any existing notifications
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

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
