/**
 * Modern Class Attendance System - Mobile-First JavaScript
 * Features: Fixed database connection, mobile optimization, enhanced UX
 */

// Configuration
const CONFIG = {
    // SHA-256 hash of admin password (default: "admin123")
    ADMIN_PASSWORD_HASH: '00138f43cac5dc2312a73bfc8f08ae563ee692b5c6f57e9a31eaeb2c418fbc88',
    
    // Default time slot (8:30 PM - 9:30 PM IST for testing)
    DEFAULT_TIME_SLOT: {
        start: { hour: 20, minute: 30 },
        end: { hour: 21, minute: 30 }
    },
    
    // Storage keys
    STORAGE_KEYS: {
        ADMIN_SESSION: 'admin_session'
    },
    
    // Timer update interval (1 second)
    TIMER_INTERVAL: 1000,
    
    // Toast auto-dismiss time (4 seconds for mobile)
    TOAST_DURATION: 4000,
    
    // Mobile breakpoints
    MOBILE_BREAKPOINT: 640,
    TABLET_BREAKPOINT: 1024
};

// Global variables
let timerInterval = null;
let autoRefreshInterval = null;
let attendanceRecords = [];
let timeSlot = CONFIG.DEFAULT_TIME_SLOT;
let isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
let isAutoRefreshEnabled = false;
let isPrivacyMode = false;
let totalClassSize = 30;
let securityAlerts = [];
let currentEditingRecord = null;
let pendingAction = null;

// DOM elements
const elements = {
    // Student form
    studentForm: document.getElementById('student-form'),
    studentName: document.getElementById('student-name'),
    rollNumber: document.getElementById('roll-number'),
    markPresentBtn: document.getElementById('mark-present-btn'),
    
    // Time slot status
    timeSlotStatus: document.getElementById('time-slot-status'),
    slotStatusText: document.getElementById('slot-status-text'),
    countdownTimer: document.getElementById('countdown-timer'),
    timerDisplay: document.getElementById('timer-display'),
    
    // Admin section
    adminLogin: document.getElementById('admin-login'),
    adminDashboard: document.getElementById('admin-dashboard'),
    adminPassword: document.getElementById('admin-password'),
    adminLoginBtn: document.getElementById('admin-login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Time slot configuration
    startHour: document.getElementById('start-hour'),
    startMinute: document.getElementById('start-minute'),
    endHour: document.getElementById('end-hour'),
    endMinute: document.getElementById('end-minute'),
    saveTimeSlotBtn: document.getElementById('save-time-slot-btn'),
    
    // Attendance records
    attendanceList: document.getElementById('attendance-list'),
    studentCount: document.getElementById('student-count'),
    downloadRecordsBtn: document.getElementById('download-records-btn'),
    clearRecordsBtn: document.getElementById('clear-records-btn'),
    
    // Toast container
    toastContainer: document.getElementById('toast-container'),
    
    // Welcome message
    welcomeGreeting: document.getElementById('welcome-greeting'),
    welcomeTimeInfo: document.getElementById('welcome-time-info'),
    
    // Auto refresh
    autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
    refreshStatus: document.getElementById('refresh-status'),
    
    // Analytics
    totalPresent: document.getElementById('total-present'),
    attendanceRate: document.getElementById('attendance-rate'),
    lastUpdated: document.getElementById('last-updated'),
    
    // Public attendance view
    privacyToggle: document.getElementById('privacy-toggle'),
    publicStudentCount: document.getElementById('public-student-count'),
    publicAttendanceList: document.getElementById('public-attendance-list'),
    
    // Today's summary
    todaySummaryCount: document.getElementById('today-summary-count'),
    totalClassSize: document.getElementById('total-class-size'),
    
    // Mini chart
    miniChart: document.getElementById('mini-chart'),
    chartPercentage: document.getElementById('chart-percentage'),
    
    // Punctual students
    punctualStudentsList: document.getElementById('punctual-students-list'),
    
    // Copy records
    copyRecordsBtn: document.getElementById('copy-records-btn'),
    
    // Security features
    securityAlerts: document.getElementById('security-alerts'),
    securityAlertsList: document.getElementById('security-alerts-list'),
    
    // Manual edit
    editAttendanceBtn: document.getElementById('edit-attendance-btn'),
    editModal: document.getElementById('edit-modal'),
    closeEditModal: document.getElementById('close-edit-modal'),
    editStudentName: document.getElementById('edit-student-name'),
    editRollNumber: document.getElementById('edit-roll-number'),
    saveEditBtn: document.getElementById('save-edit-btn'),
    deleteRecordBtn: document.getElementById('delete-record-btn'),
    
    // Confirmation modal
    confirmationModal: document.getElementById('confirmation-modal'),
    confirmationMessage: document.getElementById('confirmation-message'),
    confirmActionBtn: document.getElementById('confirm-action-btn'),
    cancelActionBtn: document.getElementById('cancel-action-btn')
};

// Initialize Supabase client with fixed connection
const { createClient } = window.supabase;

// Fixed Supabase credentials
const SUPABASE_URL = 'https://ysiocxbkbljkhmigwvwt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaW9jeGJrYmxqa2htaWd3dnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0OTIxNTcsImV4cCI6MjA3NzA2ODE1N30.R3WbySkUUH_FgNI2N9npmwBWRMKKhFBwtHI3fx6sb2s';

console.log('🔗 Supabase URL:', SUPABASE_URL);
console.log('🔑 Supabase Key (first 20 chars):', SUPABASE_ANON_KEY.substring(0, 20) + '...');

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test Supabase connection
 */
async function testConnection() {
    try {
        console.log('🔍 Testing Supabase connection...');
        const { data, error } = await supabaseClient.from('timeslot').select('*').limit(1);
        if (error) {
            console.error('❌ Connection test failed:', error);
            return false;
        }
        console.log('✅ Connection test successful');
        return true;
    } catch (error) {
        console.error('❌ Connection test error:', error);
        return false;
    }
}

/**
 * Initialize the application
 */
async function init() {
    console.log('🚀 Initializing Class Attendance System...');
    
    // Check if mobile
    updateMobileState();
    window.addEventListener('resize', updateMobileState);
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
        showToast('❌ Failed to connect to database. Please check your Supabase configuration.', 'error');
        console.error('💡 SOLUTION: Go to your Supabase project dashboard → SQL Editor → Run the setup_new_project.sql script');
    }
    
    await loadData();
    setupEventListeners();
    populateTimeSelectors();
    updateTimeSlotStatus();
    updateAttendanceList();
    updatePublicAttendanceList();
    updateWelcomeMessage();
    updateAnalytics();
    updateTodaySummary();
    updateMiniChart();
    updatePunctualStudents();
    checkAdminSession();
    startTimer();
    
    // Test database permissions on startup
    console.log('🔐 Testing database permissions on startup...');
    testDatabasePermissions().then(success => {
        if (success) {
            console.log('✅ Database permissions verified - all features will work correctly');
        } else {
            console.error('❌ Database permission issues detected - some features may not work');
            showToast('⚠️ Database permission issues detected. Please check your setup.', 'warning');
        }
    });
    
    console.log('✅ Application initialized successfully');
}

