# Laptop Repair Website

## Overview
This project is a website for a laptop repair service that provides users with information about the services offered, a service tracker for monitoring repair status, and a contact form for inquiries.

## Project Structure
```
laptop-repair-website
├── src
│   ├── index.html          # Main entry point of the website
│   ├── about.html          # Information about the company
│   ├── services.html       # Details of services offered
│   ├── tracker.html        # Service tracker for repair status
│   ├── contact.html        # Contact form and information
│   ├── css
│   │   ├── styles.css      # Main styles for the website
│   │   └── tracker.css     # Styles specific to the service tracker
│   ├── js
│   │   ├── main.js         # Main JavaScript functionality
│   │   └── tracker.js      # Functionality for the service tracker
│   └── components
│       ├── header.html     # Header structure with navigation
│       └── footer.html     # Footer structure with copyright info
├── README.md               # Project documentation
└── package.json            # npm configuration file
```

## Features
- **Service Tracker**: Users can track the status of their laptop repairs through various stages: received, diagnosed, parts ordered, repair in progress, and ready for pickup.
- **Service Information**: Detailed descriptions of the laptop repair services offered, including pricing.
- **About Us**: Information about the company's history, mission, and values.
- **Contact Form**: A form for customers to reach out for inquiries or support.

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd laptop-repair-website
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Open `src/index.html` in a web browser to view the website.

## Usage Guidelines
- Users can navigate through the website using the header links.
- The service tracker allows users to see the current status of their laptop repairs.
- For any inquiries, users can fill out the contact form available on the contact page.

## License
This project is licensed under the MIT License.