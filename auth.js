// Form validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
}

function validateUsername(username) {
    // At least 3 characters, alphanumeric and underscore only
    const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
    return usernameRegex.test(username);
}

// Add this helper function for button loading state
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.originalText = button.innerHTML;
        button.innerHTML = `
            <div class="button-loader">
                <div class="spinner"></div>
            </div>
        `;
    } else {
        button.disabled = false;
        button.innerHTML = button.originalText;
    }
}

// Handle Signup Form
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitButton = this.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Reset error states
        clearErrors();
        
        // Validate inputs
        let isValid = true;
        
        if (!validateUsername(username)) {
            showError('username', 'Username must be at least 3 characters and contain only letters, numbers, and underscores');
            isValid = false;
        }
        
        if (!validateEmail(email)) {
            showError('email', 'Please enter a valid email address');
            isValid = false;
        }
        
        if (!validatePassword(password)) {
            showError('password', 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number');
            isValid = false;
        }
        
        if (password !== confirmPassword) {
            showError('confirm-password', 'Passwords do not match');
            isValid = false;
        }
        
        if (isValid) {
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Store user data
                localStorage.setItem('user', JSON.stringify({ username, email }));
                setButtonLoading(submitButton, true);
        
                // Redirect to landing page after a short delay
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            } catch (error) {
                showError('general', 'An error occurred. Please try again.');
                setButtonLoading(submitButton, false);
            }
        } else {
            setButtonLoading(submitButton, false);
        }
    });
}

// Handle Login Form
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitButton = this.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Reset error states
        clearErrors();
        
        // Validate inputs
        let isValid = true;
        
        if (!validateEmail(email)) {
            showError('email', 'Please enter a valid email address');
            isValid = false;
        }
        
        if (password.trim() === '') {
            showError('password', 'Password is required');
            isValid = false;
        }
        
        if (isValid) {
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));                
                // Redirect to landing page after a short delay
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            } catch (error) {
                showError('general', 'An error occurred. Please try again.');
                setButtonLoading(submitButton, false);
            }
        } else {
            setButtonLoading(submitButton, false);
        }
    });
}

// Helper functions for showing errors and success messages
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    field.classList.add('error');
    field.parentNode.appendChild(errorDiv);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.querySelector('form').appendChild(successDiv);
}

function clearErrors() {
    // Remove all error messages
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.success-message').forEach(success => success.remove());
    document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
}