/**
 * Update mobile state
 */
function updateMobileState() {
    isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    document.body.classList.toggle('mobile', isMobile);
}

/**
 * Load data from Supabase
 */
async function loadData() {
    try {
        console.log('📊 Loading data from Supabase...');
        
        // Load attendance data
        console.log('📋 Loading attendance data...');
        const { data: attendance, error: attendanceError } = await supabaseClient.from('attendance').select('*');
        if (attendanceError) {
            console.error('❌ Attendance loading error:', attendanceError);
            if (attendanceError.message.includes('relation "attendance" does not exist')) {
                showToast('📋 Database tables not found. Please run the setup script in Supabase SQL Editor.', 'error');
                console.error('💡 SOLUTION: Go to your Supabase project dashboard → SQL Editor → Run the setup_new_project.sql script');
            }
            throw attendanceError;
        }
        console.log('✅ Attendance data loaded:', attendance);
        attendanceRecords = attendance || [];
        
        // Check for existing suspicious IP patterns
        checkExistingSuspiciousIPs();
        
        // Load time slot data
        console.log('⏰ Loading time slot data...');
        const { data: slot, error: slotError } = await supabaseClient.from('timeslot').select('*').limit(1);
        if (slotError) {
            console.error('❌ Time slot loading error:', slotError);
            if (slotError.message.includes('relation "timeslot" does not exist')) {
                showToast('⏰ Time slot table not found. Please run the setup script in Supabase SQL Editor.', 'error');
                console.error('💡 SOLUTION: Go to your Supabase project dashboard → SQL Editor → Run the setup_new_project.sql script');
            }
            throw slotError;
        }
        console.log('✅ Time slot data loaded:', slot);
        
        if (slot && slot.length > 0) {
            timeSlot = {
                start: { hour: slot[0].start_hour, minute: slot[0].start_minute },
                end: { hour: slot[0].end_hour, minute: slot[0].end_minute }
            };
            console.log('⏰ Using database time slot:', timeSlot);
        } else {
            timeSlot = CONFIG.DEFAULT_TIME_SLOT;
            console.log('⏰ Using default time slot:', timeSlot);
        }
        
        console.log('✅ Data loading completed successfully');
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showToast(`❌ Failed to load data: ${error.message}`, 'error');
        attendanceRecords = [];
        timeSlot = CONFIG.DEFAULT_TIME_SLOT;
    }
}

/**
 * Save attendance to Supabase with security features
 */
