const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfz8mRa--N1Bluz-dSMUX16RCRsShUhZkAyrfnAme3TyPaH-CQfKftlGYp85OyW9JjYA/exec'; 

document.addEventListener('DOMContentLoaded', () => {
    // Setup Navigasi Tab
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab') + 'Tab';
            document.getElementById(tabId).classList.add('active');
            
            // Reload data saat tab diklik
            if (this.getAttribute('data-tab') === 'dashboard') updateDashboard();
            if (this.getAttribute('data-tab') === 'attendance') loadAttendanceData();
            if (this.getAttribute('data-tab') === 'photos') loadPhotos();
        });
    });

    updateDashboard(); // Load awal
});

async function getData() {
    try {
        console.log("Mengambil data dari Google Sheets...");
        const res = await fetch(SCRIPT_URL);
        const text = await res.text(); // Baca sebagai text dulu untuk debugging
        
        // Coba parse JSON
        let data = [];
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Format data bukan JSON:", text);
            return [];
        }

        // Filter data yang valid
        return data.filter(d => d.studentName && d.timestamp).map(d => ({
            ...d,
            dateObj: new Date(d.timestamp)
        }));
        
    } catch (e) {
        console.error("Gagal koneksi ke Script:", e);
        alert("Gagal mengambil data. Pastikan URL Script benar dan Internet lancar.");
        return [];
    }
}

async function updateDashboard() {
    const data = await getData();
    const today = new Date().toDateString();
    const todayData = data.filter(d => !isNaN(d.dateObj) && d.dateObj.toDateString() === today);
    
    document.getElementById('totalStudents').innerText = new Set(data.map(d => d.studentName)).size;
    document.getElementById('todayAttendance').innerText = todayData.length;
    document.getElementById('lateCount').innerText = todayData.filter(d => d.status === 'Terlambat').length;
    document.getElementById('absentCount').innerText = Math.max(0, 50 - todayData.length);
}

async function loadAttendanceData() {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '<tr><td colspan="6">Sedang memuat data...</td></tr>';
    
    const data = await getData();
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Belum ada data absensi. Coba refresh halaman.</td></tr>';
        return;
    }
    
    // Sortir dari yang terbaru
    data.sort((a,b) => b.dateObj - a.dateObj);

    data.forEach((d, i) => {
        const dateStr = isNaN(d.dateObj) ? 'Tanggal Error' : d.dateObj.toLocaleString('id-ID');
        tbody.innerHTML += `
            <tr>
                <td>${i+1}</td>
                <td>${d.studentName}</td>
                <td>${d.kelas}</td>
                <td>${dateStr}</td>
                <td><span class="status-badge ${d.status === 'Tepat Waktu' ? 'success' : 'warning'}">${d.status}</span></td>
                <td><a href="${d.fotoUrl}" target="_blank" class="btn-view">Lihat Foto</a></td>
            </tr>
        `;
    });
}

async function loadPhotos() {
    const grid = document.getElementById('photosGrid');
    grid.innerHTML = 'Memuat galeri...';
    const data = await getData();
    grid.innerHTML = '';
    
    if (data.length === 0) {
        grid.innerHTML = '<p>Belum ada foto.</p>';
        return;
    }

    data.forEach(d => {
        grid.innerHTML += `
            <div class="photo-item">
                <img src="${d.fotoUrl}" onerror="this.src='https://via.placeholder.com/150?text=Link+Rusak'">
                <div class="photo-info">
                    <strong>${d.studentName}</strong>
                    <p>${d.kelas}</p>
                </div>
            </div>
        `;
    });
}

// Export CSV
async function exportData() {
    const data = await getData();
    if(data.length === 0) return alert("Tidak ada data untuk diexport");
    
    let csv = 'No,Nama,Kelas,Waktu,Status\n';
    data.forEach((d, i) => {
        csv += `${i+1},${d.studentName},${d.kelas},${d.dateObj.toLocaleString('id-ID')},${d.status}\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data_absensi.csv';
    a.click();
}

async function getData() {
    try {
        // Tambahkan ?t=timestamp biar gak kena cache
        const res = await fetch(`${SCRIPT_URL}?t=${Date.now()}`);
        const text = await res.text();
        // ... sisa kode sama ...
    }
}
