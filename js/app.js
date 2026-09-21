// ==========================================
// KONFIGURASI URL GOOGLE SCRIPT
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfz8mRa--N1Bluz-dSMUX16RCRsShUhZkAyrfnAme3TyPaH-CQfKftlGYp85OyW9JjYA/exec'; 

let stream = null;
let photoData = null;

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

// Fungsi Kamera: Buka Kamera DEPAN (USER)
const startCameraBtn = document.getElementById('startCamera');
if (startCameraBtn) {
    startCameraBtn.addEventListener('click', async function() {
        try {
            // UBAH 'environment' MENJADI 'user' UNTUK KAMERA DEPAN
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user', 
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
        // PASTIKAN INI JUGA 'user' AGAR TETAP KAMERA DEPAN SAAT RETAKE
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        document.getElementById('camera').srcObject = stream;
    } catch (error) {
        console.error('Gagal restart kamera:', error);
    }
}

// Submit Form Absensi
const attendanceForm = document.getElementById('attendanceForm');
if (attendanceForm) {
    attendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!photoData) return alert('Silakan ambil foto terlebih dahulu!');
        
        const studentName = document.getElementById('studentName').value;
        const kelas = document.getElementById('kelas').value;
        const submitBtn = document.getElementById('submitBtn');
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim Data...';

        try {
            const payload = {
                studentName: studentName,
                kelas: kelas,
                timestamp: new Date().toISOString(),
                status: 'Tepat Waktu',
                photo: photoData
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
