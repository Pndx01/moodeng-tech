// ============================================================================
// MAIN.JS - Global functionality for Moodeng Tech website
// ============================================================================

// ============================================================================
// SMOOTH SCROLLING AND PAGE INTERACTIONS
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all interactive elements
    initializeSmoothScroll();
    initializeFormValidation();
    initializeAnimations();
});

// Smooth scroll behavior for anchor links
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

function initializeFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', validateForm);
    });
}

function validateForm(e) {
    const inputs = this.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (input.value.trim() === '') {
            isValid = false;
            input.style.borderColor = '#ef4444';
            input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        } else {
            input.style.borderColor = '#e5e7eb';
            input.style.boxShadow = 'none';
        }
    });

    if (!isValid) {
        e.preventDefault();
    }
}

// ============================================================================
// ANIMATIONS & VISUAL EFFECTS
// ============================================================================

function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    document.querySelectorAll('.service-card, .stat-card, .team-member, .faq-item').forEach(el => {
        observer.observe(el);
    });
}

// ============================================================================
// ACTIVE NAV LINK HIGHLIGHT
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const currentLocation = location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentLocation.includes(href) && href !== '../index.html') {
            link.style.color = '#f59e0b';
        }
    });
});

// ============================================================================
// SCROLL TO TOP BUTTON
// ============================================================================

function createScrollToTopButton() {
    const button = document.createElement('button');
    button.innerHTML = '↑';
    button.id = 'scrollToTop';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.5rem;
        display: none;
        z-index: 99;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    `;

    document.body.appendChild(button);

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }
    });

    button.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    button.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#1e40af';
        this.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseout', function() {
        this.style.backgroundColor = '#2563eb';
        this.style.transform = 'scale(1)';
    });
}

// Initialize scroll to top button
createScrollToTopButton();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Format date for display
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
}

// Get query parameters from URL
function getQueryParameter(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// Show notification to user
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
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================================================
// RESPONSIVE NAVIGATION ENHANCEMENTS
// ============================================================================

function enhanceNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.color = '#f59e0b';
        });
        
        link.addEventListener('mouseleave', function() {
            // Only reset if not on current page
            const currentLocation = location.pathname;
            const href = this.getAttribute('href');
            if (!currentLocation.includes(href) || href === '../index.html') {
                this.style.color = 'white';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', enhanceNavigation);

// ============================================================================
// CSS ANIMATIONS
// ============================================================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .fade-in {
        animation: fadeIn 0.6s ease forwards;
    }

    @media (max-width: 768px) {
        #scrollToTop {
            width: 45px !important;
            height: 45px !important;
            font-size: 1.2rem !important;
            bottom: 15px !important;
            right: 15px !important;
        }
    }
`;
document.head.appendChild(style);
