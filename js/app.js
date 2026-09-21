// ==========================================
// KONFIGURASI URL GOOGLE SCRIPT
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfz8mRa--N1Bluz-dSMUX16RCRsShUhZkAyrfnAme3TyPaH-CQfKftlGYp85OyW9JjYA/exec'; 

let stream = null;
let photoData = null;

// FUNGSI KOMPRESI FOTO (WAJIB ADA!)
async function compressImage(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // Resize max lebar 600px (cukup untuk bukti absen)
            const scale = Math.min(1, 600 / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Kualitas 60% agar ukuran file kecil (<500KB)
            resolve(canvas.toDataURL('image/jpeg', 0.6));
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

// Buka Kamera
const startCameraBtn = document.getElementById('startCamera');
if (startCameraBtn) {
    startCameraBtn.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            document.getElementById('camera').srcObject = stream;
            this.classList.add('hidden');
            document.getElementById('takePhoto').classList.remove('hidden');
        } catch (error) {
            alert('Gagal akses kamera: ' + error.message);
        }
    });
}

// Ambil Foto
const takePhotoBtn = document.getElementById('takePhoto');
if (takePhotoBtn) {
    takePhotoBtn.addEventListener('click', function() {
        const video = document.getElementById('camera');
        const canvas = document.getElementById('canvas');
        const photoPreview = document.getElementById('photoPreview');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        photoData = canvas.toDataURL('image/jpeg', 0.8); // Simpan full quality dulu
        
        photoPreview.src = photoData;
        photoPreview.classList.remove('hidden');
        video.classList.add('hidden');
        
        this.classList.add('hidden');
        document.getElementById('retakePhoto').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = false;
        
        if (stream) stream.getTracks().forEach(track => track.stop());
    });
}

// Ulangi Foto
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
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        document.getElementById('camera').srcObject = stream;
    } catch (error) { console.error(error); }
}

// Submit Form (DENGAN KOMPRESI OTOMATIS)
const attendanceForm = document.getElementById('attendanceForm');
if (attendanceForm) {
    attendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!photoData) return alert('Silakan ambil foto terlebih dahulu!');
        
        const studentName = document.getElementById('studentName').value;
        const kelas = document.getElementById('kelas').value;
        const submitBtn = document.getElementById('submitBtn');
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kompres & Kirim...';

        try {
            // KOMPRES FOTO SEBELUM DIKIRIM AGAR TIDAK GAGAL
            const compressedPhoto = await compressImage(photoData);
            
            const payload = {
                studentName: studentName,
                kelas: kelas,
                timestamp: new Date().toISOString(),
                status: 'Tepat Waktu',
                photo: compressedPhoto // Gunakan hasil kompresi
            };

            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });

            document.getElementById('successMessage').classList.remove('hidden');
            
        } catch (error) {
            alert('Gagal mengirim: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Konfirmasi Absensi';
        }
    });
}

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
    if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
}
