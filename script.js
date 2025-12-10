// Campus Event Tracker - Enhanced Version
document.addEventListener('DOMContentLoaded', function() {
    // ===== DOM Elements =====
    const eventForm = document.getElementById('eventForm');
    const eventsList = document.getElementById('eventsList');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const sortOptions = document.getElementById('sortOptions');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const clearFormBtn = document.getElementById('clearForm');
    const noEventsMessage = document.getElementById('noEvents');
    const themeToggle = document.getElementById('themeToggle');
    const exportMenuBtn = document.getElementById('exportMenuBtn');
    const exportMenu = document.getElementById('exportMenu');
    const exportJsonBtn = document.getElementById('exportJson');
    const exportCsvBtn = document.getElementById('exportCsv');
    const importJsonBtn = document.getElementById('importJson');
    const importFileInput = document.getElementById('importFile');
    const printEventsBtn = document.getElementById('printEvents');
    const viewListBtn = document.getElementById('viewList');
    const viewGridBtn = document.getElementById('viewGrid');
    const clearAllDataBtn = document.getElementById('clearAllData');
    const importSuccessAlert = document.getElementById('importSuccess');
    const confirmModal = document.getElementById('confirmModal');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');
    
    // Stats elements
    const totalEventsSpan = document.getElementById('totalEvents');
    const upcomingEventsSpan = document.getElementById('upcomingEvents');
    const pastEventsSpan = document.getElementById('pastEvents');
    const dataStatusSpan = document.getElementById('dataStatus');
    const eventCountSpan = document.getElementById('eventCount');
    
    // ===== State Variables =====
    let events = JSON.parse(localStorage.getItem('campusEvents')) || [];
    let currentFilter = 'all';
    let currentSearch = '';
    let currentSort = 'date-asc';
    let currentView = 'grid';
    let pendingAction = null;
    let countdownIntervals = [];
    
    // ===== Initialize App =====
    function initApp() {
        // Load sample events if empty
        if (events.length === 0) {
            events = getSampleEvents();
            saveEvents();
        }
        
        // Load theme preference
        loadThemePreference();
        
        // Initial render
        renderEvents();
        updateStats();
        
        // Event Listeners
        setupEventListeners();
        
        // Check for upcoming event notifications
        requestNotificationPermission();
        checkUpcomingEvents();
        
        // Start periodic checks
        setInterval(checkUpcomingEvents, 60000); // Check every minute
    }
    
    // ===== Event Listeners Setup =====
    function setupEventListeners() {
        // Form events
        eventForm.addEventListener('submit', handleAddEvent);
        clearFormBtn.addEventListener('click', clearForm);
        
        // Filter and search
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.category;
                renderEvents();
            });
        });
        
        searchInput.addEventListener('input', function() {
            currentSearch = this.value;
            renderEvents();
        });
        
        sortOptions.addEventListener('change', function() {
            currentSort = this.value;
            renderEvents();
        });
        
        clearFiltersBtn.addEventListener('click', clearFilters);
        
        // Theme toggle
        themeToggle.addEventListener('click', toggleTheme);
        
        // Export/Import
        exportMenuBtn.addEventListener('click', toggleExportMenu);
        exportJsonBtn.addEventListener('click', () => exportEvents('json'));
        exportCsvBtn.addEventListener('click', () => exportEvents('csv'));
        importJsonBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', handleImport);
        printEventsBtn.addEventListener('click', printEvents);
        
        // View toggle
        viewListBtn.addEventListener('click', () => switchView('list'));
        viewGridBtn.addEventListener('click', () => switchView('grid'));
        
        // Data management
        clearAllDataBtn.addEventListener('click', confirmClearAllData);
        
        // Modal
        modalConfirm.addEventListener('click', executePendingAction);
        modalCancel.addEventListener('click', closeModal);
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!exportMenuBtn.contains(event.target) && !exportMenu.contains(event.target)) {
                exportMenu.classList.remove('show');
            }
        });
        
        // Close alerts
        document.querySelectorAll('.alert-close').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.alert').style.display = 'none';
            });
        });
    }
    
    // ===== Event Management =====
    function handleAddEvent(e) {
        e.preventDefault();
        
        const formData = {
            id: Date.now(),
            name: document.getElementById('eventName').value,
            date: document.getElementById('eventDate').value,
            location: document.getElementById('eventLocation').value,
            category: document.getElementById('eventCategory').value,
            description: document.getElementById('eventDescription').value,
            organizer: document.getElementById('eventOrganizer').value,
            capacity: document.getElementById('eventCapacity').value || null,
            created: new Date().toISOString()
        };
        
        // Validate date is in future
        const eventDate = new Date(formData.date);
        if (eventDate < new Date()) {
            showNotification('Event date must be in the future!', 'warning');
            return;
        }
        
        events.push(formData);
        saveEvents();
        renderEvents();
        updateStats();
        clearForm();
        
        showNotification('Event added successfully!', 'success');
    }
    
    function deleteEvent(id) {
        showModal('Are you sure you want to delete this event?', () => {
            events = events.filter(event => event.id !== id);
            saveEvents();
            renderEvents();
            updateStats();
            showNotification('Event deleted successfully!', 'info');
        });
    }
    
    // ===== Rendering =====
    function renderEvents() {
        // Clear existing countdown intervals
        clearCountdownIntervals();
        
        // Filter events
        let filteredEvents = [...events];
        
        // Apply category filter
        if (currentFilter !== 'all') {
            filteredEvents = filteredEvents.filter(event => 
                event.category === currentFilter
            );
        }
        
        // Apply search filter
        if (currentSearch.trim() !== '') {
            const term = currentSearch.toLowerCase();
            filteredEvents = filteredEvents.filter(event => 
                event.name.toLowerCase().includes(term) ||
                event.description.toLowerCase().includes(term) ||
                event.location.toLowerCase().includes(term) ||
                event.organizer.toLowerCase().includes(term) ||
                event.category.toLowerCase().includes(term)
            );
        }
        
        // Sort events
        filteredEvents.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            switch (currentSort) {
                case 'date-asc':
                    return dateA - dateB;
                case 'date-desc':
                    return dateB - dateA;
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return dateA - dateB;
            }
        });
        
        // Clear current events
        eventsList.innerHTML = '';
        
        // Show no events message if needed
        if (filteredEvents.length === 0) {
            noEventsMessage.style.display = 'block';
            eventsList.style.display = 'none';
            return;
        }
        
        // Hide no events message
        noEventsMessage.style.display = 'none';
        eventsList.style.display = 'grid';
        
        // Render each event
        filteredEvents.forEach(event => {
            const eventElement = createEventElement(event);
            eventsList.appendChild(eventElement);
        });
        
        // Update view class
        eventsList.className = `events-list ${currentView}-view`;
    }
    
    function createEventElement(event) {
        const eventDate = new Date(event.date);
        const now = new Date();
        const timeDiff = eventDate - now;
        const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // Format date
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Create countdown display
        let countdownText = '';
        if (daysUntil > 0) {
            countdownText = `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
        } else if (daysUntil === 0) {
            countdownText = 'Today';
        } else {
            countdownText = 'Past event';
        }
        
        // Create event card
        const eventCard = document.createElement('div');
        eventCard.className = `event-card ${event.category}`;
        eventCard.innerHTML = `
            <div class="event-header">
                <div style="flex: 1;">
                    <h3 class="event-title">${event.name}</h3>
                    <span class="event-category ${event.category}">
                        ${getCategoryDisplayName(event.category)}
                    </span>
                </div>
                <div class="countdown-timer" id="countdown-${event.id}">${countdownText}</div>
            </div>
            
            <div class="event-details">
                <div class="event-detail">
                    <i class="fas fa-calendar-day"></i>
                    <span>${formattedDate}</span>
                </div>
                <div class="event-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${event.location}</span>
                </div>
                <div class="event-detail">
                    <i class="fas fa-user-tie"></i>
                    <span>${event.organizer || 'Not specified'}</span>
                </div>
                ${event.capacity ? `
                <div class="event-detail">
                    <i class="fas fa-users"></i>
                    <span>Capacity: ${event.capacity}</span>
                </div>
                ` : ''}
            </div>
            
            ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
            
            <div class="event-footer">
                <div class="event-date">
                    <i class="fas fa-clock"></i>
                    <span>${formattedDate}</span>
                </div>
                <button class="delete-btn" data-id="${event.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        // Add delete event listener
        const deleteBtn = eventCard.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            deleteEvent(event.id);
        });
        
        // Start countdown timer
        if (daysUntil >= 0) {
            startCountdownTimer(event.id, eventDate);
        }
        
        return eventCard;
    }
    
    // ===== Countdown Timers =====
    function startCountdownTimer(eventId, eventDate) {
        const timerElement = document.getElementById(`countdown-${eventId}`);
        if (!timerElement) return;
        
        const interval = setInterval(() => {
            const now = new Date();
            const diff = eventDate - now;
            
            if (diff <= 0) {
                timerElement.textContent = 'Ongoing/Finished';
                timerElement.style.background = '#95a5a6';
                clearInterval(interval);
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (days > 0) {
                timerElement.textContent = `${days}d ${hours}h`;
            } else if (hours > 0) {
                timerElement.textContent = `${hours}h ${minutes}m`;
            } else {
                timerElement.textContent = `${minutes}m`;
                timerElement.style.background = '#e74c3c';
            }
        }, 60000); // Update every minute
        
        countdownIntervals.push({ eventId, interval });
    }
    
    function clearCountdownIntervals() {
        countdownIntervals.forEach(item => clearInterval(item.interval));
        countdownIntervals = [];
    }
    
    // ===== Theme Management =====
    function loadThemePreference() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        showNotification(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode enabled`, 'info');
    }
    
    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        themeToggle.title = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`;
    }
    
    // ===== Export/Import =====
    function toggleExportMenu() {
        exportMenu.classList.toggle('show');
    }
    
    function exportEvents(format) {
        exportMenu.classList.remove('show');
        
        let data, filename, mimeType;
        
        if (format === 'json') {
            data = JSON.stringify(events, null, 2);
            filename = `campus-events-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
        } else if (format === 'csv') {
            const headers = ['Name', 'Date', 'Location', 'Category', 'Organizer', 'Description'];
            const csvRows = events.map(event => [
                `"${event.name}"`,
                `"${new Date(event.date).toLocaleString()}"`,
                `"${event.location}"`,
                `"${getCategoryDisplayName(event.category)}"`,
                `"${event.organizer || ''}"`,
                `"${event.description || ''}"`
            ]);
            
            data = [headers.join(','), ...csvRows].join('\n');
            filename = `campus-events-${new Date().toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
        }
        
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification(`Events exported as ${format.toUpperCase()} successfully!`, 'success');
    }
    
    function handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedEvents = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedEvents)) {
                    throw new Error('Invalid format: Expected array of events');
                }
                
                // Validate events have required fields
                const validEvents = importedEvents.filter(evt => 
                    evt.name && evt.date && evt.location && evt.category
                );
                
                if (validEvents.length === 0) {
                    throw new Error('No valid events found in file');
                }
                
                // Add imported events
                validEvents.forEach(event => {
                    if (!event.id) event.id = Date.now() + Math.random();
                    events.push(event);
                });
                
                saveEvents();
                renderEvents();
                updateStats();
                
                // Show success message
                importSuccessAlert.style.display = 'flex';
                showNotification(`${validEvents.length} events imported successfully!`, 'success');
                
            } catch (error) {
                showNotification(`Import failed: ${error.message}`, 'warning');
            }
            
            // Clear file input
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }
    
    function printEvents() {
        exportMenu.classList.remove('show');
        
        const printContent = events.map(event => `
            <div class="print-event" style="margin-bottom: 20px; page-break-inside: avoid;">
                <h3 style="color: #2c3e50; margin-bottom: 10px;">${event.name}</h3>
                <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Category:</strong> ${getCategoryDisplayName(event.category)}</p>
                <p><strong>Organizer:</strong> ${event.organizer || 'Not specified'}</p>
                ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
                <hr style="border-top: 1px solid #ccc; margin: 20px 0;">
            </div>
        `).join('');
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Campus Events - ${new Date().toLocaleDateString()}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .event-count { color: #666; margin-top: 5px; }
                    @media print {
                        body { margin: 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Campus Event Tracker</h1>
                    <p class="event-count">Total Events: ${events.length}</p>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
                ${printContent}
                <script>
                    window.onload = function() { window.print(); };
                <\/script>
            </body>
            </html>
        `);
    }
    
    // ===== View Management =====
    function switchView(view) {
        currentView = view;
        eventsList.className = `events-list ${view}-view`;
        
        viewListBtn.classList.toggle('active', view === 'list');
        viewGridBtn.classList.toggle('active', view === 'grid');
    }
    
    // ===== Notifications =====
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    function checkUpcomingEvents() {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        events.forEach(event => {
            const eventTime = new Date(event.date);
            if (eventTime > now && eventTime < oneHourLater) {
                // Check if we've already notified about this event
                const notifiedKey = `notified-${event.id}`;
                if (!localStorage.getItem(notifiedKey)) {
                    showBrowserNotification(event);
                    localStorage.setItem(notifiedKey, 'true');
                }
            }
        });
    }
    
    function showBrowserNotification(event) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const eventTime = new Date(event.date);
            new Notification(`Upcoming Event: ${event.name}`, {
                body: `Starts at ${eventTime.toLocaleTimeString()} in ${event.location}`,
                icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📅</text></svg>',
                tag: `event-${event.id}`
            });
        }
    }
    
    function showNotification(message, type = 'info') {
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Add styles if not present
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-width: 300px;
                    max-width: 400px;
                    z-index: 1000;
                    animation: slideInRight 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                .notification-success { background: linear-gradient(90deg, #2ecc71, #27ae60); }
                .notification-info { background: linear-gradient(90deg, #3498db, #2980b9); }
                .notification-warning { background: linear-gradient(90deg, #f39c12, #e67e22); }
                .notification-close {
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    margin-left: 15px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add close listener
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => notification.remove());
        
        // Auto-remove
        setTimeout(() => notification.remove(), 5000);
    }
    
    // ===== Modal Management =====
    function showModal(message, confirmCallback) {
        document.getElementById('modalMessage').textContent = message;
        pendingAction = confirmCallback;
        confirmModal.classList.add('show');
    }
    
    function closeModal() {
        confirmModal.classList.remove('show');
        pendingAction = null;
    }
    
    function executePendingAction() {
        if (pendingAction) {
            pendingAction();
        }
        closeModal();
    }
    
    function confirmClearAllData() {
        showModal('Are you sure you want to clear all events? This action cannot be undone.', () => {
            events = [];
            localStorage.removeItem('campusEvents');
            renderEvents();
            updateStats();
            showNotification('All events cleared successfully!', 'info');
        });
    }
    
    // ===== Utility Functions =====
    function clearFilters() {
        filterButtons.forEach(btn => {
            if (btn.dataset.category === 'all') {
                btn.classList.add('active');
                currentFilter = 'all';
            } else {
                btn.classList.remove('active');
            }
        });
        
        searchInput.value = '';
        currentSearch = '';
        sortOptions.value = 'date-asc';
        currentSort = 'date-asc';
        
        renderEvents();
    }
    
    function clearForm() {
        eventForm.reset();
    }
    
    function saveEvents() {
        localStorage.setItem('campusEvents', JSON.stringify(events));
        updateDataStatus();
    }
    
    function updateStats() {
        const now = new Date();
        const upcomingCount = events.filter(event => new Date(event.date) >= now).length;
        const pastCount = events.length - upcomingCount;
        
        totalEventsSpan.textContent = events.length;
        upcomingEventsSpan.textContent = upcomingCount;
        pastEventsSpan.textContent = pastCount;
        eventCountSpan.textContent = `${events.length} event${events.length !== 1 ? 's' : ''}`;
    }
    
    function updateDataStatus() {
        const usedSpace = JSON.stringify(events).length;
        const kbUsed = (usedSpace / 1024).toFixed(2);
        dataStatusSpan.textContent = `Data: ${kbUsed} KB used`;
    }
    
    function getCategoryDisplayName(category) {
        const categoryMap = {
            'academic': 'Academic',
            'technical': 'Technical',
            'cultural': 'Cultural',
            'sports': 'Sports',
            'workshop': 'Workshop',
            'seminar': 'Seminar',
            'other': 'Other'
        };
        return categoryMap[category] || category;
    }
    
    // ===== Sample Events =====
    function getSampleEvents() {
        const now = new Date();
        return [
            {
                id: 1,
                name: "Annual Tech Fest",
                date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 10, 0).toISOString().slice(0, 16),
                location: "Main Auditorium",
                category: "technical",
                description: "Join us for the biggest technical festival of the year with coding competitions, workshops, and guest lectures.",
                organizer: "Computer Science Department",
                capacity: 300
            },
            {
                id: 2,
                name: "Cultural Night",
                date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 18, 30).toISOString().slice(0, 16),
                location: "College Ground",
                category: "cultural",
                description: "An evening of music, dance, and drama performances by talented students.",
                organizer: "Cultural Committee",
                capacity: 500
            },
            {
                id: 3,
                name: "Machine Learning Workshop",
                date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 9, 0).toISOString().slice(0, 16),
                location: "CS Lab 3",
                category: "workshop",
                description: "Hands-on workshop on ML algorithms and TensorFlow implementation.",
                organizer: "AI Club",
                capacity: 50
            },
            {
                id: 4,
                name: "Inter-College Sports Meet",
                date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 8, 0).toISOString().slice(0, 16),
                location: "Sports Complex",
                category: "sports",
                description: "Annual sports competition with various track and field events.",
                organizer: "Sports Department"
            },
            {
                id: 5,
                name: "Career Guidance Seminar",
                date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 14, 0).toISOString().slice(0, 16),
                location: "Seminar Hall 2",
                category: "academic",
                description: "Learn about career opportunities and higher education options after graduation.",
                organizer: "Placement Cell",
                capacity: 200
            }
        ];
    }
    
    // ===== Initialize the App =====
    initApp();
});