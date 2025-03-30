const apiKey = "AIzaSyCBEStaduSWF8LJjTFBpm9vVbk7onxz4C4"; 

async function aiTask(skillInput , timeInput, difficultyLevel){
    try{
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
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
                                3. Optional tips and resources for completing the task (No special characters or asterisks and try to provide the point for the better visual appearance of the respone that would be better for the user to understand.)`
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
        body: JSON.stringify(body)
    });
     
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    const answerText = data.candidates[0]?.content?.parts[0]?.text || "No answer found.";
    const taskElement = document.getElementById("taskForYou");  
    taskElement.innerText = answerText;
    }
    catch(error){
        document.getElementById("taskForYou").innerText = "An error occurred. Please try again.";
        console.error("Error fetching AI task:", error);
    }
}

document.getElementById("form").addEventListener('submit', (e) => {
    e.preventDefault();

    const submitButton = document.getElementById("submit");
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    const skillInput = document.getElementById("skill").value.toLowerCase();  
    const timeInput = document.getElementById("time").value;
    if (isNaN(timeInput) || Number(timeInput) <= 0) {
        alert("Please enter a valid number for time.");
        return;
    }
    const level = document.getElementById("level").value;
    document.getElementById("loading").style.display = "block";
    aiTask(skillInput, timeInput, level).then(() => {
        document.getElementById("loading").style.display = "none";
    });
});



document.getElementById("uploadForm").addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Form submitted");
    const taskContent = document.getElementById("completedTask").value;
    const fileInput = document.getElementById("taskFile");
    let taskText = taskContent;

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        taskText = await readFile(file);  // Updated to handle different file types
    }
    const taskGiven = document.getElementById("taskForYou").innerText;
    console.log(taskGiven);
    analyzeTask(taskText,taskGiven);
});

function readFile(file) {
    return new Promise((resolve, reject) => {
        const fileType = file.type;

        if (fileType === "text/plain") {
            // Handle text files
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            // Handle .docx files using the `mammoth.js` library
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
            // Handle PDF files using pdf.js
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

async function analyzeTask(taskText,taskGiven) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
        const body = {
            contents: [
                {
                    parts: [
                        {
                            text: `Please analyze the task and the result of the task and provide me the feedback.
                            The task is:${taskGiven}
                            The task result is: ${taskText}
                            Check if the result is relevant to the given task or not and if there is not task and the task result is given then say that there is no task given but if the task is given then
                            Please provide me the output in the following format:
                            -Relevant: [YES/NO]
                            1. Feedback: [Feedback of the task]
                            2. Next Task Recommendation: [Next Task to do]
                            3. Roadmap For Improvement: [the path to follow for the improvement] 
                            (No special characters or asterisks and try to provide the point for the better visual appearance of the respone that would be better for the user to understand.)`
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
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const answerText = data.candidates[0]?.content?.parts[0]?.text || "No answer found.";
        
        const formattedText = answerText
            .replace(/1\. Relevant:/, "<strong>Relevant:</strong><br>")
            .replace(/2\. Feedback:/, "<strong>Feedback:</strong><br>")
            .replace(/3\. Next Task Recommendation:/, "<br><br><strong>Next Task Recommendation:</strong><br>")
            .replace(/4\. Roadmap For Improvement:/, "<br><br><strong>Roadmap For Improvement:</strong><br>")
            .replace(/(\d\.\s)/g, '<br><strong>$1</strong>') 
            .replace(/\* /g, '<br>&nbsp;&nbsp;- '); 

        const taskElement = document.getElementById("analysis");  
        taskElement.innerHTML = formattedText;
    } catch (error) {
        document.getElementById("analysis").innerText = "An error occurred. Please try again.";
        console.error("Error fetching AI task:", error);
    }
}
