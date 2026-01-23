document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners for navigation and interactive elements
    initNavigation();
    initContactForm();
});

function initNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetPage = this.getAttribute('href');
            loadPage(targetPage);
        });
    });
}

function loadPage(page) {
    fetch(page)
        .then(response => response.text())
        .then(html => {
            document.querySelector('#main-content').innerHTML = html;
        })
        .catch(error => console.error('Error loading page:', error));
}

function initContactForm() {
    const contactForm = document.querySelector('#contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // Handle form submission logic here
            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        });
    }
}