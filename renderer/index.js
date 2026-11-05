const { ipcRenderer } = require('electron');

const searchBtn = document.getElementById('searchBtn');
const zoneSelect = document.getElementById('zoneSelect');
const resultDiv = document.getElementById('result');
const reminderBtn = document.getElementById('reminderBtn');

let countdownInterval;

// For Save last Zone (to Local Storage)
const lastZone = localStorage.getItem('lastSelectedZone');
if (lastZone) zoneSelect.value = lastZone;

// Icon Code
const svg = (inner) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const RAYS = '<line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/>';
const FULL_SUN = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

const ICONS = {
    Imsak: svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
    Subuh: svg(`<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/>${RAYS}<polyline points="8 6 12 2 16 6"/>`),
    Syuruk: svg(`<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="11"/>${RAYS}`),
    Zohor: svg(FULL_SUN),
    Asar: svg('<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>'),
    Maghrib: svg(`<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/>${RAYS}<polyline points="16 5 12 9 8 5"/>`),
    Isyak: svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')
};

// Time format
function formatTimeDisplay(date) {
    return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

// Change timestamp to Date
function parseTime(timestamp, offsetDays = 0) {
    const date = new Date(timestamp * 1000);
    if (offsetDays > 0) date.setDate(date.getDate() + offsetDays);
    return date;
}

// Suggestive (IF ELSE) 
function getSuggestion(totalMins) {
    if (totalMins <= 15) {
        return { level: 'urgent', tag: 'Masa Suntuk', icon: 'alert-triangle', title: 'Bersiap Segera!',
             text: 'Tinggalkan urusan duniawi seketika. Sila bersiap untuk solat.' };
    } else if (totalMins <= 45) {
        return { level: 'free', tag: 'Masa Lapang', icon: 'book-open', title: 'Masa Untuk Ibadah', 
             text: 'Elok untuk ambil wuduk, baca Al-Quran, atau berzikir.' };
    } else {
        return { level: 'plenty', tag: 'Banyak Masa', icon: 'briefcase', title: 'Fokus Urusan Duniawi',
             text: 'Anda ada banyak masa. Selesaikan kerja/urusan anda.' };
    }
}

// Search Process 
searchBtn.addEventListener('click', async () => {
    const zone = zoneSelect.value;
    if (!zone) {
        alert('Sila pilih zon terlebih dahulu.');
        return;
    }

    localStorage.setItem('lastSelectedZone', zone);
    searchBtn.disabled = true;
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `<p class="loading-msg">${icon('loader', 18, 'spin')} Mendapatkan data...</p>`;

    try {
        // Call API Waktu Solat (JAKIM)
        const response = await fetch(`https://api.waktusolat.app/v2/solat/${zone}`);
        const data = await response.json();

        if (data.message) throw new Error(data.message);

        const todayDate = new Date().getDate();
        const todayPrayer = data.prayers.find(p => p.day === todayDate);
        if (!todayPrayer) throw new Error('Data untuk hari ini tidak dijumpai.');

        // LIst waktu solat
        const prayerListToday = [
            { key: 'Imsak', name: 'Imsak', time: parseTime(todayPrayer.imsak) },
            { key: 'Subuh', name: 'Subuh', time: parseTime(todayPrayer.fajr) },
            { key: 'Syuruk', name: 'Syuruk', time: parseTime(todayPrayer.syuruk) },
            { key: 'Zohor', name: 'Zohor', time: parseTime(todayPrayer.dhuhr) },
            { key: 'Asar', name: 'Asar', time: parseTime(todayPrayer.asr) },
            { key: 'Maghrib', name: 'Maghrib', time: parseTime(todayPrayer.maghrib) },
            { key: 'Isyak', name: 'Isyak', time: parseTime(todayPrayer.isha) }
        ];

        const zoneName = zoneSelect.options[zoneSelect.selectedIndex].text;
        const dateToday = new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });

        // Built Grid
        const gridHTML = prayerListToday.map(p => `
            <div class="prayer-item item-${p.key.toLowerCase()}" data-prayer="${p.key}">
                <div class="prayer-icon">${ICONS[p.key]}</div>
                <span class="prayer-name">${p.name}</span>
                <span class="prayer-time">${formatTimeDisplay(p.time)}</span>
            </div>`).join('');

        // For HTML Display
        resultDiv.innerHTML = `
            <div class="result-header">
                <h2>${dateToday}</h2>
                <div class="date-text">Waktu Solat Hari Ini</div>
                <div class="location-text">${icon('map-pin', 16)} ${zoneName}</div>
            </div>

            <div class="prayer-grid">${gridHTML}</div>

            <div class="countdown-box">
                <div class="countdown-info">
                    <div class="next-label">Waktu Seterusnya</div>
                    <div class="next-name" id="nextPrayerName">--</div>
                    <div class="next-time" id="nextPrayerTimeText"></div>
                </div>
                <div class="countdown-timer">
                    <div class="time-box"><span id="cdHour">00</span><small>Jam</small></div>
                    <div class="time-box"><span id="cdMin">00</span><small>Minit</small></div>
                    <div class="time-box seconds"><span id="cdSec">00</span><small>Saat</small></div>
                </div>
            </div>

            <div class="insight-stack">
                <div id="suggestionBox"></div>
                <div class="insight-row">
                    <div id="smartActionBox" class="insight-card"></div>
                    <div id="infoBox" class="insight-card"></div>
                </div>
            </div>
        `;

        clearInterval(countdownInterval);

        // Countdown and Calculation
        function updateCountdown() {
            const now = new Date();
            let nextPrayer = null;
            let diffMs = Infinity;

            prayerListToday.forEach(prayer => {
                const diff = prayer.time - now;
                if (diff > 0 && diff < diffMs) {
                    diffMs = diff;
                    nextPrayer = prayer;
                }
            });

            if (!nextPrayer) {
                const fajrTomorrow = parseTime(todayPrayer.fajr, 1);
                diffMs = fajrTomorrow - now;
                nextPrayer = { key: 'Subuh', name: 'Subuh (Esok)', time: fajrTomorrow };
            }

            const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
            const hours = Math.floor(totalSecs / 3600);
            const mins = Math.floor((totalSecs % 3600) / 60);
            const secs = totalSecs % 60;
            const totalMins = Math.floor(totalSecs / 60);

            document.getElementById('nextPrayerName').textContent = nextPrayer.name;
            document.getElementById('nextPrayerTimeText').textContent = 'Pukul ' + formatTimeDisplay(nextPrayer.time);
            document.getElementById('cdHour').textContent = String(hours).padStart(2, '0');
            document.getElementById('cdMin').textContent = String(mins).padStart(2, '0');
            document.getElementById('cdSec').textContent = String(secs).padStart(2, '0');

            document.querySelectorAll('.prayer-item').forEach(el => {
                el.classList.toggle('is-next', el.dataset.prayer === nextPrayer.key);
            });

            // Suggestion
            const suggestion = getSuggestion(totalMins);
            document.getElementById('suggestionBox').innerHTML = `
                <div class="suggestion ${suggestion.level}">
                    <span class="tag">${suggestion.tag}</span>
                    <strong>${icon(suggestion.icon, 17)} ${suggestion.title}</strong>
                    <p>${suggestion.text}</p>
                </div>
            `;

            // List (IBadah)
            let saved = [];
            try { saved = JSON.parse(localStorage.getItem('solatReminders')) || []; } catch (e) { saved = []; }
            const pending = saved.filter(r => !r.done);

            if (pending.length === 0) {
                document.getElementById('smartActionBox').innerHTML = `<div class="ico">${icon('check-circle', 20)}</div><h4 class="tone-good">Alhamdulillah</h4><p>Tiada senarai ibadah tertunggak.</p>`;
            } else {
                document.getElementById('smartActionBox').innerHTML = `<div class="ico">${icon('clipboard-list', 20)}</div><h4 class="tone-good">Senarai Semak Anda</h4><p>Ada <strong>${pending.length} ibadah</strong> hari ini.</p>`;
            }

            // Extra Info (Waktu)
            const INFO = {
                Imsak: ['Waktu Imsak', 'Waktu berhenti bersahur bagi yang berpuasa.'],
                Subuh: ['Kelebihan Subuh', '"Sesiapa yang solat Subuh berjemaah, maka ia dalam jaminan Allah."'],
                Syuruk: ['Waktu Syuruk', 'Waktu Subuh telah tamat. Solat Sunat Dhuha boleh dilakukan.'],
                Zohor: ['Waktu Zohor', 'Elakkan tidur di waktu ini kerana ia boleh melemahkan badan.'],
                Asar: ['Waktu Asar', '"Sesiapa yang meninggalkan solat Asar, seolah-olah dia kehilangan keluarga dan hartanya."'],
                Maghrib: ['Waktu Maghrib', 'Waktu mustajab untuk berdoa. Jangan lepaskan peluang ini.'],
                Isyak: ['Waktu Isyak', 'Solat Isyak berjemaah mendapat pahala seperti solat setengah malam.']
            };
            const [title, text] = INFO[nextPrayer.key] || INFO.Isyak;
            document.getElementById('infoBox').innerHTML = `<div class="ico">${ICONS[nextPrayer.key] || ICONS.Isyak}</div><h4 class="tone-warn">${title}</h4><p>${text}</p>`;
        }

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        reminderBtn.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        clearInterval(countdownInterval);
        resultDiv.innerHTML = `<p class="error-msg">${icon('alert-circle', 18)} ${error.message || 
            'Gagal mendapatkan data.'}</p>`;
        reminderBtn.classList.add('hidden');
    } finally {
        searchBtn.disabled = false;
    }
});

reminderBtn.addEventListener('click', () => {
    ipcRenderer.send('open-reminder-window'); // main.js open next page
});