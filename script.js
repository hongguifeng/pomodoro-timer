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
    pomodoroNoteInput.value = '';
}

function updatePomodoroList() {
    pomodoroList.innerHTML = `
        <div class="grid grid-cols-3 gap-4 font-bold mb-2">
            <div>时间</div>
            <div>关联任务</div>
            <div>番茄钟记录</div>
        </div>
    `;
    [...pomodoroHistory].reverse().forEach((record, index) => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-3 gap-4 mb-2 p-2 bg-gray-100 rounded';
        const task = tasks.find(t => t.id === record.taskId);
        row.innerHTML = `
            <div>${record.startTime} - ${record.endTime}</div>
            <div>${task ? task.name : '无任务'}</div>
            <div>${record.note || '无记录'}</div>
        `;
        pomodoroList.appendChild(row);
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
    }
}

function updateTaskList() {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'mb-4 p-4 bg-white shadow rounded';
        const relatedPomodoros = pomodoroHistory.filter(p => p.taskId === task.id);
        li.innerHTML = `
            <h3 class="text-xl font-bold">${task.name}</h3>
            <p>总计时间: ${task.totalPomodoros} 分钟</p>
            <p>相关番茄钟: ${relatedPomodoros.length} 个</p>
        `;
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

function updateWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) {
        console.error('Cannot find canvas element with id "weeklyChart"');
        return;
    }

    // Destroy existing chart if it exists
    if (window.weeklyChart instanceof Chart) {
        window.weeklyChart.destroy();
    }

    const daysOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const hoursOfDay = Array.from({length: 24}, (_, i) => i);

    // 定义一个固定的颜色数组
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
        '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
    ];

    // 为每个任务创建一个数据集
    const datasets = tasks.map((task, index) => {
        const color = colors[index % colors.length];
        return {
            label: task.name,
            data: [],
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1
        };
    });

    // 填充数据
    pomodoroHistory.forEach(pomodoro => {
        const startTime = new Date(pomodoro.startTime);
        const endTime = new Date(pomodoro.endTime);
        const dayIndex = startTime.getDay();
        const hourIndex = startTime.getHours();
        const taskIndex = tasks.findIndex(t => t.id === pomodoro.taskId);

        if (taskIndex !== -1) {
            datasets[taskIndex].data.push({
                x: dayIndex,
                y: hourIndex,
                r: 5  // 圆点大小
            });
        }
    });

    window.weeklyChart = new Chart(ctx.getContext('2d'), {
        type: 'bubble',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '每周番茄钟分布'
            },
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        min: 0,
                        max: 6,
                        stepSize: 1,
                        callback: function(value) {
                            return daysOfWeek[value];
                        }
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                        max: 23,
                        stepSize: 1,
                        callback: function(value) {
                            return value + '时';
                        }
                    }
                }]
            }
        }
    });
}

// 在初始化和每次保存番茄钟记录后调用
function updateAllCharts() {
    updateWeeklyChart();
}

// Event Listeners
startButton.addEventListener('click', startTimer);
resetButton.addEventListener('click', resetTimer);
timerDurationInput.addEventListener('change', resetTimer);
addTaskButton.addEventListener('click', addTask);
taskSelect.addEventListener("change", (e) => (currentTask = e.target.value));

document.getElementById('startSound').addEventListener('change', (e) => handleSoundUpload(e, 'start'));
document.getElementById('endSound').addEventListener('change', (e) => handleSoundUpload(e, 'end'));
document.getElementById('tickSound').addEventListener('change', (e) => handleSoundUpload(e, 'tick'));


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
    updateAllCharts();

    // Load saved sounds
    ['start', 'end', 'tick'].forEach(soundType => {
        const savedSound = localStorage.getItem(`${soundType}Sound`);
        if (savedSound) {
            sounds[soundType] = new Audio(savedSound);
        }
    });
}

init();