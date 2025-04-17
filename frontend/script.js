let nextTaskId = 0;
let editTaskId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    document.querySelectorAll('input[name="filter"]').forEach(input => {
        input.addEventListener('change', applyFilters);
    });
    applyFilters();
});

window.onload = async function() {
    await checkIncompleteTasks();
    setInterval(async () => {
        const response = await fetch('/subscribers-count');
        const result = await response.json();
        console.log(result.count);
        if (result.count > 0){
            await checkIncompleteTasks();
        }
    }, 10000); // 10 секунд = 10000 мс
  };


//добавление задачи
document.getElementById("addTask").addEventListener('submit', event => {
    event.preventDefault();
    const task = document.getElementById('task').value;
    const taskDesc = document.getElementById('taskDesc').value;
    const shortDesc = taskDesc.length > 80 ? `${taskDesc.substring(0, 80)}...` : taskDesc;
    const taskId = ++nextTaskId;

    if (editTaskId) {
        updateTask(editTaskId, task, taskDesc);
        editTaskId = null;
    } else {
        const taskObj = {
            taskId,
            task,
            taskDesc,
            shortDesc,
            isCompleted: false
        };
        addToStorage(taskObj);
        showTask(taskObj);
        fetch('/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Новая задача', body: 'Вы добавили новую задачу!' })
        }).then(response => {
            if (!response.ok) console.error('Ошибка отправки уведомления');
        });
    }

    document.getElementById('task').value = '';
    document.getElementById('taskDesc').value = '';
});

document.getElementById('subscribeButton').addEventListener('click', async () => {
    await handleSubscriptionChange(document.getElementById('subscribeButton'));
  });

//отображение задачи
function showTask(task){
    const tasksDiv = document.getElementById('tasks');
    const newTask = document.createElement('div');
    newTask.classList.add('taskCard');
    newTask.dataset.taskId = task.taskId;
    newTask.innerHTML = `
        <input type="checkbox" class="checkbox" ${task.isCompleted ? 'checked' : ''}/>
        <div class='content'>
            <h2>${task.task}</h2>
            <p class="short">${task.shortDesc}</p>
            <p class="full">${task.taskDesc}</p>
        </div>
        <div class=buttons>
            <button class="editTask">Редактировать</button>
            <button class="deleteTask">Удалить</button>
        </div>
    `;
    tasksDiv.appendChild(newTask);

    newTask.addEventListener('click', () => {
        newTask.classList.toggle('active');
    });

    const checkbox=newTask.querySelector('.checkbox');
    checkbox.addEventListener('change', function(e) {
        const taskId = parseInt(this.parentNode.dataset.taskId);
        toggleTaskCompletion(taskId, e.target.checked);
    });

}
//кнопки на карточке
document.getElementById('tasks').addEventListener('click', function(event) {
    if (event.target && event.target.matches('.deleteTask')){
        let taskCard = event.target.closest('.taskCard');
        let taskId = taskCard.dataset.taskId;
        removeFromStorage(taskId);
        taskCard.remove();
    }
    if (event.target && event.target.matches('.editTask')){
        let taskCard = event.target.closest('.taskCard');
        let taskId = taskCard.dataset.taskId;
        let task = taskCard.querySelector('h2').textContent;
        let taskDesc = taskCard.querySelector('.full').textContent;

        document.getElementById('task').value = task;
        document.getElementById('taskDesc').value = taskDesc;

        editTaskId = taskId;
    }

});
//изменение галочки
function toggleTaskCompletion(id, status){
    let tasks = getFromStorage();
    let index = tasks.findIndex(task => task.taskId == id);
    if (index >= 0){
        tasks[index].isCompleted = status;
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    applyFilters();
}
//применить фильтры
function applyFilters(){
    const filter = document.querySelector('input[name="filter"]:checked').value;
    const tasks = getFromStorage();
    const taskCards = document.querySelectorAll('.taskCard');

    taskCards.forEach((card) => {
        const taskId = parseInt(card.dataset.taskId);
        const taskInfo = tasks.find(t => t.taskId === taskId);
        

        switch(filter){
            case 'all':
                card.style.display = 'grid';
                break;
            case 'active':
                if (!taskInfo.isCompleted){
                    card.style.display = 'grid';
                } else{
                    card.style.display = 'none';
                }
                break;
            case 'completed':
                if (taskInfo.isCompleted){
                    card.style.display = 'grid';
                } else{
                    card.style.display = 'none';
                }
                break;
        }
    });
}
//редактирование
function updateTask(id, name, text){
    let tasks = getFromStorage();
    let index = tasks.findIndex(task => task.taskId == id);
    if (index >= 0){
        tasks[index].task = name;
        tasks[index].taskDesc = text;
        tasks[index].shortDesc = text.length > 80 ? `${text.substring(0, 80)}...` : text;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        const tasksDiv = document.getElementById('tasks');
        tasksDiv.innerHTML = '';
        loadTasks();
    }

}

//получить всё из локал сторадж
function getFromStorage() {
    let tasks = localStorage.getItem('tasks');
    try {
        return tasks ? JSON.parse(tasks) : [];
    } catch (error) {
        console.error("Error parsing tasks from localStorage:", error);
        return [];
    }
}
//добавить в локал сторадж
function addToStorage(taskObj){
    let tasks = getFromStorage()
    tasks.push(taskObj);
    localStorage.setItem('tasks', JSON.stringify(tasks));
}
//загрузка из локал сторадж
function loadTasks(){
    const tasks = getFromStorage();
    tasks.forEach(showTask);
}
//удаление из локал сторадж
function removeFromStorage(taskId)
{
    let tasks = getFromStorage()
    tasks = tasks.filter(task => task.taskId != taskId);
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

//проверить наличие незавершенных дел
function checkIncompleteTasks() {
    const tasks = getFromStorage();
    const incompleteTasks = tasks.filter(task => !task.isCompleted);
  
    if (incompleteTasks.length > 0) {
        fetch('/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Остались незавршенные задачи', 
                body: `Всего незавершенных задач: ${incompleteTasks.length}` })
        }).then(response => {
            if (!response.ok) console.error('Ошибка отправки уведомления');
        });
    }
  }
