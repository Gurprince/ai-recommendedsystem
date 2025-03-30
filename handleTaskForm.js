const apiKey = "AIzaSyCBEStaduSWF8LJjTFBpm9vVbk7onxz4C4";

async function aiTask(skillInput, timeInput, difficultyLevel, forceNew = false) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        
        // Add randomization parameter to force new content
        const promptSuffix = forceNew ? ` (Random seed: ${Date.now()})` : '';
        
        const body = {
            contents: [
                {
                    parts: [
                        {
                            text: `Please recommend a task based on the following details:
                                - Skill: ${skillInput}
                                - Time Available: ${timeInput}
                                - Task Difficulty Level: ${difficultyLevel}
                                Please provide the task in the following format:
                                1. Task Name
                                2. Task Description with actionable steps
                                3. Optional tips and resources for completing the task${promptSuffix} 
                                (No special characters or asterisks and try to provide the point for the better visual appearance of the response for better user understanding.)`
                        }
                    ]
                }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            // Add cache-busting parameter
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const answerText = data.candidates[0]?.content?.parts[0]?.text || "No answer found.";
        localStorage.setItem("task", answerText);
        const taskElement = document.getElementById("taskForYou");
        taskElement.innerText = answerText;
        
        document.querySelector('.task-actions').style.display = 'flex';
        return answerText;
    } catch (error) {
        document.getElementById("taskForYou").innerText = "An error occurred. Please try again.";
        console.error("Error fetching AI task:", error);
        return null;
    }
}

document.getElementById("form").addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById("taskForYou").innerText = "";
    document.querySelector('.task-actions').style.display = 'none'; // Hide actions while loading
    const submitButton = document.getElementById("submit");
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    const skillInput = document.getElementById("skill").value.toLowerCase();
    localStorage.setItem("skill", skillInput);
    const timeInput = document.getElementById("time").value;
    if (isNaN(timeInput) || Number(timeInput) <= 0) {
        alert("Please enter a valid number for time.");
        return;
    }
    const level = document.getElementById("level").value;
    document.getElementById("loading").style.display = "block";
    aiTask(skillInput, timeInput, level).then((response) => {
        document.getElementById("loading").style.display = "none";
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
    });
});

// Add event listeners for task actions
document.addEventListener('DOMContentLoaded', () => {
    const acceptTask = document.getElementById('acceptTask');
    const newTask = document.getElementById('newTask');
    
    acceptTask.addEventListener('click', () => {
        const currentTask = document.getElementById("taskForYou").innerText;
        const skill = document.getElementById("skill").value;
        const level = document.getElementById("level").value;
        
        // Get all saved tasks categories
        const savedTaskCategories = JSON.parse(localStorage.getItem('taskCategories') || '{}');
        
        // Create category key
        const categoryKey = `${skill}_${level}`;
        
        // Initialize category if it doesn't exist
        if (!savedTaskCategories[categoryKey]) {
            savedTaskCategories[categoryKey] = [];
        }
        
        // Add new task to the category
        savedTaskCategories[categoryKey].push({
            task: currentTask,
            date: new Date().toISOString(),
            skill: skill,
            level: level
        });
        
        // Save updated categories
        localStorage.setItem('taskCategories', JSON.stringify(savedTaskCategories));
        
        document.getElementById("taskForYou").innerText = "Great! You've accepted this task. Good luck!";
        document.querySelector('.task-actions').style.display = 'none';
    });
    
    newTask.addEventListener('click', () => {
        const skillInput = document.getElementById("skill").value.toLowerCase();
        const timeInput = document.getElementById("time").value;
        const level = document.getElementById("level").value;
        
        document.getElementById("loading").style.display = "block";
        document.getElementById("taskForYou").innerText = "";
        document.querySelector('.task-actions').style.display = 'none';
        
        // Pass true to force a new task
        aiTask(skillInput, timeInput, level, true).then(() => {
            document.getElementById("loading").style.display = "none";
        });
    });

    // Modal elements
    const modal = document.getElementById('tasksModal');
    const viewTasksBtn = document.getElementById('viewAcceptedTasks');
    const closeBtn = document.querySelector('.close');
    const acceptedTasksList = document.getElementById('acceptedTasksList');

    // View accepted tasks button click
    viewTasksBtn.addEventListener('click', () => {
        displayAcceptedTasks();
        modal.style.display = 'block';
    });

    // Close modal when clicking (X)
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Function to display accepted tasks
    function displayAcceptedTasks() {
        const savedTaskCategories = JSON.parse(localStorage.getItem('taskCategories') || '{}');
        const acceptedTasksList = document.getElementById('acceptedTasksList');
        
        if (Object.keys(savedTaskCategories).length === 0) {
            acceptedTasksList.innerHTML = `
                <div class="no-tasks">
                    <i class="fas fa-inbox"></i>
                    <p>You haven't accepted any tasks yet.</p>
                </div>
            `;
            return;
        }

        let allCategoriesHtml = '';

        // Sort categories by most recent task
        const sortedCategories = Object.entries(savedTaskCategories)
            .sort(([, tasksA], [, tasksB]) => {
                const latestA = Math.max(...tasksA.map(t => new Date(t.date)));
                const latestB = Math.max(...tasksB.map(t => new Date(t.date)));
                return latestB - latestA;
            });

        for (const [categoryKey, tasks] of sortedCategories) {
            const [skill, level] = categoryKey.split('_');
            
            // Sort tasks within category by date (newest first)
            const sortedTasks = [...tasks].sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            );

            const categoryHtml = `
                <div class="category-section">
                    <div class="category-header">
                        <h3>
                            <i class="fas fa-folder"></i>
                            ${skill.charAt(0).toUpperCase() + skill.slice(1)} - 
                            ${level.charAt(0).toUpperCase() + level.slice(1)}
                            <span class="task-count">(${tasks.length} tasks)</span>
                        </h3>
                    </div>
                    <div class="category-tasks">
                        ${sortedTasks.map(taskItem => {
                            const date = new Date(taskItem.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            
                            return `
                                <div class="task-item">
                                    <div class="task-date">
                                        <i class="far fa-calendar"></i> ${date}
                                    </div>
                                    <div class="task-text">
                                        ${taskItem.task}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
            
            allCategoriesHtml += categoryHtml;
        }

        acceptedTasksList.innerHTML = allCategoriesHtml;
    }
});

