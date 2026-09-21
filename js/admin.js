// ==========================================
// KONFIGURASI URL
// ==========================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfz8mRa--N1Bluz-dSMUX16RCRsShUhZkAyrfnAme3TyPaH-CQfKftlGYp85OyW9JjYA/exec'; 

// Tunggu sampai SEMUA elemen halaman siap
window.addEventListener('load', () => {
    console.log("Admin Dashboard Siap!");
    
    // Setup Navigasi Tab
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems.length === 0) {
        console.error("Menu navigasi tidak ditemukan! Cek class .nav-item di HTML");
        return;
    }

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Menu diklik:", this.getAttribute('data-tab'));
            
            // Reset active state
            navItems.forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            // Set active state baru
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab') + 'Tab';
            const targetTab = document.getElementById(tabId);
            
            if (targetTab) {
                targetTab.classList.add('active');
                
                // Load data sesuai tab
                const type = this.getAttribute('data-tab');
                if (type === 'dashboard') updateDashboard();
                else if (type === 'attendance') loadAttendanceData();
                else if (type === 'photos') loadPhotos();
                else if (type === 'settings') console.log("Tab pengaturan dibuka");
            } else {
                console.error(`Tab dengan ID "${tabId}" tidak ditemukan!`);
            }
        });
    });

    // Load dashboard pertama kali
    updateDashboard();
});

async function getData() {
    try {
        // Tambahkan timestamp untuk bypass cache Vercel/Browser
        const res = await fetch(`${SCRIPT_URL}?t=${Date.now()}`);
        const text = await res.text();
        
        let data = [];
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Respon bukan JSON:", text.substring(0, 100));
            return [];
        }
        
        return data.filter(d => d.studentName && d.timestamp).map(d => ({
            ...d,
            dateObj: new Date(d.timestamp)
        }));
        
    } catch (e) {
        console.error("Gagal fetch data:", e);
        return [];
    }
}

async function updateDashboard() {
    const data = await getData();
    const today = new Date().toDateString();
    const todayData = data.filter(d => !isNaN(d.dateObj) && d.dateObj.toDateString() === today);
    
    const elTotal = document.getElementById('totalStudents');
    const elToday = document.getElementById('todayAttendance');
    const elLate = document.getElementById('lateCount');
    const elAbsent = document.getElementById('absentCount');
    
    if (elTotal) elTotal.innerText = new Set(data.map(d => d.studentName)).size;
    if (elToday) elToday.innerText = todayData.length;
    if (elLate) elLate.innerText = todayData.filter(d => d.status === 'Terlambat').length;
    if (elAbsent) elAbsent.innerText = Math.max(0, 50 - todayData.length);
}

async function loadAttendanceData() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6">Sedang memuat data...</td></tr>';
    
    const data = await getData();
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Belum ada data absensi.</td></tr>';
        return;
    }
    
    data.sort((a,b) => b.dateObj - a.dateObj);
    
    data.forEach((d, i) => {
        const dateStr = isNaN(d.dateObj) ? 'Tanggal Error' : d.dateObj.toLocaleString('id-ID');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i+1}</td>
            <td>${d.studentName}</td>
            <td>${d.kelas}</td>
            <td>${dateStr}</td>
            <td><span class="status-badge ${d.status === 'Tepat Waktu' ? 'success' : 'warning'}">${d.status}</span></td>
            <td><a href="${d.fotoUrl}" target="_blank" class="btn-view">Lihat Foto</a></td>
        `;
        tbody.appendChild(row);
    });
}

async function loadPhotos() {
    const grid = document.getElementById('photosGrid');
    if (!grid) return;
    
    grid.innerHTML = 'Memuat galeri...';
    const data = await getData();
    grid.innerHTML = '';
    
    if (data.length === 0) {
        grid.innerHTML = '<p>Belum ada foto.</p>';
        return;
    }
    
    data.forEach(d => {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.innerHTML = `
            <img src="${d.fotoUrl}" onerror="this.src='https://via.placeholder.com/150?text=Error'" loading="lazy">
            <div class="photo-info">
                <strong>${d.studentName}</strong>
                <p>${d.kelas}</p>
            </div>
        `;
        grid.appendChild(item);
    });
}

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
