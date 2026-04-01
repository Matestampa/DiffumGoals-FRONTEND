/**
 * Main Application Logic
 * Handles UI interactions and goal display
 */

(function() {
    'use strict';

    // ============================================
    // State Management
    // ============================================
    const state = {
        currentStatus: 'diffuming',
        currentPage: 1,
        currentOrder: 1,
        nextPage: null,
        goals: [],
        isLoading: false,
        // Auth state
        isLoggedIn: false,
        user: null,
        currentAuthView: null, // 'login' or 'register' or null
        completingGoalId: null
    };

    // Field labels for each status
    const orderFieldLabels = {
        diffuming: 'Expire Date',
        expired: 'Expired Date',
        completed: 'Completed Date',
        mygoals: 'Status'
    };

    const myGoalsStatusOrder = ['diffuming', 'expired', 'completed'];

    const myGoalsStatusLabels = {
        diffuming: 'Diffuming',
        expired: 'Expired',
        completed: 'Completed'
    };

    const createGoalConfig = {
        minDayLimit: Number(typeof GOAL_MIN_DAY_LIMIT !== 'undefined' ? GOAL_MIN_DAY_LIMIT : 15) || 15,
        maxDayLimit: Number(typeof GOAL_MAX_DAY_LIMIT !== 'undefined' ? GOAL_MAX_DAY_LIMIT : 90) || 90,
        imageWidth: Number(typeof GOAL_IMG_WIDTH !== 'undefined' ? GOAL_IMG_WIDTH : 100) || 100,
        imageHeight: Number(typeof GOAL_IMG_HEIGHT !== 'undefined' ? GOAL_IMG_HEIGHT : 100) || 100,
        imageType: (typeof GOAL_IMG_TYPE !== 'undefined' ? GOAL_IMG_TYPE : 'image/png') || 'image/png'
    };

    let createGoalPromptTimer = null;

    // ============================================
    // DOM Elements
    // ============================================
    const elements = {
        tabButtons: document.querySelectorAll('.tabs__btn'),
        goalsGrid: document.getElementById('goalsGrid'),
        loading: document.getElementById('loading'),
        errorMessage: document.getElementById('errorMessage'),
        errorText: document.querySelector('.error-message__text'),
        emptyState: document.getElementById('emptyState'),
        pagination: document.getElementById('pagination'),
        loadMoreBtn: document.getElementById('loadMoreBtn'),
        retryBtn: document.getElementById('retryBtn'),
        goalCardTemplate: document.getElementById('goalCardTemplate'),
        orderToggleBtn: document.getElementById('orderToggleBtn'),
        orderFieldLabel: document.getElementById('orderFieldLabel'),
        controlsRow: document.getElementById('controlsRow'),
        myGoalsTab: document.querySelector('.tabs__btn[data-status="mygoals"]'),
        showCreateGoalBtn: document.getElementById('showCreateGoalBtn'),
        createGoalPrompt: document.getElementById('createGoalPrompt'),
        createGoalSection: document.getElementById('createGoalSection'),
        createGoalForm: document.getElementById('createGoalForm'),
        goalDescription: document.getElementById('goalDescription'),
        goalLimitDate: document.getElementById('goalLimitDate'),
        goalImage: document.getElementById('goalImage'),
        goalLimitDateHint: document.getElementById('goalLimitDateHint'),
        goalImageHint: document.getElementById('goalImageHint'),
        createGoalError: document.getElementById('createGoalError'),
        cancelCreateGoalBtn: document.getElementById('cancelCreateGoalBtn'),
        submitCreateGoalBtn: document.getElementById('submitCreateGoalBtn'),
        completeGoalSection: document.getElementById('completeGoalSection'),
        completeGoalForm: document.getElementById('completeGoalForm'),
        completeGoalId: document.getElementById('completeGoalId'),
        completeGoalImage: document.getElementById('completeGoalImage'),
        completeGoalImageHint: document.getElementById('completeGoalImageHint'),
        completeGoalError: document.getElementById('completeGoalError'),
        cancelCompleteGoalBtn: document.getElementById('cancelCompleteGoalBtn'),
        submitCompleteGoalBtn: document.getElementById('submitCompleteGoalBtn'),
        // Auth elements
        authButtons: document.getElementById('authButtons'),
        authUser: document.getElementById('authUser'),
        authUsername: document.getElementById('authUsername'),
        showLoginBtn: document.getElementById('showLoginBtn'),
        showRegisterBtn: document.getElementById('showRegisterBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        // Login form
        loginSection: document.getElementById('loginSection'),
        loginForm: document.getElementById('loginForm'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        loginError: document.getElementById('loginError'),
        cancelLoginBtn: document.getElementById('cancelLoginBtn'),
        submitLoginBtn: document.getElementById('submitLoginBtn'),
        // Register form
        registerSection: document.getElementById('registerSection'),
        registerForm: document.getElementById('registerForm'),
        registerUsername: document.getElementById('registerUsername'),
        registerPassword: document.getElementById('registerPassword'),
        registerError: document.getElementById('registerError'),
        cancelRegisterBtn: document.getElementById('cancelRegisterBtn'),
        submitRegisterBtn: document.getElementById('submitRegisterBtn'),
        // Main content (to hide when showing auth forms)
        tabs: document.querySelector('.tabs'),
        orderSelector: document.querySelector('.order-selector'),
        mainContent: document.querySelector('.main-content')
    };

    // ============================================
    // UI State Management
    // ============================================
    
    /**
     * Show loading state
     */
    function showLoading() {
        hideCreateGoalPrompt();
        elements.loading.classList.add('loading--visible');
        elements.errorMessage.classList.remove('error-message--visible');
        elements.emptyState.classList.remove('empty-state--visible');
        elements.pagination.classList.remove('pagination--visible');
    }

    /**
     * Show prompt near Create Goal button when unauthenticated
     */
    function showCreateGoalPrompt() {
        if (!elements.createGoalPrompt) return;

        elements.createGoalPrompt.classList.add('create-goal-prompt--visible');

        if (createGoalPromptTimer) {
            clearTimeout(createGoalPromptTimer);
        }

        createGoalPromptTimer = setTimeout(() => {
            hideCreateGoalPrompt();
        }, 2600);
    }

    /**
     * Hide the unauthenticated Create Goal prompt
     */
    function hideCreateGoalPrompt() {
        if (!elements.createGoalPrompt) return;
        elements.createGoalPrompt.classList.remove('create-goal-prompt--visible');
    }

    /**
     * Hide loading state
     */
    function hideLoading() {
        elements.loading.classList.remove('loading--visible');
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    function showError(message) {
        hideLoading();
        elements.errorText.textContent = message;
        elements.errorMessage.classList.add('error-message--visible');
        elements.emptyState.classList.remove('empty-state--visible');
        elements.pagination.classList.remove('pagination--visible');
    }

    /**
     * Show empty state
     */
    function showEmpty() {
        hideLoading();
        elements.emptyState.classList.add('empty-state--visible');
        elements.errorMessage.classList.remove('error-message--visible');
        elements.pagination.classList.remove('pagination--visible');
    }

    /**
     * Show pagination if there's a next page
     */
    function updatePagination() {
        if (state.currentStatus !== 'mygoals' && state.nextPage) {
            elements.pagination.classList.add('pagination--visible');
        } else {
            elements.pagination.classList.remove('pagination--visible');
        }
    }

    /**
     * Hide order selector on My Goals since statuses are displayed together
     * @param {string} status - The active tab status
     */
    function updateOrderSelectorVisibility(status) {
        elements.orderSelector.style.display = status === 'mygoals' ? 'none' : '';
    }

    /**
     * Keep current status valid for unauthenticated users
     */
    function ensureValidStatusForAuth() {
        if (!state.isLoggedIn && state.currentStatus === 'mygoals') {
            state.currentStatus = 'diffuming';
            state.currentPage = 1;
            state.nextPage = null;
            setActiveTab(state.currentStatus);
            updateOrderFieldLabel(state.currentStatus);
        }
    }

    /**
     * Show My Goals tab only to authenticated users
     */
    function updateMyGoalsTabVisibility() {
        if (!elements.myGoalsTab) return;
        elements.myGoalsTab.style.display = state.isLoggedIn ? '' : 'none';
    }

    /**
     * Set active tab
     * @param {string} status - The status to set as active
     */
    function setActiveTab(status) {
        elements.tabButtons.forEach(btn => {
            if (btn.dataset.status === status) {
                btn.classList.add('tabs__btn--active');
            } else {
                btn.classList.remove('tabs__btn--active');
            }
        });

        updateOrderSelectorVisibility(status);
    }

    // ============================================
    // Goal Card Creation
    // ============================================

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date
     */
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Get status label
     * @param {Object} goal - Goal object
     * @returns {string} - Status label
     */
    function getStatusLabel(goal) {
        if (goal.completed) return 'Completed';
        if (goal.expired) return 'Expired';
        return 'Diffuming';
    }

    /**
     * Get status class
     * @param {Object} goal - Goal object
     * @returns {string} - CSS class for status
     */
    function getStatusClass(goal) {
        if (goal.completed) return 'goal-card__status--completed';
        if (goal.expired) return 'goal-card__status--expired';
        return 'goal-card__status--diffuming';
    }

    /**
     * Create a goal card element
     * @param {Object} goal - Goal data
     * @returns {HTMLElement} - Goal card element
     */
    function createGoalCard(goal, options = {}) {
        const template = elements.goalCardTemplate.content.cloneNode(true);
        const card = template.querySelector('.goal-card');
        const showCompleteButton = Boolean(options.showCompleteButton);
        const goalStatus = getGoalStatusKey(goal);
        
        // Set image
        const img = card.querySelector('.goal-card__image');
        const defaultImage = getDefaultImageForStatus(goal, goalStatus);
        img.src = defaultImage;
        img.alt = goal.descr || 'Goal image';
        
        // Handle image error
        img.onerror = function() {
            this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%2364748b" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
        };
        
        // Set description
        const description = card.querySelector('.goal-card__description');
        description.textContent = goal.descr || 'No description';
        
        // Set date based on goal status
        const dateEl = card.querySelector('.goal-card__date');
        if (goal.completed) {
            dateEl.textContent = `Completed Date: ${formatDate(goal.completed_date)}`;
        } else if (goal.expired) {
            dateEl.textContent = `Expired Date: ${formatDate(goal.limit_date)}`;
        } else {
            dateEl.textContent = `Limit Date: ${formatDate(goal.limit_date)}`;
        }
        
        // Set data attribute for goal ID
        card.dataset.goalId = goal._id;

        // Status-aware hover image behavior
        setupCardImageHoverBehavior(card, img, goal, goalStatus, defaultImage);

        if (showCompleteButton) {
            const actions = document.createElement('div');
            actions.className = 'goal-card__actions';

            const completeBtn = document.createElement('button');
            completeBtn.type = 'button';
            completeBtn.className = 'goal-card__complete-btn';
            completeBtn.dataset.action = 'complete-goal';
            completeBtn.textContent = 'Complete';

            actions.appendChild(completeBtn);
            card.querySelector('.goal-card__content').appendChild(actions);
        }
        
        return card;
    }

    /**
     * Get default (non-hover) image URL by goal status
     * @param {Object} goal - Goal data
     * @param {'diffuming'|'expired'|'completed'} status - Goal status key
     * @returns {string}
     */
    function getDefaultImageForStatus(goal, status) {
        if (status === 'completed') {
            return goal.img_completed || goal.img_latest || goal.img_original || '';
        }

        return goal.img_latest || goal.img_original || goal.img_completed || '';
    }

    /**
     * Attach hover behavior for switching card images based on status
     * @param {HTMLElement} card - Goal card element
     * @param {HTMLImageElement} img - Image element in card
     * @param {Object} goal - Goal data
     * @param {'diffuming'|'expired'|'completed'} status - Goal status key
     * @param {string} defaultImage - Image used when not hovering
     */
    function setupCardImageHoverBehavior(card, img, goal, status, defaultImage) {
        let hoverIntervalId = null;

        function stopHoverCarousel() {
            if (hoverIntervalId) {
                clearInterval(hoverIntervalId);
                hoverIntervalId = null;
            }
        }

        card.addEventListener('mouseenter', () => {
            if (status === 'completed') {
                const hoverImages = [goal.img_original, goal.img_latest].filter(Boolean);
                if (hoverImages.length === 0) return;

                let currentIndex = 0;
                img.src = hoverImages[currentIndex];

                if (hoverImages.length > 1) {
                    hoverIntervalId = setInterval(() => {
                        currentIndex = (currentIndex + 1) % hoverImages.length;
                        img.src = hoverImages[currentIndex];
                    }, 1000);
                }

                return;
            }

            const hoverImage = goal.img_original;
            if (hoverImage) {
                img.src = hoverImage;
            }
        });

        card.addEventListener('mouseleave', () => {
            stopHoverCarousel();
            img.src = defaultImage;
        });
    }

    /**
     * Resolve goal status from goal flags
     * @param {Object} goal - Goal data
     * @returns {'diffuming'|'expired'|'completed'}
     */
    function getGoalStatusKey(goal) {
        if (goal.completed) return 'completed';
        if (goal.expired) return 'expired';
        return 'diffuming';
    }

    /**
     * Group goals by status for My Goals view
     * @param {Array} goals - Goal list
     * @returns {Object<string, Array>} - Grouped goals object
     */
    function groupGoalsByStatus(goals) {
        const grouped = {
            diffuming: [],
            expired: [],
            completed: []
        };

        goals.forEach(goal => {
            const status = getGoalStatusKey(goal);
            grouped[status].push(goal);
        });

        return grouped;
    }

    /**
     * Render My Goals grouped by status
     * @param {Array} goals - User goals list
     */
    function renderMyGoals(goals) {
        elements.goalsGrid.innerHTML = '';

        const groupedGoals = groupGoalsByStatus(goals);
        const hasAnyGoals = myGoalsStatusOrder.some(status => groupedGoals[status].length > 0);

        if (!hasAnyGoals) {
            showEmpty();
            return;
        }

        myGoalsStatusOrder.forEach(status => {
            const goalsForStatus = groupedGoals[status];

            if (goalsForStatus.length === 0) {
                return;
            }

            const section = document.createElement('section');
            section.className = 'my-goals-section';

            const heading = document.createElement('h3');
            heading.className = `my-goals-section__title my-goals-section__title--${status}`;
            heading.textContent = `${myGoalsStatusLabels[status]} (${goalsForStatus.length})`;

            const statusGrid = document.createElement('div');
            statusGrid.className = 'goals-grid my-goals-section__grid';

            goalsForStatus.forEach(goal => {
                statusGrid.appendChild(createGoalCard(goal, {
                    showCompleteButton: status === 'diffuming'
                }));
            });

            section.appendChild(heading);
            section.appendChild(statusGrid);
            elements.goalsGrid.appendChild(section);
        });
    }

    /**
     * Render goals to the grid
     * @param {Array} goals - Array of goal objects
     * @param {boolean} append - Whether to append or replace
     */
    function renderGoals(goals, append = false) {
        if (!append) {
            elements.goalsGrid.innerHTML = '';
        }
        
        goals.forEach(goal => {
            const card = createGoalCard(goal);
            elements.goalsGrid.appendChild(card);
        });
    }

    /**
     * Format date as yyyy-mm-dd for date input controls
     * @param {Date} date - Date object
     * @returns {string}
     */
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Add days to a date using local time
     * @param {Date} date - Base date
     * @param {number} days - Number of days to add
     * @returns {Date}
     */
    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * Configure date bounds and hint from constants
     */
    function configureCreateGoalDateInput() {
        const today = new Date();
        const minDate = addDays(today, createGoalConfig.minDayLimit);
        const maxDate = addDays(today, createGoalConfig.maxDayLimit);

        elements.goalLimitDate.min = formatDateForInput(minDate);
        elements.goalLimitDate.max = formatDateForInput(maxDate);
        elements.goalLimitDateHint.textContent = `Between ${createGoalConfig.minDayLimit} and ${createGoalConfig.maxDayLimit} days from today`;
    }

    /**
     * Configure image validation hint from constants
     */
    function configureCreateGoalImageHint() {
        elements.goalImage.accept = createGoalConfig.imageType;
        elements.goalImageHint.textContent = `${createGoalConfig.imageType} only, auto-resized to ${createGoalConfig.imageWidth}x${createGoalConfig.imageHeight} px if needed`;
    }

    /**
     * Validate create-goal form values against backend contract/constants
     * @returns {Promise<{valid:boolean, message:string, payload?:Object}>}
     */
    async function validateCreateGoalForm() {
        const descr = elements.goalDescription.value.trim();
        const limitDate = elements.goalLimitDate.value;
        const img = elements.goalImage.files[0];

        if (descr.length < 5 || descr.length > 255) {
            return {
                valid: false,
                message: 'Description must be between 5 and 255 characters.'
            };
        }

        if (!limitDate) {
            return {
                valid: false,
                message: 'Limit date is required.'
            };
        }

        const selectedDate = new Date(`${limitDate}T00:00:00`);
        const minDate = addDays(new Date(), createGoalConfig.minDayLimit);
        const maxDate = addDays(new Date(), createGoalConfig.maxDayLimit);
        minDate.setHours(0, 0, 0, 0);
        maxDate.setHours(0, 0, 0, 0);

        if (selectedDate < minDate || selectedDate > maxDate) {
            return {
                valid: false,
                message: `Limit date must be between ${createGoalConfig.minDayLimit} and ${createGoalConfig.maxDayLimit} days in the future.`
            };
        }

        if (!img) {
            return {
                valid: false,
                message: 'Goal image is required.'
            };
        }

        if (img.type !== createGoalConfig.imageType) {
            return {
                valid: false,
                message: `Image type must be ${createGoalConfig.imageType}.`
            };
        }

        if (!window.ImageUtils || typeof window.ImageUtils.getImageDimensions !== 'function' || typeof window.ImageUtils.resizeImageToDimensions !== 'function') {
            return {
                valid: false,
                message: 'Image utilities are not available. Please refresh the page and try again.'
            };
        }

        let imageForUpload;
        try {
            imageForUpload = await normalizeImageForGoalUpload(img);
        } catch (error) {
            return {
                valid: false,
                message: 'Unable to process image. Please choose a valid image.'
            };
        }

        return {
            valid: true,
            message: '',
            payload: {
                descr,
                limitDate,
                img: imageForUpload
            }
        };
    }

    /**
     * Normalize image for goal upload by resizing to configured dimensions if needed
     * @param {File} img - Source image
     * @returns {Promise<File>} - Original or resized image file
     */
    async function normalizeImageForGoalUpload(img) {
        const dimensions = await window.ImageUtils.getImageDimensions(img);
        if (dimensions.width === createGoalConfig.imageWidth && dimensions.height === createGoalConfig.imageHeight) {
            return img;
        }

        return window.ImageUtils.resizeImageToDimensions(
            img,
            createGoalConfig.imageWidth,
            createGoalConfig.imageHeight,
            createGoalConfig.imageType
        );
    }

    /**
     * Show create-goal section and hide feed content
     */
    function showCreateGoalSection() {
        if (!state.isLoggedIn) {
            showCreateGoalPrompt();
            return;
        }

        elements.createGoalSection.classList.add('create-goal-section--visible');
        elements.tabs.style.display = 'none';
        elements.controlsRow.style.display = 'none';
        elements.mainContent.style.display = 'none';

        elements.createGoalForm.reset();
        elements.createGoalError.textContent = '';
        configureCreateGoalDateInput();
        configureCreateGoalImageHint();
    }

    /**
     * Configure completion image hint from constants
     */
    function configureCompleteGoalImageHint() {
        elements.completeGoalImage.accept = createGoalConfig.imageType;
        elements.completeGoalImageHint.textContent = `${createGoalConfig.imageType} only, auto-resized to ${createGoalConfig.imageWidth}x${createGoalConfig.imageHeight} px if needed`;
    }

    /**
     * Show complete-goal section
     * @param {string} goalId - Goal ID to complete
     */
    function showCompleteGoalSection(goalId) {
        if (!state.isLoggedIn) {
            showCreateGoalPrompt();
            return;
        }

        state.completingGoalId = goalId;
        elements.completeGoalId.value = goalId;
        elements.completeGoalForm.reset();
        elements.completeGoalError.textContent = '';

        elements.completeGoalSection.classList.add('complete-goal-section--visible');
        elements.tabs.style.display = 'none';
        elements.controlsRow.style.display = 'none';
        elements.mainContent.style.display = 'none';
        hideCreateGoalSection();

        configureCompleteGoalImageHint();
    }

    /**
     * Hide complete-goal section
     */
    function hideCompleteGoalSection() {
        elements.completeGoalSection.classList.remove('complete-goal-section--visible');
        elements.completeGoalError.textContent = '';
        state.completingGoalId = null;
        elements.completeGoalId.value = '';
    }

    /**
     * Validate completion image and resize if needed
     * @returns {Promise<{valid:boolean, message:string, payload?:Object}>}
     */
    async function validateCompleteGoalForm() {
        const goalId = state.completingGoalId || elements.completeGoalId.value;
        const img = elements.completeGoalImage.files[0];

        if (!goalId) {
            return {
                valid: false,
                message: 'Invalid goal selection.'
            };
        }

        if (!img) {
            return {
                valid: false,
                message: 'Completion image is required.'
            };
        }

        if (img.type !== createGoalConfig.imageType) {
            return {
                valid: false,
                message: `Image type must be ${createGoalConfig.imageType}.`
            };
        }

        if (!window.ImageUtils || typeof window.ImageUtils.getImageDimensions !== 'function' || typeof window.ImageUtils.resizeImageToDimensions !== 'function') {
            return {
                valid: false,
                message: 'Image utilities are not available. Please refresh the page and try again.'
            };
        }

        try {
            const imageForUpload = await normalizeImageForGoalUpload(img);
            return {
                valid: true,
                message: '',
                payload: {
                    goalId,
                    img: imageForUpload
                }
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Unable to process image. Please choose a valid image.'
            };
        }
    }

    /**
     * Handle complete-goal form submit
     * @param {Event} event - Submit event
     */
    async function handleCompleteGoal(event) {
        event.preventDefault();

        if (!state.isLoggedIn) {
            elements.completeGoalError.textContent = 'Please login to complete a goal.';
            return;
        }

        elements.completeGoalError.textContent = '';
        elements.submitCompleteGoalBtn.disabled = true;

        try {
            const validation = await validateCompleteGoalForm();
            if (!validation.valid) {
                elements.completeGoalError.textContent = validation.message;
                return;
            }

            const response = await ApiService.completeGoal(
                validation.payload.goalId,
                validation.payload.img
            );

            if (!response.success) {
                elements.completeGoalError.textContent = response.error?.message || 'Failed to complete goal.';
                return;
            }

            hideCompleteGoalSection();
            state.currentStatus = 'mygoals';
            state.currentPage = 1;
            state.nextPage = null;
            setActiveTab(state.currentStatus);
            updateOrderFieldLabel(state.currentStatus);
            showMainContent();
            fetchGoals(state.currentStatus);
        } catch (error) {
            console.error('Complete goal error:', error);
            elements.completeGoalError.textContent = 'An unexpected error occurred. Please try again.';
        } finally {
            elements.submitCompleteGoalBtn.disabled = false;
        }
    }

    /**
     * Hide create-goal section
     */
    function hideCreateGoalSection() {
        elements.createGoalSection.classList.remove('create-goal-section--visible');
        hideCreateGoalPrompt();
    }

    /**
     * Handle create-goal form submit
     * @param {Event} event - Submit event
     */
    async function handleCreateGoal(event) {
        event.preventDefault();

        if (!state.isLoggedIn) {
            elements.createGoalError.textContent = 'Please login to create a goal.';
            return;
        }

        elements.createGoalError.textContent = '';
        elements.submitCreateGoalBtn.disabled = true;

        try {
            const validation = await validateCreateGoalForm();
            if (!validation.valid) {
                elements.createGoalError.textContent = validation.message;
                return;
            }

            const response = await ApiService.createGoal(
                validation.payload.descr,
                validation.payload.limitDate,
                validation.payload.img
            );

            if (!response.success) {
                elements.createGoalError.textContent = response.error?.message || 'Failed to create goal.';
                return;
            }

            hideCreateGoalSection();
            state.currentStatus = 'diffuming';
            state.currentPage = 1;
            state.nextPage = null;
            setActiveTab(state.currentStatus);
            updateOrderFieldLabel(state.currentStatus);
            showMainContent();
            fetchGoals(state.currentStatus);
        } catch (error) {
            console.error('Create goal error:', error);
            elements.createGoalError.textContent = 'An unexpected error occurred. Please try again.';
        } finally {
            elements.submitCreateGoalBtn.disabled = false;
        }
    }

    // ============================================
    // API Calls
    // ============================================

    /**
     * Fetch goals from API
     * @param {string} status - Goal status filter
     * @param {number} page - Page number
     * @param {boolean} append - Whether to append results
     */
    async function fetchGoals(status, page = 1, append = false) {
        if (status === 'mygoals') {
            await fetchMyGoals();
            return;
        }

        if (state.isLoading) return;
        
        state.isLoading = true;
        
        if (!append) {
            showLoading();
            state.goals = [];
        }
        
        elements.loadMoreBtn.disabled = true;
        
        try {
            const response = await ApiService.getAllGoals({
                goalStatus: status.toUpperCase(),
                page: page,
                order: state.currentOrder
            });
            
            hideLoading();
            
            if (!response.success) {
                showError(response.error?.message || 'Failed to fetch goals');
                return;
            }
            
            const { goals, nextPage } = response.data;
            
            state.goals = append ? [...state.goals, ...goals] : goals;
            state.nextPage = nextPage;
            state.currentPage = page;
            
            if (state.goals.length === 0) {
                elements.goalsGrid.innerHTML = '';
                showEmpty();
            } else {
                elements.emptyState.classList.remove('empty-state--visible');
                elements.errorMessage.classList.remove('error-message--visible');
                renderGoals(goals, append);
                updatePagination();
            }
            
        } catch (error) {
            console.error('Error fetching goals:', error);
            showError('An unexpected error occurred. Please try again.');
        } finally {
            state.isLoading = false;
            elements.loadMoreBtn.disabled = false;
        }
    }

    /**
     * Fetch current user's goals and render grouped by status
     */
    async function fetchMyGoals() {
        if (state.isLoading) return;

        if (!state.isLoggedIn) {
            state.currentStatus = 'diffuming';
            state.currentPage = 1;
            state.nextPage = null;
            setActiveTab(state.currentStatus);
            updateOrderFieldLabel(state.currentStatus);
            elements.goalsGrid.innerHTML = '';
            fetchGoals(state.currentStatus);
            return;
        }

        state.isLoading = true;
        showLoading();
        state.goals = [];
        state.nextPage = null;
        state.currentPage = 1;
        elements.loadMoreBtn.disabled = true;

        try {
            const response = await ApiService.getMyGoals();

            hideLoading();

            if (!response.success) {
                showError(response.error?.message || 'Failed to fetch your goals');
                return;
            }

            const goals = Array.isArray(response.data?.goals)
                ? response.data.goals
                : (Array.isArray(response.data) ? response.data : []);

            state.goals = goals;

            elements.emptyState.classList.remove('empty-state--visible');
            elements.errorMessage.classList.remove('error-message--visible');
            renderMyGoals(goals);
            updatePagination();
        } catch (error) {
            console.error('Error fetching my goals:', error);
            showError('An unexpected error occurred. Please try again.');
        } finally {
            state.isLoading = false;
            elements.loadMoreBtn.disabled = false;
        }
    }

    // ============================================
    // Auth Functions
    // ============================================

    /**
     * Update UI based on auth state
     */
    function updateAuthUI() {
        ensureValidStatusForAuth();
        updateMyGoalsTabVisibility();

        if (state.isLoggedIn && state.user) {
            elements.authButtons.classList.add('auth-buttons--hidden');
            elements.authUser.classList.add('auth-user--visible');
            elements.authUsername.textContent = state.user.username;
        } else {
            elements.authButtons.classList.remove('auth-buttons--hidden');
            elements.authUser.classList.remove('auth-user--visible');
            elements.authUsername.textContent = '';
        }
    }

    /**
     * Show main content, hide auth forms
     */
    function showMainContent() {
        state.currentAuthView = null;
        elements.loginSection.classList.remove('auth-section--visible');
        elements.registerSection.classList.remove('auth-section--visible');
        hideCreateGoalSection();
        hideCompleteGoalSection();
        elements.tabs.style.display = '';
        updateOrderSelectorVisibility(state.currentStatus);
        elements.controlsRow.style.display = '';
        elements.mainContent.style.display = '';
    }

    /**
     * Show login form
     */
    function showLoginForm() {
        state.currentAuthView = 'login';
        elements.loginSection.classList.add('auth-section--visible');
        elements.registerSection.classList.remove('auth-section--visible');
        hideCreateGoalPrompt();
        hideCreateGoalSection();
        hideCompleteGoalSection();
        elements.tabs.style.display = 'none';
        elements.controlsRow.style.display = 'none';
        elements.mainContent.style.display = 'none';
        // Clear form
        elements.loginForm.reset();
        elements.loginError.textContent = '';
    }

    /**
     * Show register form
     */
    function showRegisterForm() {
        state.currentAuthView = 'register';
        elements.registerSection.classList.add('auth-section--visible');
        elements.loginSection.classList.remove('auth-section--visible');
        hideCreateGoalPrompt();
        hideCreateGoalSection();
        hideCompleteGoalSection();
        elements.tabs.style.display = 'none';
        elements.controlsRow.style.display = 'none';
        elements.mainContent.style.display = 'none';
        // Clear form
        elements.registerForm.reset();
        elements.registerError.textContent = '';
    }

    /**
     * Check if user is logged in
     */
    async function checkAuthStatus() {
        try {
            const response = await ApiService.isLoggedIn();
            if (response.success) {
                state.isLoggedIn = true;
                state.user = {
                    id: response.data.user_id,
                    username: response.data.username
                };
            } else {
                state.isLoggedIn = false;
                state.user = null;
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            state.isLoggedIn = false;
            state.user = null;
        }
        updateAuthUI();
    }

    /**
     * Handle login form submit
     * @param {Event} event - Submit event
     */
    async function handleLogin(event) {
        event.preventDefault();
        
        const username = elements.loginUsername.value.trim();
        const password = elements.loginPassword.value;
        
        elements.loginError.textContent = '';
        elements.submitLoginBtn.disabled = true;
        
        try {
            const response = await ApiService.loginUser(username, password);
            
            if (response.success) {
                state.isLoggedIn = true;
                state.user = {
                    id: response.data.user_id,
                    username: response.data.username
                };
                updateAuthUI();
                showMainContent();
                fetchGoals(state.currentStatus);
            } else {
                elements.loginError.textContent = response.error?.message || 'Login failed';
            }
        } catch (error) {
            console.error('Login error:', error);
            elements.loginError.textContent = 'An error occurred. Please try again.';
        } finally {
            elements.submitLoginBtn.disabled = false;
        }
    }

    /**
     * Handle register form submit
     * @param {Event} event - Submit event
     */
    async function handleRegister(event) {
        event.preventDefault();
        
        const username = elements.registerUsername.value.trim();
        const password = elements.registerPassword.value;
        
        elements.registerError.textContent = '';
        elements.submitRegisterBtn.disabled = true;
        
        try {
            const response = await ApiService.registerUser(username, password);
            
            if (response.success) {
                // Auto-login after successful registration
                const loginResponse = await ApiService.loginUser(username, password);
                if (loginResponse.success) {
                    state.isLoggedIn = true;
                    state.user = {
                        id: loginResponse.data.user_id,
                        username: loginResponse.data.username
                    };
                    updateAuthUI();
                    showMainContent();
                    fetchGoals(state.currentStatus);
                } else {
                    // Registration succeeded but auto-login failed, show login form
                    showLoginForm();
                }
            } else {
                elements.registerError.textContent = response.error?.message || 'Registration failed';
            }
        } catch (error) {
            console.error('Register error:', error);
            elements.registerError.textContent = 'An error occurred. Please try again.';
        } finally {
            elements.submitRegisterBtn.disabled = false;
        }
    }

    /**
     * Handle logout
     */
    async function handleLogout() {
        try {
            await ApiService.logoutUser();
        } catch (error) {
            console.error('Logout error:', error);
        }
        state.isLoggedIn = false;
        state.user = null;
        updateAuthUI();

        if (state.currentStatus === 'mygoals') {
            state.currentStatus = 'diffuming';
            state.currentPage = 1;
            state.nextPage = null;
            setActiveTab(state.currentStatus);
            updateOrderFieldLabel(state.currentStatus);
        }

        fetchGoals(state.currentStatus);
    }

    // ============================================
    // Event Handlers
    // ============================================

    /**
     * Handle tab click
     * @param {Event} event - Click event
     */
    function handleTabClick(event) {
        const btn = event.target;
        const status = btn.dataset.status;
        
        if (status === state.currentStatus) return;
        
        state.currentStatus = status;
        state.currentPage = 1;
        state.nextPage = null;
        
        setActiveTab(status);
        updateOrderFieldLabel(status);
        fetchGoals(status);
    }

    /**
     * Update order field label based on status
     * @param {string} status - Current status
     */
    function updateOrderFieldLabel(status) {
        elements.orderFieldLabel.textContent = orderFieldLabels[status] || 'Date';
    }

    /**
     * Handle order toggle click
     */
    function handleOrderToggle() {
        state.currentOrder = state.currentOrder === 1 ? -1 : 1;
        state.currentPage = 1;
        state.nextPage = null;
        
        // Update button UI
        const btn = elements.orderToggleBtn;
        btn.dataset.order = state.currentOrder;
        btn.querySelector('.order-selector__icon').textContent = state.currentOrder === 1 ? '↑' : '↓';
        btn.querySelector('.order-selector__text').textContent = state.currentOrder === 1 ? 'ASC' : 'DESC';
        
        fetchGoals(state.currentStatus);
    }

    /**
     * Handle load more click
     */
    function handleLoadMore() {
        if (state.nextPage) {
            fetchGoals(state.currentStatus, state.nextPage, true);
        }
    }

    /**
     * Handle retry click
     */
    function handleRetry() {
        fetchGoals(state.currentStatus, state.currentPage);
    }

    /**
     * Handle goal card action clicks
     * @param {Event} event - Click event
     */
    function handleGoalGridClick(event) {
        const actionButton = event.target.closest('[data-action="complete-goal"]');
        if (!actionButton) return;

        const card = actionButton.closest('.goal-card');
        const goalId = card?.dataset.goalId;
        if (!goalId) return;

        showCompleteGoalSection(goalId);
    }

    // ============================================
    // Event Listeners Setup
    // ============================================

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        // Tab buttons
        elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', handleTabClick);
        });
        
        // Load more button
        elements.loadMoreBtn.addEventListener('click', handleLoadMore);
        
        // Retry button
        elements.retryBtn.addEventListener('click', handleRetry);

        // Goal card actions
        elements.goalsGrid.addEventListener('click', handleGoalGridClick);
        
        // Order toggle button
        elements.orderToggleBtn.addEventListener('click', handleOrderToggle);

        // Create-goal actions
        elements.showCreateGoalBtn.addEventListener('click', showCreateGoalSection);
        elements.createGoalForm.addEventListener('submit', handleCreateGoal);
        elements.cancelCreateGoalBtn.addEventListener('click', showMainContent);

        // Complete-goal actions
        elements.completeGoalForm.addEventListener('submit', handleCompleteGoal);
        elements.cancelCompleteGoalBtn.addEventListener('click', showMainContent);
        
        // Auth buttons
        elements.showLoginBtn.addEventListener('click', showLoginForm);
        elements.showRegisterBtn.addEventListener('click', showRegisterForm);
        elements.logoutBtn.addEventListener('click', handleLogout);
        
        // Login form
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.cancelLoginBtn.addEventListener('click', showMainContent);
        
        // Register form
        elements.registerForm.addEventListener('submit', handleRegister);
        elements.cancelRegisterBtn.addEventListener('click', showMainContent);
    }

    // ============================================
    // Initialization
    // ============================================

    /**
     * Initialize the application
     */
    async function init() {
        initEventListeners();
        setActiveTab(state.currentStatus);
        updateOrderFieldLabel(state.currentStatus);
        configureCreateGoalDateInput();
        configureCreateGoalImageHint();
        configureCompleteGoalImageHint();
        await checkAuthStatus();
        fetchGoals(state.currentStatus);
    }

    // Start the app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
