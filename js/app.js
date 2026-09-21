// ==========================================
// KONFIGURASI URL GOOGLE SCRIPT
// ==========================================
// ⚠️ GANTI URL DI BAWAH INI DENGAN URL WEB APP DARI GOOGLE APPS SCRIPT KAMU
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfz8mRa--N1Bluz-dSMUX16RCRsShUhZkAyrfnAme3TyPaH-CQfKftlGYp85OyW9JjYA/exec'; 

let stream = null;
let photoData = null;

// Initialize saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    // 1. Hilangkan loading screen segera agar tidak muter-muter
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.style.display = 'none';

    // 2. Tampilkan container utama
    const mainContainer = document.getElementById('mainContainer');
    if (mainContainer) mainContainer.classList.remove('hidden');

    // 3. Jalankan jam
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// Update Jam dan Tanggal
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    
    if (dateEl) dateEl.textContent = now.toLocaleDateString('id-ID', options);
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('id-ID');
}

// Fungsi Kamera: Buka Kamera
const startCameraBtn = document.getElementById('startCamera');
if (startCameraBtn) {
    startCameraBtn.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            const video = document.getElementById('camera');
            video.srcObject = stream;
            
            this.classList.add('hidden');
            document.getElementById('takePhoto').classList.remove('hidden');
            
        } catch (error) {
            alert('Gagal mengakses kamera: ' + error.message);
        }
    });
}

// Fungsi Kamera: Ambil Foto
const takePhotoBtn = document.getElementById('takePhoto');
if (takePhotoBtn) {
    takePhotoBtn.addEventListener('click', function() {
        const video = document.getElementById('camera');
        const canvas = document.getElementById('canvas');
        const photoPreview = document.getElementById('photoPreview');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        photoData = canvas.toDataURL('image/jpeg', 0.8);
        
        photoPreview.src = photoData;
        photoPreview.classList.remove('hidden');
        video.classList.add('hidden');
        
        this.classList.add('hidden');
        document.getElementById('retakePhoto').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = false;
        
        if (stream) stream.getTracks().forEach(track => track.stop());
    });
}

// Fungsi Kamera: Ulangi Foto
const retakePhotoBtn = document.getElementById('retakePhoto');
if (retakePhotoBtn) {
    retakePhotoBtn.addEventListener('click', function() {
        document.getElementById('photoPreview').classList.add('hidden');
        document.getElementById('camera').classList.remove('hidden');
        
        this.classList.add('hidden');
        document.getElementById('takePhoto').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = true;
        
        photoData = null;
        startCameraAgain();
    });
}

async function startCameraAgain() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        document.getElementById('camera').srcObject = stream;
    } catch (error) {
        console.error('Gagal restart kamera:', error);
    }
}

// Submit Form Absensi (LANGSUNG KE GOOGLE SHEETS)
const attendanceForm = document.getElementById('attendanceForm');
if (attendanceForm) {
    attendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!photoData) {
            alert('Silakan ambil foto terlebih dahulu!');
            return;
        }
        
        const studentName = document.getElementById('studentName').value;
        const kelas = document.getElementById('kelas').value;
        const submitBtn = document.getElementById('submitBtn');
        
        // Efek loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim Data...';

        try {
            // Siapkan data untuk dikirim
            const payload = {
                studentName: studentName,
                kelas: kelas,
                timestamp: new Date().toISOString(),
                status: 'Tepat Waktu',
                photo: photoData
            };

            // KIRIM KE GOOGLE SCRIPT
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Penting agar tidak diblokir browser
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });

            // Jika berhasil sampai sini, anggap sukses
            document.getElementById('successMessage').classList.remove('hidden');
            
        } catch (error) {
            alert('Gagal mengirim data: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Konfirmasi Absensi';
        }
    });
}

// Reset Form
function resetForm() {
    document.getElementById('attendanceForm').reset();
    document.getElementById('successMessage').classList.add('hidden');
    document.getElementById('photoPreview').classList.add('hidden');
    document.getElementById('camera').classList.remove('hidden');
    document.getElementById('startCamera').classList.remove('hidden');
    document.getElementById('takePhoto').classList.add('hidden');
    document.getElementById('retakePhoto').classList.add('hidden');
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-check-circle"></i> Konfirmasi Absensi';
    
    photoData = null;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}