// ==========================================
// KONFIGURASI URL GOOGLE SCRIPT
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfz8mRa--N1Bluz-dSMUX16RCRsShUhZkAyrfnAme3TyPaH-CQfKftlGYp85OyW9JjYA/exec'; 

let stream = null;
let photoData = null;

// FUNGSI KOMPRESI FOTO HIGH QUALITY (Max 1200px, Quality 0.85)
async function compressImage(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Resize max lebar 1200px agar tajam tapi tidak terlalu berat
            const maxWidth = 1200;
            const scale = Math.min(1, maxWidth / img.width);
            
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Kualitas 0.85 adalah titik optimal (Jernih & Ukuran ~300-600KB)
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = base64Str;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    
    const mainContainer = document.getElementById('mainContainer');
    if (mainContainer) mainContainer.classList.remove('hidden');
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('id-ID', options);
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('id-ID');
}

// Fungsi Kamera: Buka Kamera DEPAN TANPA MIRROR
const startCameraBtn = document.getElementById('startCamera');
if (startCameraBtn) {
    startCameraBtn.addEventListener('click', async function() {
        try {
            // facingMode: 'user' memaksa pakai kamera depan
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user', 
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
            
            const video = document.getElementById('camera');
            video.srcObject = stream;
            
            // PASTIKAN TIDAK ADA TRANSFORM MIRROR
            video.style.transform = 'none'; 
            
            this.classList.add('hidden');
            document.getElementById('takePhoto').classList.remove('hidden');
            
        } catch (error) {
            alert('Gagal mengakses kamera: ' + error.message);
        }
    });
}

// Fungsi Kamera: Ambil Foto (ANTI MIRROR + KOMPRESI HQ)
const takePhotoBtn = document.getElementById('takePhoto');
if (takePhotoBtn) {
    takePhotoBtn.addEventListener('click', async function() {
        const video = document.getElementById('camera');
        const canvas = document.getElementById('canvas');
        const photoPreview = document.getElementById('photoPreview');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        
        // Gambar langsung tanpa flip horizontal (Non-Mirror)
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Simpan full quality dulu untuk preview
        const fullQualityPhoto = canvas.toDataURL('image/jpeg', 0.95);
        
        // Preview hasil juga tidak boleh mirror
        photoPreview.src = fullQualityPhoto;
        photoPreview.style.transform = 'none'; 
        
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
        
        // Pastikan tetap tidak mirror saat kembali ke live camera
        document.getElementById('camera').style.transform = 'none';
        
        this.classList.add('hidden');
        document.getElementById('takePhoto').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = true;
        
        photoData = null;
        startCameraAgain();
    });
}

async function startCameraAgain() {
    try {
        // PASTIKAN INI JUGA 'user' AGAR TETAP KAMERA DEPAN SAAT RETAKE
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        const video = document.getElementById('camera');
        video.srcObject = stream;
        video.style.transform = 'none'; // Re-apply non-mirror
    } catch (error) {
        console.error('Gagal restart kamera:', error);
    }
}

// Submit Form Absensi (DENGAN KOMPRESI OTOMATIS)
const attendanceForm = document.getElementById('attendanceForm');
if (attendanceForm) {
    attendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!photoData) return alert('Silakan ambil foto terlebih dahulu!');
        
        const studentName = document.getElementById('studentName').value;
        const kelas = document.getElementById('kelas').value;
        const submitBtn = document.getElementById('submitBtn');
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimasi & Kirim...';

        try {
            // KOMPRES DENGAN KUALITAS TINGGI SEBELUM DIKIRIM
            const compressedPhoto = await compressImage(photoData);
            
            const payload = {
                studentName: studentName,
                kelas: kelas,
                timestamp: new Date().toISOString(),
                status: 'Tepat Waktu',
                photo: compressedPhoto 
            };

            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });

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