async function saveAttendance(record) {
    try {
        console.log('💾 Attempting to save attendance:', record);
        
        // Validate required fields
        if (!record.name || !record.rollNumber || !record.displayName) {
            throw new Error('Missing required fields: name, rollNumber, or displayName');
        }
        
        // Get client information for security
        const clientInfo = await getClientInfo();
        
        // Check for duplicate attempts
        const duplicateCheck = await checkForDuplicates(record.rollNumber, clientInfo);
        if (duplicateCheck.isDuplicate) {
            addSecurityAlert(`Duplicate entry detected for roll ${record.rollNumber}`, duplicateCheck.details);
            showToast('⚠️ Duplicate entry detected! This has been logged for admin review.', 'error');
            return null;
        }
        
        const { data, error } = await supabaseClient.from('attendance').insert({
            name: record.name,
            rollNumber: record.rollNumber,
            timestamp: record.timestamp,
            displayName: record.displayName,
            ip_address: clientInfo.ip,
            browser_fingerprint: clientInfo.fingerprint,
            is_duplicate: false,
            is_manually_edited: false
        }).select();
        
        if (error) {
            console.error('❌ Save attendance error details:', error);
            throw error;
        }
        
        console.log('✅ Attendance saved successfully:', data);
        return data;
    } catch (error) {
        console.error('❌ Error saving attendance:', error.message);
        showToast(`❌ Failed to save attendance: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Save time slot to Supabase
 */
async function saveTimeSlot() {
    try {
        const { error } = await supabaseClient.from('timeslot').upsert({
            id: 1,
            start_hour: timeSlot.start.hour,
            start_minute: timeSlot.start.minute,
            end_hour: timeSlot.end.hour,
            end_minute: timeSlot.end.minute
        }, { onConflict: 'id' });
        if (error) throw error;
    } catch (error) {
        console.error('❌ Error saving time slot:', error.message);
        showToast('❌ Failed to save time slot.', 'error');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Student form submission
    elements.studentForm.addEventListener('submit', handleStudentSubmission);
    
    // Admin login
    elements.adminLoginBtn.addEventListener('click', handleAdminLogin);
    elements.adminPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAdminLogin();
        }
    });
    
    // Admin logout
    elements.logoutBtn.addEventListener('click', handleAdminLogout);
    
    // Time slot configuration
    elements.saveTimeSlotBtn.addEventListener('click', handleTimeSlotSave);
    
    // Attendance management
    elements.downloadRecordsBtn.addEventListener('click', handleDownloadRecords);
    elements.clearRecordsBtn.addEventListener('click', handleClearRecords);
    elements.copyRecordsBtn.addEventListener('click', handleCopyRecords);
    
    // Auto refresh
    elements.autoRefreshToggle.addEventListener('change', handleAutoRefreshToggle);
    
    // Privacy toggle
    elements.privacyToggle.addEventListener('change', handlePrivacyToggle);
    
    // Class size change
    elements.totalClassSize.addEventListener('change', handleClassSizeChange);
    
    // Security features
    elements.editAttendanceBtn.addEventListener('click', handleEditAttendance);
    elements.closeEditModal.addEventListener('click', closeEditModal);
    elements.saveEditBtn.addEventListener('click', handleSaveEdit);
    elements.deleteRecordBtn.addEventListener('click', handleDeleteRecord);
    
    // Confirmation modal
    elements.confirmActionBtn.addEventListener('click', handleConfirmAction);
    elements.cancelActionBtn.addEventListener('click', closeConfirmationModal);
    
    // Mobile optimizations
    if (isMobile) {
        // Prevent zoom on input focus
        elements.studentName.addEventListener('focus', () => {
            document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        });
        
        elements.rollNumber.addEventListener('focus', () => {
            document.querySelector('meta[name="viewport"]').setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        });
    }
}

/**
 * Populate time selector dropdowns
 */
function populateTimeSelectors() {
    // Clear existing options
    elements.startHour.innerHTML = '<option value="">Hour</option>';
    elements.startMinute.innerHTML = '<option value="">Min</option>';
    elements.endHour.innerHTML = '<option value="">Hour</option>';
    elements.endMinute.innerHTML = '<option value="">Min</option>';
    
    // Populate hours (0-23)
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        const option = document.createElement('option');
        option.value = i;
        option.textContent = hour;
        elements.startHour.appendChild(option.cloneNode(true));
        elements.endHour.appendChild(option);
    }
    
    // Populate minutes (0-59)
    for (let i = 0; i < 60; i++) {
        const minute = i.toString().padStart(2, '0');
        const option = document.createElement('option');
        option.value = i;
        option.textContent = minute;
        elements.startMinute.appendChild(option.cloneNode(true));
        elements.endMinute.appendChild(option);
    }
    
    // Set current time slot values
    elements.startHour.value = timeSlot.start.hour;
    elements.startMinute.value = timeSlot.start.minute;
    elements.endHour.value = timeSlot.end.hour;
    elements.endMinute.value = timeSlot.end.minute;
}

/**
 * Handle student form submission with enhanced error handling
 */
async function handleStudentSubmission(e) {
    e.preventDefault();
    
    const name = elements.studentName.value.trim();
    const rollNumber = elements.rollNumber.value.trim();
    
    // Validate inputs
    if (!name || !rollNumber) {
        showToast('❌ Please fill in all fields', 'error');
        return;
    }
    
    // Check if roll number already exists (with better error handling)
    const existingRecord = attendanceRecords.find(record => 
        record.rollNumber.toLowerCase() === rollNumber.toLowerCase()
    );
    
    if (existingRecord) {
        showToast(`❌ Roll number ${rollNumber} has already been used for attendance`, 'error');
        return;
    }
    
    // Check if time slot is open
    if (!isTimeSlotOpen()) {
        showToast('❌ Attendance is not allowed outside the designated time slot', 'error');
        return;
    }
    
    // Disable form during submission to prevent multiple submissions
    elements.markPresentBtn.disabled = true;
    elements.markPresentBtn.innerHTML = '<div class="spinner w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div><span class="ml-2">Saving...</span>';
    
    try {
    // Add attendance record
    const record = {
        name: name,
        rollNumber: rollNumber,
        timestamp: new Date().toISOString(),
        displayName: `${name} (${rollNumber})`
    };
    
    const savedData = await saveAttendance(record);
    
    if (savedData) {
        attendanceRecords.push(record);
        updateAttendanceList();
            updatePublicAttendanceList();
        updateAnalytics();
            updateTodaySummary();
            updateMiniChart();
            updatePunctualStudents();
        
        // Clear form
        elements.studentForm.reset();
        
        // Show success message
        showToast(`✅ Attendance marked successfully for ${name}`, 'success');
    }
    } catch (error) {
        console.error('❌ Error in attendance submission:', error);
        showToast('❌ Failed to mark attendance. Please try again.', 'error');
    } finally {
    // Re-enable form
    elements.markPresentBtn.disabled = false;
    elements.markPresentBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Mark Present</span>';
    }
}

/**
 * Handle admin login
 */
async function handleAdminLogin() {
    const password = elements.adminPassword.value;
    
    if (!password) {
        showToast('❌ Please enter admin password', 'error');
        return;
    }
    
    try {
        const hashedPassword = await hashPassword(password);
        
        if (hashedPassword === CONFIG.ADMIN_PASSWORD_HASH) {
            // Login successful
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION, 'true');
            elements.adminPassword.value = '';
            
            // Show admin dashboard
            elements.adminLogin.classList.add('hidden');
            elements.adminDashboard.classList.remove('hidden');
            elements.logoutBtn.classList.remove('hidden');
            
            // Update attendance list and time slot configuration
            updateAttendanceList();
            populateTimeSelectors();
            
            showToast('✅ Admin login successful', 'success');
        } else {
            showToast('❌ Invalid admin password', 'error');
            elements.adminPassword.value = '';
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast('❌ Login failed. Please try again.', 'error');
        elements.adminPassword.value = '';
    }
}

/**
 * Handle admin logout
 */
function handleAdminLogout() {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    
    // Hide admin dashboard
    elements.adminDashboard.classList.add('hidden');
    elements.adminLogin.classList.remove('hidden');
    elements.logoutBtn.classList.add('hidden');
    
    showToast('👋 Admin logged out successfully', 'info');
}

/**
 * Handle time slot save
 */
async function handleTimeSlotSave() {
    const startHour = parseInt(elements.startHour.value);
    const startMinute = parseInt(elements.startMinute.value);
    const endHour = parseInt(elements.endHour.value);
    const endMinute = parseInt(elements.endMinute.value);
    
    // Validate inputs
    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        showToast('❌ Please select valid start and end times', 'error');
        return;
    }
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    // Validate time slot
    if (startTime >= endTime) {
        showToast('❌ End time must be after start time', 'error');
        return;
    }
    
    // Save time slot
    timeSlot = {
        start: { hour: startHour, minute: startMinute },
        end: { hour: endHour, minute: endMinute }
    };
    
    await saveTimeSlot();
    updateTimeSlotStatus();
    updateWelcomeMessage();
    startTimer();
    
    showToast('✅ Time slot updated successfully', 'success');
}

/**
 * Handle download records
 */
function handleDownloadRecords() {
    if (attendanceRecords.length === 0) {
        showToast('❌ No attendance records to download', 'error');
        return;
    }
    
    const content = attendanceRecords.map(record => record.displayName).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ Attendance records downloaded successfully', 'success');
}

/**
 * Handle clear records with double confirmation
 */
async function handleClearRecords() {
    if (attendanceRecords.length === 0) {
        showToast('❌ No attendance records to clear', 'error');
        return;
    }
    
    // Show double confirmation modal
    showConfirmationModal(
        `Are you sure you want to clear all ${attendanceRecords.length} attendance records?`,
        'Yes, Clear All Records',
        async () => {
        try {
            await supabaseClient.from('attendance').delete().neq('id', 0);
            attendanceRecords = [];
                
                // Clear security alerts when clearing records
                securityAlerts = [];
                updateSecurityAlerts();
                
                // Clear all suspicious flags
                clearSuspiciousFlags();
                
            updateAttendanceList();
                updatePublicAttendanceList();
                updateAnalytics();
                updateTodaySummary();
                updateMiniChart();
                updatePunctualStudents();
                showToast('✅ All attendance records and security alerts cleared', 'success');
        } catch (error) {
            console.error('❌ Error clearing records:', error);
            showToast('❌ Failed to clear records', 'error');
        }
    }
    );
}

/**
 * Check if time slot is currently open
 */
function isTimeSlotOpen() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = timeSlot.start.hour * 60 + timeSlot.start.minute;
    const endTime = timeSlot.end.hour * 60 + timeSlot.end.minute;
    
    console.log(`⏰ Current: ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} (${currentTime})`);
    console.log(`⏰ Start: ${timeSlot.start.hour}:${timeSlot.start.minute.toString().padStart(2, '0')} (${startTime})`);
    console.log(`⏰ End: ${timeSlot.end.hour}:${timeSlot.end.minute.toString().padStart(2, '0')} (${endTime})`);
    
    const isOpen = currentTime >= startTime && currentTime < endTime;
    console.log(`⏰ Time slot is ${isOpen ? 'OPEN' : 'CLOSED'}`);
    
    return isOpen;
}

/**
 * Get time remaining in current slot
 */
function getTimeRemaining() {
    if (!isTimeSlotOpen()) {
        return null;
    }
    
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(timeSlot.end.hour, timeSlot.end.minute, 0, 0);
    
    const remaining = endTime - now;
    return remaining > 0 ? remaining : 0;
}

/**
 * Format time as MM:SS
 */
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format time as HH:MM AM/PM
 */
function formatTimeSlot(hour, minute) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Update time slot status display
 */
function updateTimeSlotStatus() {
    const isOpen = isTimeSlotOpen();
    const startTime = formatTimeSlot(timeSlot.start.hour, timeSlot.start.minute);
    const endTime = formatTimeSlot(timeSlot.end.hour, timeSlot.end.minute);
    
    if (isOpen) {
        elements.slotStatusText.textContent = `✅ Slot is open ${startTime}–${endTime}`;
        elements.timeSlotStatus.className = 'mb-6 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 slot-open';
        elements.countdownTimer.classList.remove('hidden');
    } else {
        elements.slotStatusText.textContent = `❌ Slot closed. Open ${startTime}–${endTime}`;
        elements.timeSlotStatus.className = 'mb-6 p-4 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 slot-closed';
        elements.countdownTimer.classList.add('hidden');
    }
    
    // Enable/disable form based on time slot
    const formDisabled = !isOpen;
    elements.markPresentBtn.disabled = formDisabled;
    elements.studentForm.classList.toggle('form-disabled', formDisabled);
}

/**
 * Start/update timer
 */
function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        const remaining = getTimeRemaining();
        
        if (remaining !== null && remaining > 0) {
            const formatted = formatTime(remaining);
            elements.timerDisplay.textContent = formatted;
            
            // Add warning class if less than 5 minutes remaining
            const minutes = Math.floor(remaining / 60000);
            if (minutes < 5) {
                elements.countdownTimer.classList.add('timer-warning');
            } else {
                elements.countdownTimer.classList.remove('timer-warning');
            }
        } else {
            elements.timerDisplay.textContent = '00:00';
            elements.countdownTimer.classList.remove('timer-warning');
        }
        
        updateTimeSlotStatus();
    }, CONFIG.TIMER_INTERVAL);
}

/**
 * Update attendance list display
 */
function updateAttendanceList() {
    const count = attendanceRecords.length;
    elements.studentCount.textContent = `${count} student${count !== 1 ? 's' : ''}`;
    
    if (count === 0) {
        elements.attendanceList.innerHTML = `
            <div class="empty-state">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <p class="text-gray-500">No attendance records yet</p>
            </div>
        `;
        return;
    }
    
    const listHTML = attendanceRecords.map((record, index) => {
        const isDuplicate = record.is_duplicate || false;
        const isEdited = record.is_manually_edited || false;
        const isSuspicious = record.is_suspicious_ip || false;
        
        // Determine the styling based on the type of issue
        let itemClass = 'attendance-item flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0';
        let nameClass = 'text-sm font-medium text-gray-900';
        let statusBadges = '';
        
        if (isDuplicate) {
            itemClass += ' bg-red-50 border-red-200';
            nameClass = 'text-sm font-medium text-red-800';
            statusBadges += '<span class="text-xs text-red-600 font-medium">⚠️ Duplicate</span>';
        } else if (isSuspicious) {
            itemClass += ' bg-orange-50 border-orange-200';
            nameClass = 'text-sm font-medium text-orange-800';
            statusBadges += '<span class="text-xs text-orange-600 font-medium">🚨 Suspicious IP</span>';
        }
        
        return `
            <div class="${itemClass}">
            <div class="flex items-center">
                <span class="counter">${index + 1}</span>
                <div class="ml-3">
                        <div class="${nameClass}">${record.displayName}</div>
                    <div class="text-xs text-gray-500">
                        ${new Date(record.timestamp).toLocaleString()}
                            ${isEdited ? ' (Edited)' : ''}
                            ${isSuspicious ? ` - ${record.suspicious_reason || 'Suspicious activity'}` : ''}
                    </div>
                </div>
            </div>
                <div class="flex items-center space-x-2">
                    ${statusBadges}
                    <button onclick="editStudentRecord(${record.id})" class="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded transition-colors duration-200">
                        ✏️ Edit
                    </button>
            <div class="text-xs text-green-600 font-medium">
                ✅ Present
            </div>
        </div>
            </div>
        `;
    }).join('');
    
    elements.attendanceList.innerHTML = listHTML;
}

/**
 * Check admin session
 */
function checkAdminSession() {
    const isLoggedIn = sessionStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION) === 'true';
    
    if (isLoggedIn) {
        elements.adminLogin.classList.add('hidden');
        elements.adminDashboard.classList.remove('hidden');
        elements.logoutBtn.classList.remove('hidden');
    } else {
        elements.adminDashboard.classList.add('hidden');
        elements.adminLogin.classList.remove('hidden');
        elements.logoutBtn.classList.add('hidden');
    }
}

/**
 * Hash password using SHA-256
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Show toast notification with mobile optimization
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} p-4 rounded-xl shadow-lg max-w-sm backdrop-blur-sm`;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `
        <div class="flex items-center">
            <span class="mr-2 text-lg">${icon}</span>
            <span class="text-sm font-medium">${message}</span>
        </div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto-dismiss after configured time
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, CONFIG.TOAST_DURATION);
}

/**
 * Handle auto refresh toggle
 */
function handleAutoRefreshToggle() {
    isAutoRefreshEnabled = elements.autoRefreshToggle.checked;
    
    if (isAutoRefreshEnabled) {
        startAutoRefresh();
        elements.refreshStatus.textContent = 'Auto-refresh: ON';
        elements.refreshStatus.className = 'text-xs text-green-600';
    } else {
        stopAutoRefresh();
        elements.refreshStatus.textContent = 'Auto-refresh: OFF';
        elements.refreshStatus.className = 'text-xs text-gray-500';
    }
}

/**
 * Handle privacy toggle for public attendance view
 */
function handlePrivacyToggle() {
    isPrivacyMode = elements.privacyToggle.checked;
    updatePublicAttendanceList();
}

/**
 * Start auto refresh
 */
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(async () => {
        console.log('🔄 Auto-refreshing attendance data...');
        await loadData();
        updateAttendanceList();
        updatePublicAttendanceList();
        updateAnalytics();
        updateTodaySummary();
        updateMiniChart();
        updatePunctualStudents();
    }, 10000); // 10 seconds
}

/**
 * Stop auto refresh
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

/**
 * Update welcome message with dynamic greeting
 */
function updateWelcomeMessage() {
    const now = new Date();
    const hour = now.getHours();
    
    let greeting = 'Welcome to Class!';
    let timeInfo = `Attendance is open from ${formatTimeSlot(timeSlot.start.hour, timeSlot.start.minute)} – ${formatTimeSlot(timeSlot.end.hour, timeSlot.end.minute)}`;
    
    if (hour < 12) {
        greeting = 'Good morning, class!';
    } else if (hour < 17) {
        greeting = 'Good afternoon, class!';
    } else {
        greeting = 'Good evening, class!';
    }
    
    elements.welcomeGreeting.textContent = greeting;
    elements.welcomeTimeInfo.textContent = timeInfo;
}

/**
 * Update public attendance list
 */
function updatePublicAttendanceList() {
    const count = attendanceRecords.length;
    elements.publicStudentCount.textContent = `${count} student${count !== 1 ? 's' : ''} present`;
    
    if (count === 0) {
        elements.publicAttendanceList.innerHTML = `
            <div class="p-4 text-center text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
                <p>No attendance records yet</p>
        </div>
        `;
        return;
    }
    
    const listHTML = attendanceRecords.map((record, index) => {
        const displayName = isPrivacyMode ? 
            `Student ${index + 1} (${record.rollNumber})` : 
            record.displayName;
        
        const isSuspicious = record.is_suspicious_ip || false;
        const isDuplicate = record.is_duplicate || false;
        
        // Determine styling for suspicious records
        let itemClass = 'attendance-item flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0';
        let nameClass = 'text-sm font-medium text-gray-900';
        let statusBadge = '';
        
        if (isDuplicate) {
            itemClass += ' bg-red-50 border-red-200';
            nameClass = 'text-sm font-medium text-red-800';
            statusBadge = '<span class="text-xs text-red-600 font-medium">⚠️ Duplicate</span>';
        } else if (isSuspicious) {
            itemClass += ' bg-orange-50 border-orange-200';
            nameClass = 'text-sm font-medium text-orange-800';
            statusBadge = '<span class="text-xs text-orange-600 font-medium">🚨 Suspicious</span>';
        }
        
        return `
            <div class="${itemClass}">
                <div class="flex items-center">
                    <span class="counter">${index + 1}</span>
                    <div class="ml-3">
                        <div class="${nameClass}">${displayName}</div>
                        <div class="text-xs text-gray-500">
                            ${new Date(record.timestamp).toLocaleString()}
        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    ${statusBadge}
                    <div class="text-xs text-green-600 font-medium">
                        ✅ Present
                    </div>
                </div>
        </div>
    `;
    }).join('');
    
    elements.publicAttendanceList.innerHTML = listHTML;
}

/**
 * Update analytics dashboard
 */
function updateAnalytics() {
    const totalPresent = attendanceRecords.length;
    const attendanceRate = totalPresent > 0 ? Math.round((totalPresent / totalClassSize) * 100) : 0;
    const lastUpdated = new Date().toLocaleTimeString();
    
    elements.totalPresent.textContent = totalPresent;
    elements.attendanceRate.textContent = `${attendanceRate}%`;
    elements.lastUpdated.textContent = lastUpdated;
}

/**
 * Handle class size change
 */
function handleClassSizeChange() {
    totalClassSize = parseInt(elements.totalClassSize.value) || 30;
                updateAnalytics();
    updateMiniChart();
}

/**
 * Handle copy records to clipboard
 */
async function handleCopyRecords() {
    if (attendanceRecords.length === 0) {
        showToast('❌ No attendance records to copy', 'error');
        return;
    }
    
    try {
        const attendanceText = attendanceRecords.map((record, index) => 
            `${index + 1}. ${record.name} (${record.rollNumber})`
        ).join('\n');
        
        await navigator.clipboard.writeText(attendanceText);
        showToast('✅ Attendance records copied to clipboard', 'success');
    } catch (error) {
        console.error('❌ Error copying to clipboard:', error);
        showToast('❌ Failed to copy to clipboard', 'error');
    }
}

/**
 * Update today's summary
 */
function updateTodaySummary() {
    const count = attendanceRecords.length;
    elements.todaySummaryCount.textContent = count;
}

/**
 * Update mini chart with CSS bars
 */
function updateMiniChart() {
    const totalPresent = attendanceRecords.length;
    const percentage = totalPresent > 0 ? Math.round((totalPresent / totalClassSize) * 100) : 0;
    const filledBars = Math.round((percentage / 100) * 8); // 8 bars total
    
    elements.chartPercentage.textContent = `${percentage}%`;
    
    // Update chart bars
    const bars = elements.miniChart.children;
    for (let i = 0; i < bars.length; i++) {
        if (i < filledBars) {
            bars[i].className = 'w-4 h-4 bg-green-500 rounded';
        } else {
            bars[i].className = 'w-4 h-4 bg-gray-200 rounded';
        }
    }
}

/**
 * Update punctual students list
 */
function updatePunctualStudents() {
    if (attendanceRecords.length === 0) {
        elements.punctualStudentsList.innerHTML = '<div class="text-sm text-gray-500 text-center">No data yet</div>';
        return;
    }
    
    // Sort by timestamp (earliest first) and take top 3
    const sortedRecords = [...attendanceRecords]
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(0, 3);
    
    const listHTML = sortedRecords.map((record, index) => {
        const time = new Date(record.timestamp).toLocaleTimeString();
        const isLate = isStudentLate(record.timestamp);
        
        return `
            <div class="flex items-center justify-between p-2 rounded-lg ${isLate ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}">
                <div class="flex items-center space-x-2">
                    <span class="w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">
                        ${index + 1}
                    </span>
                    <div>
                        <div class="text-sm font-medium ${isLate ? 'text-orange-800' : 'text-green-800'}">
                            ${record.displayName}
                        </div>
                        <div class="text-xs text-gray-500">${time}</div>
                    </div>
                </div>
                <div class="text-xs ${isLate ? 'text-orange-600' : 'text-green-600'} font-medium">
                    ${isLate ? 'Late' : 'On Time'}
                </div>
            </div>
        `;
    }).join('');
    
    elements.punctualStudentsList.innerHTML = listHTML;
}

/**
 * Check if student marked attendance late
 */
function isStudentLate(timestamp) {
    const attendanceTime = new Date(timestamp);
    const timeSlotStart = new Date();
    timeSlotStart.setHours(timeSlot.start.hour, timeSlot.start.minute, 0, 0);
    
    const timeSlotEnd = new Date();
    timeSlotEnd.setHours(timeSlot.end.hour, timeSlot.end.minute, 0, 0);
    
    const timeSlotDuration = timeSlotEnd - timeSlotStart;
    const halfwayPoint = new Date(timeSlotStart.getTime() + (timeSlotDuration / 2));
    
    return attendanceTime > halfwayPoint;
}

/**
 * Get client information for security
 */
async function getClientInfo() {
    try {
        // Try multiple IP detection methods
        let ip = 'unknown';
        
        // Method 1: Try ipify.org
        try {
            const response = await fetch('https://api.ipify.org?format=json', { timeout: 5000 });
            const ipData = await response.json();
            ip = ipData.ip || 'unknown';
        } catch (e) {
            console.warn('ipify.org failed, trying alternative...');
        }
        
        // Method 2: Try ipapi.co if first method failed
        if (ip === 'unknown') {
            try {
                const response = await fetch('https://ipapi.co/json/', { timeout: 5000 });
                const ipData = await response.json();
                ip = ipData.ip || 'unknown';
            } catch (e) {
                console.warn('ipapi.co failed, using fallback...');
            }
        }
        
        // Method 3: Use a more comprehensive fingerprint
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            navigator.platform,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown',
            navigator.maxTouchPoints || 'unknown'
        ].join('|');
        
        console.log('🔍 Client Info:', { ip, fingerprint });
        
        return {
            ip: ip,
            fingerprint: fingerprint
        };
    } catch (error) {
        console.warn('Could not get client info:', error);
        return {
            ip: 'unknown',
            fingerprint: navigator.userAgent + '|' + navigator.language + '|' + screen.width + 'x' + screen.height
        };
    }
}

/**
 * Check for duplicate attendance attempts
 */
async function checkForDuplicates(rollNumber, clientInfo) {
    try {
        console.log('🔍 Checking duplicates for roll:', rollNumber);
        
        // Check if roll number already exists in current session
        const existingRecord = attendanceRecords.find(record => 
            record.rollNumber.toLowerCase() === rollNumber.toLowerCase()
        );
        
        if (existingRecord) {
            console.log('⚠️ Duplicate found in current session');
            return {
                isDuplicate: true,
                details: `Roll number ${rollNumber} already marked in this session`
            };
        }
        
        // Check database for existing records with same roll number from today
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabaseClient
            .from('attendance')
            .select('*')
            .eq('rollNumber', rollNumber)
            .gte('timestamp', today + 'T00:00:00')
            .lt('timestamp', today + 'T23:59:59');
            
        if (error) {
            console.error('Error checking duplicates:', error);
            return { isDuplicate: false, details: null };
        }
        
        if (data && data.length > 0) {
            console.log('⚠️ Duplicate found in database for today');
            return {
                isDuplicate: true,
                details: `Roll number ${rollNumber} already marked today`
            };
        }
        
        // Check for same IP address with different roll numbers (potential proxy)
        const { data: ipData, error: ipError } = await supabaseClient
            .from('attendance')
            .select('*')
            .eq('ip_address', clientInfo.ip)
            .gte('timestamp', today + 'T00:00:00')
            .lt('timestamp', today + 'T23:59:59');
            
        if (!ipError && ipData && ipData.length > 0) {
            const uniqueRollNumbers = new Set(ipData.map(r => r.rollNumber));
            
            if (uniqueRollNumbers.size > 1) {
                console.log('⚠️ Same IP address detected for different roll numbers');
                addSecurityAlert(
                    `Multiple attendance attempts from same IP (${clientInfo.ip})`,
                    `IP ${clientInfo.ip} has been used for ${uniqueRollNumbers.size} different roll numbers today`
                );
                
                // Mark all records from this IP as suspicious
                markRecordsAsSuspicious(ipData);
            }
        }
        
        // Check for same IP with same roll number (potential home attendance)
        const { data: sameRollData, error: sameRollError } = await supabaseClient
            .from('attendance')
            .select('*')
            .eq('ip_address', clientInfo.ip)
            .eq('rollNumber', rollNumber)
            .gte('timestamp', today + 'T00:00:00')
            .lt('timestamp', today + 'T23:59:59');
            
        if (!sameRollError && sameRollData && sameRollData.length > 0) {
            console.log('🏠 Same IP and roll number detected (potential home attendance)');
            addSecurityAlert(
                `Same IP and roll number detected (${clientInfo.ip})`,
                `Roll ${rollNumber} has been marked from IP ${clientInfo.ip} before today`
            );
        }
        
        console.log('✅ No duplicates found');
        return { isDuplicate: false, details: null };
    } catch (error) {
        console.error('Error in duplicate check:', error);
        return { isDuplicate: false, details: null };
    }
}

/**
 * Add security alert
 */
function addSecurityAlert(message, details) {
    const alert = {
        id: Date.now(),
        message: message,
        details: details,
        timestamp: new Date().toISOString()
    };
    
    securityAlerts.push(alert);
    updateSecurityAlerts();
}

/**
 * Mark records as suspicious (same IP)
 */
function markRecordsAsSuspicious(records) {
    records.forEach(record => {
        const localRecord = attendanceRecords.find(r => r.id === record.id);
        if (localRecord) {
            localRecord.is_suspicious_ip = true;
            localRecord.suspicious_reason = 'Multiple attendance from same IP';
        }
    });
    
    // Update the display to show red lines
    updateAttendanceList();
    updatePublicAttendanceList();
}

/**
 * Check for suspicious IP patterns when loading data
 */
function checkExistingSuspiciousIPs() {
    if (attendanceRecords.length === 0) return;
    
    // Group records by IP address
    const ipGroups = {};
    attendanceRecords.forEach(record => {
        const ip = record.ip_address || 'unknown';
        if (!ipGroups[ip]) {
            ipGroups[ip] = [];
        }
        ipGroups[ip].push(record);
    });
    
    // Check for IPs with multiple different roll numbers
    Object.keys(ipGroups).forEach(ip => {
        const records = ipGroups[ip];
        if (records.length > 1) {
            const uniqueRollNumbers = new Set(records.map(r => r.rollNumber));
            if (uniqueRollNumbers.size > 1) {
                console.log(`🚨 Suspicious IP detected: ${ip} has ${uniqueRollNumbers.size} different roll numbers`);
                
                // Mark all records from this IP as suspicious
                records.forEach(record => {
                    record.is_suspicious_ip = true;
                    record.suspicious_reason = `Multiple attendance from same IP (${ip})`;
                });
                
                // Add security alert
                addSecurityAlert(
                    `Multiple attendance attempts from same IP (${ip})`,
                    `IP ${ip} has been used for ${uniqueRollNumbers.size} different roll numbers today`
                );
            }
        }
    });
    
    // Update displays
    updateAttendanceList();
    updatePublicAttendanceList();
}

/**
 * Clear all suspicious flags
 */
function clearSuspiciousFlags() {
    attendanceRecords.forEach(record => {
        record.is_suspicious_ip = false;
        record.suspicious_reason = null;
    });
    
    console.log('🧹 Cleared all suspicious flags');
}

/**
 * Update security alerts display
 */
function updateSecurityAlerts() {
    if (securityAlerts.length === 0) {
        elements.securityAlerts.classList.add('hidden');
        return;
    }
    
    elements.securityAlerts.classList.remove('hidden');
    
    // Check if there are any proxy alerts to determine container styling
    const hasProxyAlerts = securityAlerts.some(alert => 
        alert.message.includes('Multiple attendance attempts from same IP')
    );
    
    // Update container styling based on alert types
    if (hasProxyAlerts) {
        elements.securityAlerts.className = 'mt-4';
        elements.securityAlerts.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                <div class="flex items-center space-x-2 mb-2">
                    <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <span class="text-sm font-semibold text-red-800">Security Alerts</span>
                </div>
                <div id="security-alerts-list" class="text-sm text-red-700">
                    <!-- Security alerts will be populated here -->
                </div>
            </div>
        `;
        
        // Update the reference to the alerts list
        elements.securityAlertsList = document.getElementById('security-alerts-list');
    }
    
    const alertsHTML = securityAlerts.map(alert => {
        // Determine alert type and styling
        const isProxyAlert = alert.message.includes('Multiple attendance attempts from same IP');
        const isHomeAlert = alert.message.includes('Same IP and roll number detected');
        
        let alertClass = 'flex items-start space-x-2 p-2 rounded-lg mb-2';
        let iconClass = 'w-4 h-4 mt-0.5 flex-shrink-0';
        let messageClass = 'text-sm font-medium';
        let detailsClass = 'text-xs';
        let timestampClass = 'text-xs';
        
        if (isProxyAlert) {
            // Red styling for proxy alerts
            alertClass += ' bg-red-100 border border-red-300';
            iconClass += ' text-red-600';
            messageClass += ' text-red-800';
            detailsClass += ' text-red-600';
            timestampClass += ' text-red-500';
        } else if (isHomeAlert) {
            // Orange styling for home attendance alerts
            alertClass += ' bg-orange-100 border border-orange-300';
            iconClass += ' text-orange-600';
            messageClass += ' text-orange-800';
            detailsClass += ' text-orange-600';
            timestampClass += ' text-orange-500';
        } else {
            // Default red styling for other alerts
            alertClass += ' bg-red-100 border border-red-300';
            iconClass += ' text-red-600';
            messageClass += ' text-red-800';
            detailsClass += ' text-red-600';
            timestampClass += ' text-red-500';
        }
        
        return `
            <div class="${alertClass}">
                <svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <div class="flex-1">
                    <div class="${messageClass}">${alert.message}</div>
                    <div class="${detailsClass}">${alert.details}</div>
                    <div class="${timestampClass}">${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
            </div>
        `;
    }).join('');
    
    elements.securityAlertsList.innerHTML = alertsHTML;
}

