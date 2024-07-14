let timer;
let timeLeft = 1500; // 默认25分钟
let isRunning = false;
let pomodoroHistory = JSON.parse(localStorage.getItem('pomodoroHistory')) || [];
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentTask = null;
let sounds = {
    start: null,
    end: null,
    tick: null
};

const timerDisplay = document.getElementById('timer');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');
const timerDurationInput = document.getElementById('timerDuration');
const pomodoroNoteInput = document.getElementById('pomodoroNote');
const pomodoroList = document.getElementById('pomodoroList');
const taskSelect = document.getElementById('taskSelect');
const newTaskInput = document.getElementById('newTask');
const addTaskButton = document.getElementById('addTask');
const taskList = document.getElementById('taskList');

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (!isRunning) {
        isRunning = true;
        if (sounds.start) sounds.start.play();
        timer = setInterval(() => {
            timeLeft--;
            updateDisplay();
            if (sounds.tick) sounds.tick.play();
            if (timeLeft === 0) {
                clearInterval(timer);
                isRunning = false;
                if (sounds.end) sounds.end.play();
                savePomodoroRecord();
                resetTimer(); // 自动重置计时器
                alert('时间到!');
            }
        }, 1000);
        if (startButton) startButton.textContent = '暂停';
    } else {
        pauseTimer();
    }
}

function pauseTimer() {
    clearInterval(timer);
    isRunning = false;
    if (sounds.tick) sounds.tick.pause();
    if (startButton) startButton.textContent = '继续';
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    timeLeft = timerDurationInput.value * 60;
    updateDisplay();
    if (sounds.tick) sounds.tick.pause();
    if (startButton) startButton.textContent = '开始';
    localStorage.setItem('timerDuration', timerDurationInput.value);
}

function savePomodoroRecord() {
    const endTime = new Date();
    const startTime = new Date(endTime - timerDurationInput.value * 60 * 1000);
    const note = pomodoroNoteInput.value;
    
    const pomodoroRecord = {
        startTime: startTime.toLocaleString(),
        endTime: endTime.toLocaleString(),
        duration: timerDurationInput.value,
        note: note,
        taskId: currentTask
    };
    
    pomodoroHistory.push(pomodoroRecord);
    localStorage.setItem('pomodoroHistory', JSON.stringify(pomodoroHistory));

    // 更新任务的总时间
    if (currentTask) {
        const taskIndex = tasks.findIndex(t => t.id === currentTask);
        if (taskIndex !== -1) {
            tasks[taskIndex].totalPomodoros = (tasks[taskIndex].totalPomodoros || 0) + parseInt(timerDurationInput.value);
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }
    }

    updatePomodoroList();
    updateTaskList();
    updateChart();
    pomodoroNoteInput.value = '';
}

function updatePomodoroList() {
    pomodoroList.innerHTML = '';
    pomodoroHistory.forEach((record, index) => {
        const li = document.createElement('li');
        const task = tasks.find(t => t.id === record.taskId);
        li.textContent = `#${index + 1}: ${record.startTime} - ${record.endTime} (${record.duration}分钟) ${task ? task.name : ''} ${record.note ? '- ' + record.note : ''}`;
        pomodoroList.appendChild(li);
    });
}

function addTask() {
    const taskName = newTaskInput.value.trim();
    if (taskName) {
        const task = {
            id: Date.now().toString(),
            name: taskName,
            totalPomodoros: 0
        };
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        newTaskInput.value = '';
        updateTaskList();
        updateTaskSelect();
        updateChart();
    }
}

function updateTaskList() {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = `${task.name} - 总计 ${task.totalPomodoros} 分钟`;
        taskList.appendChild(li);
    });
}

function updateTaskSelect() {
    taskSelect.innerHTML = '<option value="">选择任务</option>';
    tasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.name;
        taskSelect.appendChild(option);
    });
}

function handleSoundUpload(event, soundType) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            sounds[soundType] = new Audio(e.target.result);
            localStorage.setItem(`${soundType}Sound`, e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function updateChart() {
    const ctx = document.getElementById('taskChart');
    if (!ctx) {
        console.error('Cannot find canvas element with id "taskChart"');
        return;
    }

    // Destroy existing chart if it exists
    if (window.taskChart instanceof Chart) {
        window.taskChart.destroy();
    }
    
    // 计算每个任务的总时间
    const taskTimes = tasks.map(task => ({
        name: task.name,
        time: task.totalPomodoros
    }));

    // 按时间降序排序
    taskTimes.sort((a, b) => b.time - a.time);

    // 取前5个任务，其他的归为"其他"
    let chartData = taskTimes.slice(0, 5);
    if (taskTimes.length > 5) {
        const otherTime = taskTimes.slice(5).reduce((sum, task) => sum + task.time, 0);
        chartData.push({ name: '其他', time: otherTime });
    }

    window.taskChart = new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: chartData.map(task => task.name),
            datasets: [{
                data: chartData.map(task => task.time),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '任务时间分布'
            }
        }
    });
}

// Event Listeners
startButton.addEventListener('click', startTimer);
resetButton.addEventListener('click', resetTimer);
timerDurationInput.addEventListener('change', resetTimer);
addTaskButton.addEventListener('click', addTask);
taskSelect.addEventListener('change', (e) => currentTask = e.target.value);

document.getElementById('startSound').addEventListener('change', (e) => handleSoundUpload(e, 'start'));
document.getElementById('endSound').addEventListener('change', (e) => handleSoundUpload(e, 'end'));
document.getElementById('tickSound').addEventListener('change', (e) => handleSoundUpload(e, 'tick'));

// Initialization
function init() {
    const savedDuration = localStorage.getItem('timerDuration');
    if (savedDuration) {
        timerDurationInput.value = savedDuration;
        timeLeft = savedDuration * 60;
    }
    updateDisplay();
    updatePomodoroList();
    updateTaskList();
    updateTaskSelect();
    updateChart();

    // Load saved sounds
    ['start', 'end', 'tick'].forEach(soundType => {
        const savedSound = localStorage.getItem(`${soundType}Sound`);
        if (savedSound) {
            sounds[soundType] = new Audio(savedSound);
        }
    });
}

init();