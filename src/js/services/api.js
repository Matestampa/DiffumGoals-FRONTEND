/**
 * API Service Layer
 * Handles all API calls to the backend
 */

const API_BASE_URL = "https://diffumgoalsapi.lat";

/**
 * Response handler for API calls
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} - Parsed response data
 */
async function handleResponse(response) {
    const data = await response.json();
    
    // Check HTTP status or body status field
    if (response.ok || data.status === 200) {
        return {
            success: true,
            message: data.message,
            data: data.data
        };
    } else {
        return {
            success: false,
            status: data.status || response.status,
            error: {
                message: data.error?.message || 'Unknown error',
                code: data.error?.code || 'UNKNOWN_ERROR'
            }
        };
    }
}

/**
 * Handle fetch errors
 * @param {Error} error - Error object
 * @returns {Object} - Formatted error response
 */
function handleError(error) {
    console.error('API Error:', error);
    return {
        success: false,
        status: 500,
        error: {
            message: error.message || 'Network error',
            code: 'NETWORK_ERROR'
        }
    };
}

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * Register a new user
 * @param {string} username - Username (required)
 * @param {string} password - Password (required, min 8 characters)
 * @returns {Promise<Object>} - Response with user_id and username
 */
async function registerUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Login user
 * @param {string} username - Username (required)
 * @param {string} password - Password (required, min 8 characters)
 * @returns {Promise<Object>} - Response with user_id and username, sets JWT cookie
 */
async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Logout user
 * @returns {Promise<Object>} - Response confirming logout
 */
async function logoutUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Check if user is logged in
 * @returns {Promise<Object>} - Response with user_id and username if logged in
 */
async function isLoggedIn() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/isLoggedIn`, {
            method: 'GET',
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        return handleError(error);
    }
}

// ============================================
// GOALS ENDPOINTS
// ============================================

/**
 * Create a new goal
 * @param {string} descr - Description (required, 5-255 characters)
 * @param {string} limitDate - Limit date (required, 15-90 days in future)
 * @param {File} img - Image file (required, PNG, 100x100 pixels)
 * @returns {Promise<Object>} - Response with goal_id and img_url
 */
async function createGoal(descr, limitDate, img) {
    try {
        const formData = new FormData();
        formData.append('descr', descr);
        formData.append('limit_date', limitDate);
        formData.append('img', img);

        const response = await fetch(`${API_BASE_URL}/goals/new`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Complete a goal
 * @param {string} goalId - Goal ID (required, MongoDB ObjectId - 24 hex characters)
 * @param {File} img - Completion image file (required, PNG, 100x100 pixels)
 * @returns {Promise<Object>} - Response with goal_id
 */
async function completeGoal(goalId, img) {
    try {
        const formData = new FormData();
        formData.append('goal_id', goalId);
        formData.append('img', img);

        const response = await fetch(`${API_BASE_URL}/goals/complete`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Get all goals with pagination and filters
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number (min: 1)
 * @param {string} [options.goalStatus] - Goal status filter ("diffuming", "expired", "completed")
 * @param {number} [options.order=1] - Sort order (1 or -1)
 * @returns {Promise<Object>} - Response with goals array and nextPage
 */
async function getAllGoals(options = {}) {
    try {
        const params = new URLSearchParams();
        
        if (options.page) {
            params.append('page', options.page);
        }
        if (options.goalStatus) {
            params.append('goalStatus', options.goalStatus);
        }
        if (options.order) {
            params.append('order', options.order);
        }

        const queryString = params.toString();
        const url = `${API_BASE_URL}/goals/all${queryString ? '?' + queryString : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Get all goals for the currently logged in user (all statuses together)
 * @returns {Promise<Object>} - Response with goals array
 */
async function getMyGoals() {
    try {
        const response = await fetch(`${API_BASE_URL}/goals/myGoals`, {
            method: 'GET',
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Get original image for a goal
 * @param {string} goalId - Goal ID (required, MongoDB ObjectId - 24 hex characters)
 * @returns {Promise<Object>} - Response with img_url (signed URL, expires in 1 hour)
 */
async function getGoalOriginalImage(goalId) {
    try {
        const response = await fetch(`${API_BASE_URL}/goals/${goalId}/originalImage`, {
            method: 'GET',
            credentials: 'include'
        });
        return handleResponse(response);
    } catch (error) {
        return handleError(error);
    }
}

// ============================================
// EXPORT API SERVICES
// ============================================

const ApiService = {
    // User endpoints
    registerUser,
    loginUser,
    logoutUser,
    isLoggedIn,
    
    // Goals endpoints
    createGoal,
    completeGoal,
    getAllGoals,
    getMyGoals,
    getGoalOriginalImage
};

// For ES6 modules
// export default ApiService;

// For browser global access
window.ApiService = ApiService;
