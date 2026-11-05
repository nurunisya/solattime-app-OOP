const addBtn = document.getElementById('addBtn');
const cancelBtn = document.getElementById('cancelBtn');
const reminderList = document.getElementById('reminderList');
const backBtn = document.getElementById('backBtn');
const formTitle = document.getElementById('formTitle');
const activityType = document.getElementById('activityType');
const customActivity = document.getElementById('customActivity');
const activityTime = document.getElementById('activityTime');
const progressText = document.getElementById('progressText');
const feedback = document.getElementById('feedback');

const PRESETS = ['Solat Sunat Dhuha', 'Baca Al-Quran', 'Zikir Pagi', 'Zikir Petang', 'Baca Yasin', 'Solat Sunat Tahajjud', 'Bersedekah'];

let reminders = [];
try { reminders = JSON.parse(localStorage.getItem('solatReminders')) || []; } 
catch (e) { reminders = []; }
let editIndex = -1;

const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const save = () => localStorage.setItem('solatReminders', JSON.stringify(reminders));

// display error or successful
let feedbackTimer;
function showFeedback(message, type = 'ok') {
    feedback.innerHTML = icon(type === 'ok' ? 'check-circle' : 'alert-circle', 18) + ' ' + escapeHTML(message);
    feedback.className = 'feedback ' + type;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => feedback.classList.add('hidden'), 3500);
}

function toggleCustomInput(show) {
    customActivity.classList.toggle('hidden', !show);
    if (!show) customActivity.value = '';
}

activityType.addEventListener('change', () => {
    const isCustom = activityType.value === 'Lain-lain';
    toggleCustomInput(isCustom);
    if (isCustom) customActivity.focus();
});

function resetForm() {
    editIndex = -1;
    activityType.value = '';
    toggleCustomInput(false);
    activityTime.value = 'Before';
    addBtn.innerHTML = icon('plus') + ' Tambah ke Senarai';
    formTitle.textContent = 'Tambah Aktiviti Baru';
    cancelBtn.classList.add('hidden');
}

function displayReminders() {
    reminderList.innerHTML = '';

    const doneCount = reminders.filter(r => r.done).length;
    progressText.textContent = reminders.length ? `${doneCount} daripada ${reminders.length} selesai` : '';

    if (reminders.length === 0) {
        reminderList.innerHTML = '<li class="empty-state">Belum ada ibadah dalam senarai. Pilih satu di atas dan tekan <strong>Tambah ke Senarai</strong>.</li>';
        return;
    }

    reminders.forEach((reminder, index) => {
        const isDone = !!reminder.done;
        const li = document.createElement('li');
        li.className = 'todo' + (isDone ? ' is-done' : '');

        li.innerHTML = `
            <div class="todo-info">
                <strong class="todo-name">${escapeHTML(reminder.name)}</strong>
                <span class="todo-meta">${icon('clock', 14)} ${reminder.time === 'Before' ? 'Sebelum Solat' : 'Selepas Solat'}</span>
            </div>
            <div class="todo-actions">
                <button class="btn-chip btn-done" data-action="toggle" data-index="${index}" aria-pressed="${isDone}">
                    ${isDone ? icon('check', 16) + ' Selesai' : 'Tandakan selesai'}
                </button>
                <button class="btn-chip btn-edit" data-action="edit" data-index="${index}" aria-label="Edit" title="Edit">${icon('pencil', 16)}</button>
                <button class="btn-chip btn-delete" data-action="delete" data-index="${index}" aria-label="Padam" title="Padam">${icon('trash', 16)}</button>
            </div>
        `;
        reminderList.appendChild(li);
    });
}

// CREATE / UPDATE
function submitForm() {
    let name = activityType.value;
    if (name === 'Lain-lain') name = customActivity.value.trim();
    const time = activityTime.value;

    if (!name) {
        showFeedback('Sila pilih atau taip nama ibadah.', 'error');
        return;
    }
    if (name.length < 3) {
        showFeedback('Nama ibadah terlalu pendek (minimum 3 huruf).', 'error');
        return;
    }
    const isDuplicate = reminders.some((r, i) =>
        i !== editIndex && r.name.toLowerCase() === name.toLowerCase() && r.time === time);
    if (isDuplicate) {
        showFeedback('Ibadah yang sama sudah ada dalam senarai.', 'error');
        return;
    }

    if (editIndex === -1) {
        reminders.push({ name, time, done: false });// CREATE
        showFeedback('Ibadah berjaya ditambah.');
    } else {
        reminders[editIndex].name = name;// UPDATE
        reminders[editIndex].time = time;
        showFeedback('Ibadah berjaya dikemas kini.');
    }

    save();
    resetForm();
    displayReminders();
}

addBtn.addEventListener('click', submitForm);
customActivity.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitForm(); });
cancelBtn.addEventListener('click', resetForm);

// button for every card (toggle / edit / delete)
reminderList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const index = Number(btn.dataset.index);

    if (btn.dataset.action === 'toggle') {
        reminders[index].done = !reminders[index].done;
        save();
        displayReminders();
        showFeedback(reminders[index].done ? 'Ditandakan selesai.' : 'Tanda selesai dibatalkan.');
    } else if (btn.dataset.action === 'delete') {
        if (confirm('Adakah anda pasti mahu memadam aktiviti ini?')) {
            reminders.splice(index, 1);
            if (editIndex === index) resetForm();
            else if (editIndex > index) editIndex--;
            save();
            displayReminders();
            showFeedback('Ibadah telah dipadam.');
        }
    } else if (btn.dataset.action === 'edit') {
        const reminder = reminders[index];
        if (PRESETS.includes(reminder.name)) {
            activityType.value = reminder.name;
            toggleCustomInput(false);
        } else {
            activityType.value = 'Lain-lain';
            toggleCustomInput(true);
            customActivity.value = reminder.name;
        }
        activityTime.value = reminder.time;

        editIndex = index;
        addBtn.innerHTML = icon('save') + ' Simpan Perubahan';
        formTitle.textContent = 'Edit Aktiviti';
        cancelBtn.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

backBtn.addEventListener('click', () => window.close());

displayReminders();