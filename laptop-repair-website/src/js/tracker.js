const serviceTracker = {
    status: 'received',
    stages: [
        'received',
        'diagnosed',
        'parts ordered',
        'repair in progress',
        'ready for pickup'
    ],
    
    updateStatus: function(newStatus) {
        if (this.stages.includes(newStatus)) {
            this.status = newStatus;
            this.displayStatus();
        } else {
            console.error('Invalid status update');
        }
    },
    
    displayStatus: function() {
        const statusElement = document.getElementById('tracker-status');
        statusElement.innerText = `Current Status: ${this.status}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    serviceTracker.displayStatus();

    const updateButtons = document.querySelectorAll('.update-status');
    updateButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newStatus = button.getAttribute('data-status');
            serviceTracker.updateStatus(newStatus);
        });
    });
});