/**
 * Handle edit attendance (general edit button)
 */
function handleEditAttendance() {
    if (attendanceRecords.length === 0) {
        showToast('❌ No attendance records to edit', 'error');
        return;
    }
    
    // Edit the first record as default
    editStudentRecord(attendanceRecords[0].id);
}

/**
 * Test database connection and update functionality
 */
async function testDatabaseUpdate() {
    try {
        console.log('🧪 Testing database connection...');
        
        // Test basic connection
        const { data: testData, error: testError } = await supabaseClient
            .from('attendance')
            .select('id, name, "rollNumber"')
            .limit(1);
            
        if (testError) {
            console.error('❌ Database connection test failed:', testError);
            return false;
        }
        
        console.log('✅ Database connection test passed');
        
        // Test update functionality with a dummy record
        if (testData && testData.length > 0) {
            const testRecord = testData[0];
            console.log('🧪 Testing update functionality with record:', testRecord.id);
            
            const { error: updateError } = await supabaseClient
                .from('attendance')
                .update({ 
                    edited_at: new Date().toISOString(),
                    edited_by: 'test'
                })
                .eq('id', testRecord.id);
                
            if (updateError) {
                console.error('❌ Database update test failed:', updateError);
                console.error('❌ This indicates missing UPDATE permissions');
                console.error('❌ Please run the fix_database_update.sql script');
                return false;
            }
            
            console.log('✅ Database update test passed');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Database test failed:', error);
        return false;
    }
}

/**
 * Test database permissions specifically
 */
async function testDatabasePermissions() {
    try {
        console.log('🔐 Testing database permissions...');
        
        // Test SELECT permission
        const { data: selectData, error: selectError } = await supabaseClient
            .from('attendance')
            .select('id')
            .limit(1);
            
        if (selectError) {
            console.error('❌ SELECT permission test failed:', selectError);
            return false;
        }
        console.log('✅ SELECT permission: OK');
        
        // Test INSERT permission
        const { data: insertData, error: insertError } = await supabaseClient
            .from('attendance')
            .insert({
                name: 'TEST_USER',
                rollNumber: 'TEST_001',
                displayName: 'TEST_USER (TEST_001)',
                is_manually_edited: true,
                edited_by: 'permission_test'
            })
            .select();
            
        if (insertError) {
            console.error('❌ INSERT permission test failed:', insertError);
            return false;
        }
        console.log('✅ INSERT permission: OK');
        
        // Test UPDATE permission
        if (insertData && insertData.length > 0) {
            const testId = insertData[0].id;
            const { error: updateError } = await supabaseClient
                .from('attendance')
                .update({ edited_by: 'permission_test_updated' })
                .eq('id', testId);
                
            if (updateError) {
                console.error('❌ UPDATE permission test failed:', updateError);
                console.error('❌ This is likely the cause of your update issues!');
                return false;
            }
            console.log('✅ UPDATE permission: OK');
            
            // Clean up test record
            await supabaseClient
                .from('attendance')
                .delete()
                .eq('id', testId);
        }
        
        // Test DELETE permission
        const { data: deleteTestData, error: deleteTestError } = await supabaseClient
            .from('attendance')
            .insert({
                name: 'DELETE_TEST',
                rollNumber: 'DELETE_001',
                displayName: 'DELETE_TEST (DELETE_001)',
                edited_by: 'delete_test'
            })
            .select();
            
        if (deleteTestError) {
            console.error('❌ DELETE permission test failed:', deleteTestError);
            return false;
        }
        
        if (deleteTestData && deleteTestData.length > 0) {
            const { error: deleteError } = await supabaseClient
                .from('attendance')
                .delete()
                .eq('id', deleteTestData[0].id);
                
            if (deleteError) {
                console.error('❌ DELETE permission test failed:', deleteError);
                return false;
            }
            console.log('✅ DELETE permission: OK');
        }
        
        console.log('🎉 All database permissions are working correctly!');
        return true;
        
    } catch (error) {
        console.error('❌ Permission test failed:', error);
        return false;
    }
}

/**
 * Edit specific student record by ID
 */
function editStudentRecord(recordId) {
    console.log('🔍 Looking for record with ID:', recordId);
    console.log('📋 Available records:', attendanceRecords.map(r => ({ id: r.id, name: r.name, rollNumber: r.rollNumber })));
    
    const record = attendanceRecords.find(r => r.id === recordId);
    if (!record) {
        showToast('❌ Student record not found', 'error');
        console.error('❌ Record not found for ID:', recordId);
        return;
    }
    
    // Validate record has required properties
    if (!record.id || !record.name || !record.rollNumber) {
        showToast('❌ Invalid record data', 'error');
        console.error('❌ Invalid record data:', record);
        return;
    }
        
    currentEditingRecord = record;
    elements.editStudentName.value = record.name;
    elements.editRollNumber.value = record.rollNumber;
    elements.editModal.classList.remove('hidden');
    
    console.log('✏️ Editing record:', record);
    console.log('✅ currentEditingRecord set to:', currentEditingRecord);
    
    // Test database permissions when opening edit modal
    testDatabasePermissions().then(success => {
        if (!success) {
            showToast('⚠️ Database permission issue detected. Please run fix_database_update.sql', 'error');
        }
    });
}

/**
 * Close edit modal
 */
function closeEditModal() {
    console.log('🚪 Closing edit modal, currentEditingRecord was:', currentEditingRecord);
    elements.editModal.classList.add('hidden');
    currentEditingRecord = null;
    console.log('✅ Edit modal closed, currentEditingRecord set to null');
}

/**
 * Handle save edit - Redesigned for reliability
 */
async function handleSaveEdit() {
    // Basic validation
    if (!currentEditingRecord || !currentEditingRecord.id) {
        showToast('❌ No record selected for editing', 'error');
        return;
    }
        
    const newName = elements.editStudentName.value.trim();
    const newRollNumber = elements.editRollNumber.value.trim();
    
    if (!newName || !newRollNumber) {
        showToast('❌ Please fill in all fields', 'error');
        return;
    }
    
    // Check for duplicate roll numbers
    const existingRecord = attendanceRecords.find(record => 
        record.rollNumber.toLowerCase() === newRollNumber.toLowerCase() && 
        record.id !== currentEditingRecord.id
    );
    
    if (existingRecord) {
        showToast('❌ Roll number already exists for another student', 'error');
        return;
    }
    
    // Store original values for success message
    const originalName = currentEditingRecord.name;
    const originalRollNumber = currentEditingRecord.rollNumber;
    
    try {
        console.log('🔄 Updating record:', {
            id: currentEditingRecord.id,
            from: `${originalName} (${originalRollNumber})`,
            to: `${newName} (${newRollNumber})`
        });
        
        // Simple, direct database update with retry mechanism
        const updateData = {
            name: newName,
            rollNumber: newRollNumber,
            displayName: `${newName} (${newRollNumber})`,
            is_manually_edited: true,
            edited_by: 'admin',
            edited_at: new Date().toISOString()
        };
        
        // Direct database update with comprehensive error handling
        console.log('🔄 Attempting direct database update...');
        console.log('📝 Update data:', updateData);
        console.log('🎯 Target ID:', currentEditingRecord.id);
        
        const { data, error } = await supabaseClient
            .from('attendance')
            .update(updateData)
            .eq('id', currentEditingRecord.id)
            .select();
            
        if (error) {
            console.error('❌ Database update failed:', error);
            console.error('❌ Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            
            // Try alternative approach - delete and re-insert
            console.log('🔄 Trying delete and re-insert approach...');
            
            try {
                // First, get the original record data
                const { data: originalData, error: fetchError } = await supabaseClient
                    .from('attendance')
                    .select('*')
                    .eq('id', currentEditingRecord.id)
                    .single();
                    
                if (fetchError) {
                    throw new Error(`Failed to fetch original record: ${fetchError.message}`);
                }
                
                // Delete the old record
                const { error: deleteError } = await supabaseClient
                    .from('attendance')
                    .delete()
                    .eq('id', currentEditingRecord.id);
                    
                if (deleteError) {
                    throw new Error(`Failed to delete record: ${deleteError.message}`);
                }
                
                // Insert new record with updated data
                const newRecordData = {
                    ...originalData,
                    ...updateData,
                    id: originalData.id // Keep the same ID
                };
                
                const { data: insertData, error: insertError } = await supabaseClient
                    .from('attendance')
                    .insert(newRecordData)
                    .select();
                    
                if (insertError) {
                    throw new Error(`Failed to insert updated record: ${insertError.message}`);
                }
                
                console.log('✅ Delete and re-insert successful:', insertData);
                
            } catch (altError) {
                console.error('❌ Alternative approach also failed:', altError);
                throw new Error(`All update methods failed. Original error: ${error.message}`);
            }
        } else {
            console.log('✅ Direct database update successful:', data);
        }
        
        // Update local record immediately
        Object.assign(currentEditingRecord, updateData);
        
        // Update all UI components
        updateAttendanceList();
        updatePublicAttendanceList();
        updateAnalytics();
        updateTodaySummary();
        updateMiniChart();
        updatePunctualStudents();
        
        // Show success message
        const changes = [];
        if (originalName !== newName) {
            changes.push(`Name: "${originalName}" → "${newName}"`);
        }
        if (originalRollNumber !== newRollNumber) {
            changes.push(`Roll: "${originalRollNumber}" → "${newRollNumber}"`);
        }
        
        const changeText = changes.length > 0 ? `\nChanges: ${changes.join(', ')}` : '';
        showToast(`✅ ${newName}'s record updated successfully${changeText}`, 'success');
        
        // Close modal
        closeEditModal();
        
        // Reload data from database to ensure consistency
        setTimeout(async () => {
            try {
                await loadData();
                updateAttendanceList();
                updatePublicAttendanceList();
                updateAnalytics();
                updateTodaySummary();
                updateMiniChart();
                updatePunctualStudents();
                console.log('✅ Data reloaded from database');
            } catch (reloadError) {
                console.error('❌ Error reloading data:', reloadError);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error updating record:', error);
        showToast(`❌ Failed to update record: ${error.message}`, 'error');
    }
}

/**
 * Handle delete record
 */
async function handleDeleteRecord() {
    if (!currentEditingRecord) return;
    
    showConfirmationModal(
        `Are you sure you want to delete the attendance record for ${currentEditingRecord.displayName}?`,
        'Yes, Delete Record',
        async () => {
            try {
                const { error } = await supabaseClient
                    .from('attendance')
                    .delete()
                    .eq('id', currentEditingRecord.id);
                    
                if (error) throw error;
                
                // Remove from local records
                attendanceRecords = attendanceRecords.filter(record => record.id !== currentEditingRecord.id);
                
                updateAttendanceList();
                updatePublicAttendanceList();
                updateAnalytics();
                updateTodaySummary();
                updateMiniChart();
                updatePunctualStudents();
                
                closeEditModal();
                showToast('✅ Attendance record deleted successfully', 'success');
            } catch (error) {
                console.error('❌ Error deleting record:', error);
                showToast('❌ Failed to delete record', 'error');
            }
        }
    );
}

/**
 * Show confirmation modal
 */
function showConfirmationModal(message, confirmText, onConfirm) {
    elements.confirmationMessage.textContent = message;
    elements.confirmActionBtn.textContent = confirmText;
    pendingAction = onConfirm;
    elements.confirmationModal.classList.remove('hidden');
}

/**
 * Close confirmation modal
 */
function closeConfirmationModal() {
    elements.confirmationModal.classList.add('hidden');
    pendingAction = null;
}

/**
 * Handle confirm action
 */
function handleConfirmAction() {
    if (pendingAction) {
        pendingAction();
    }
    closeConfirmationModal();
}

/**
 * Make functions globally accessible
 */
window.editStudentRecord = editStudentRecord;
window.testDatabasePermissions = testDatabasePermissions;
window.testDatabaseUpdate = testDatabaseUpdate;

/**
 * Initialize application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', init);

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isTimeSlotOpen,
        getTimeRemaining,
        formatTime,
        formatTimeSlot,
        hashPassword
    };

}
