const apiKey = "AIzaSyCBEStaduSWF8LJjTFBpm9vVbk7onxz4C4";

document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('taskFile');
    const fileList = document.querySelector('.file-list');
    const textArea = document.getElementById('completedTask');
    const submitButton = document.getElementById('submit');
    const loadingState = document.querySelector('.loading-state');
    const emptyState = document.querySelector('.empty-state');
    const successMessage = document.querySelector('.success-message');
    const errorMessage = document.querySelector('.error-message');
    const analysisDiv = document.getElementById('analysis');
    const taskSelector = document.getElementById('taskSelector');

    // File Upload Area Enhancement
    const fileUploadArea = document.querySelector('.file-upload-area');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.add('highlight');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.remove('highlight');
        });
    });

    fileUploadArea.addEventListener('drop', handleDrop);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        updateFileList();
    }

    // File Input Change Handler
    fileInput.addEventListener('change', updateFileList);

    function updateFileList() {
        fileList.innerHTML = '';
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileItem = createFileItem(file);
            fileList.appendChild(fileItem);
        }
    }

    function createFileItem(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);
        
        const removeButton = document.createElement('div');
        removeButton.className = 'remove-file';
        removeButton.innerHTML = '<i class="fas fa-times"></i>';
        removeButton.onclick = () => {
            fileInput.value = '';
            fileList.innerHTML = '';
        };
        
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeButton);
        
        return fileItem;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Load accepted tasks from localStorage
    function loadAcceptedTasks() {
        const savedTaskCategories = JSON.parse(localStorage.getItem('taskCategories') || '{}');
        taskSelector.innerHTML = '<option value="">Select the task you completed</option>';
        
        Object.entries(savedTaskCategories).forEach(([category, tasks]) => {
            const [skill, level] = category.split('_');
            
            // Create an optgroup for each category
            const group = document.createElement('optgroup');
            group.label = `${skill.charAt(0).toUpperCase() + skill.slice(1)} - ${level}`;
            
            // Add tasks to the group
            tasks.forEach((taskItem, index) => {
                const option = document.createElement('option');
                option.value = JSON.stringify({
                    task: taskItem.task,
                    skill: skill,
                    level: level,
                    index: index
                });
                option.textContent = truncateText(taskItem.task, 100); // Truncate long task descriptions
                group.appendChild(option);
            });
            
            taskSelector.appendChild(group);
        });
    }

    function truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Load tasks when page loads
    loadAcceptedTasks();

    // Update the form submit handler
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate task selection
        if (!taskSelector.value) {
            errorMessage.querySelector('span').textContent = 'Please select a task to submit results for.';
            errorMessage.style.display = 'flex';
            return;
        }

        // Reset states
        successMessage.style.display = 'none';
        errorMessage.style.display = 'none';
        emptyState.style.display = 'none';
        analysisDiv.innerHTML = '';
        
        // Show loading state
        loadingState.style.display = 'block';
        submitButton.disabled = true;
        
        try {
            let taskText = textArea.value;

            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                taskText = await readFile(file);
            }

            if (!taskText.trim()) {
                throw new Error('Please provide task details either through text or file upload.');
            }

            const selectedTask = JSON.parse(taskSelector.value);
            await analyzeTask(taskText, selectedTask);
            
            // Show success message
            successMessage.style.display = 'flex';
        } catch (error) {
            console.error('Error:', error);
            errorMessage.querySelector('span').textContent = error.message;
            errorMessage.style.display = 'flex';
            analysisDiv.innerHTML = '';
        } finally {
            loadingState.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    async function readFile(file) {
        return new Promise((resolve, reject) => {
            const fileType = file.type;

            if (fileType === "text/plain") {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(file);
            } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                const reader = new FileReader();
                reader.onload = () => {
                    const arrayBuffer = reader.result;
                    mammoth.extractRawText({ arrayBuffer })
                        .then(result => resolve(result.value))
                        .catch(reject);
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            } else if (fileType === "application/pdf") {
                const reader = new FileReader();
                reader.onload = () => {
                    const pdfjsLib = window['pdfjs-dist/build/pdf'];
                    const loadingTask = pdfjsLib.getDocument(reader.result);
                    loadingTask.promise
                        .then(pdf => {
                            let textContent = '';
                            const numPages = pdf.numPages;
                            let pagePromises = [];

                            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                                pagePromises.push(
                                    pdf.getPage(pageNum)
                                        .then(page => page.getTextContent())
                                        .then(text => {
                                            textContent += text.items.map(item => item.str).join(' ') + ' ';
                                        })
                                );
                            }

                            Promise.all(pagePromises).then(() => resolve(textContent));
                        })
                        .catch(reject);
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            } else {
                reject(new Error("Unsupported file type"));
            }
        });
    }

    async function analyzeTask(taskText, selectedTask) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

            const body = {
                contents: [{
                    parts: [{
                        text: `Please analyze the task result based on the following details:
                        Task Given: ${selectedTask.task}
                        Skill Level: ${selectedTask.level}
                        Skill Area: ${selectedTask.skill}
                        Task Result: ${taskText}

                        Please provide a detailed analysis in the following format:
                        - Relevant: [YES/NO]
                        1. Feedback: [Detailed feedback on how well the result matches the task requirements]
                        2. Score: [Score out of 100] (Please give a score based on the task and the result)
                        3. Next Task Recommendation: [Suggest a next task based on their performance](If the task score is less than 70, then suggest the user to do the task again and recommend the steps he can follow to improve)
                        4. Next Task Description: [Describe the next task in detail]
                        4. Roadmap For Improvement: [Specific areas to focus on and how to improve]
                        5. Skill Progress: [Assessment of skill development based on this submission]
                        (No special characters or asterisks and try to provide the point for the better visual appearance of the response for better user understanding.)
                        Please be specific and constructive in your feedback.`
                    }]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            const answerText = data.candidates[0]?.content?.parts[0]?.text || "No answer found.";
            
            // Format and display the analysis first
            const formattedAnswer = formatAnalysis(answerText);
            if (analysisDiv) {
                analysisDiv.innerHTML = formattedAnswer;
            }
            
            // Extract score, next task and its description from the analysis
            const scoreMatch = answerText.match(/2\.\s*Score:\s*(\d+)/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
            
            const nextTaskMatch = answerText.match(/3\.\s*Next Task Recommendation:\s*([^\n]+)/);
            const nextTask = nextTaskMatch ? nextTaskMatch[1].trim() : null;

            const taskDescriptionMatch = answerText.match(/4\.\s*Next Task Description:\s*([^]+)/);
            // const e = taskDescriptionMatch.split();
            // console.log(taskDescriptionMatch[1].trim().split('5. Roadmap For Improvement:')[0]);
            const taskDescription = taskDescriptionMatch ? taskDescriptionMatch[1].trim().split('5. Roadmap For Improvement:')[0]: null;

            // If score is above 70 and there's a next task, handle it
            if (score >= 70 && nextTask && taskDescription) {
                removeCompletedTask(selectedTask);
                addNextTaskOption(nextTask, taskDescription, selectedTask.skill, selectedTask.level);
            }

        } catch (error) {
            throw new Error("Error analyzing task: " + error.message);
        }
    }

    function removeCompletedTask(selectedTask) {
        try {
            // Get current tasks from localStorage
            const savedTaskCategories = JSON.parse(localStorage.getItem('taskCategories') || '{}');
            const categoryKey = `${selectedTask.skill}_${selectedTask.level}`;
            
            if (savedTaskCategories[categoryKey]) {
                // Remove the completed task
                savedTaskCategories[categoryKey] = savedTaskCategories[categoryKey].filter((task, index) => 
                    index !== selectedTask.index
                );

                // If category is empty, remove it
                if (savedTaskCategories[categoryKey].length === 0) {
                    delete savedTaskCategories[categoryKey];
                }

                // Save updated tasks back to localStorage
                localStorage.setItem('taskCategories', JSON.stringify(savedTaskCategories));
                
                // Refresh the task selector
                loadAcceptedTasks();

                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'task-completed-message';
                successMsg.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span>Task completed successfully! It has been removed from your task list.</span>
                `;
                analysisDiv.insertBefore(successMsg, analysisDiv.firstChild);
            }
        } catch (error) {
            console.error('Error removing completed task:', error);
        }
    }

    function addNextTaskOption(nextTask, taskDescription, skill, level) {
        // Create next task section if it doesn't exist
        const nextTaskContainer = document.createElement('div');
        nextTaskContainer.className = 'next-task-container';
        nextTaskContainer.innerHTML = `
            <div class="next-task-option">
                <div class="next-task-header">
                    <i class="fas fa-arrow-right"></i>
                    <h3>Recommended Next Task</h3>
                </div>
                <div class="next-task-content">
                    <div class="task-details">
                        <h4>Task:</h4>
                        <p id="nextTaskDescription">${nextTask}</p>
                        <h4>Description:</h4>
                        <p id="taskDetailsText">${taskDescription}</p>
                    </div>
                    <button class="accept-next-task">
                        <i class="fas fa-plus"></i>
                        Add to My Tasks
                    </button>
                </div>
            </div>
            <div class="task-added-message" style="display: none">
                <i class="fas fa-check-circle"></i>
                <span>Next task has been added to your task list!</span>
            </div>
        `;

        // Add the next task section after the analysis
        const analysisDiv = document.getElementById('analysis');
        analysisDiv.appendChild(nextTaskContainer);

        // Add event listeners
        const acceptButton = nextTaskContainer.querySelector('.accept-next-task');
        const taskAddedMessage = nextTaskContainer.querySelector('.task-added-message');

        acceptButton.addEventListener('click', () => {
            try {
                // Get current tasks from localStorage
                const savedTaskCategories = JSON.parse(localStorage.getItem('taskCategories') || '{}');
                const categoryKey = `${skill}_${level}`;
                
                // Initialize category if it doesn't exist
                if (!savedTaskCategories[categoryKey]) {
                    savedTaskCategories[categoryKey] = [];
                }
                
                // Add new task to the category with AI-provided description
                savedTaskCategories[categoryKey].push({
                    task: nextTask,
                    description: taskDescription,
                    dateAdded: new Date().toISOString()
                });
                
                // Save updated tasks back to localStorage
                localStorage.setItem('taskCategories', JSON.stringify(savedTaskCategories));
                
                // Update UI
                acceptButton.disabled = true;
                acceptButton.innerHTML = '<i class="fas fa-check"></i> Added to Tasks';
                acceptButton.classList.add('accepted');
                taskAddedMessage.style.display = 'flex';
                
                // Refresh the task selector
                loadAcceptedTasks();
                
            } catch (error) {
                console.error('Error adding next task:', error);
                alert('Failed to add task. Please try again.');
            }
        });

        // Scroll to the new section
        nextTaskContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function formatAnalysis(text) {
        // Split the text into sections
        const sections = text.split('\n').filter(line => line.trim());
        
        // Format each section with proper styling
        return sections.map(section => {
            if (section.startsWith('- Relevant:')) {
                const relevance = section.includes('YES') ? 'relevant' : 'not-relevant';
                return `<div class="relevance ${relevance}">${section}</div>`;
            }
            if (section.startsWith('1. Feedback:')) {
                return `<div class="feedback-section">${section}</div>`;
            }
            if (section.startsWith('2. Next Task:')) {
                return `<div class="next-task-section">${section}</div>`;
            }
            if (section.startsWith('3. Roadmap:')) {
                return `<div class="roadmap-section">${section}</div>`;
            }
            return `<p>${section}</p>`;
        }).join('');
    }
});
