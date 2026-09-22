// ==========================================
// KONFIGURASI URL GOOGLE SCRIPT
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfz8mRa--N1Bluz-dSMUX16RCRsShUhZkAyrfnAme3TyPaH-CQfKftlGYp85OyW9JjYA/exec'; 

let stream = null;
let photoData = null; // Variabel penampung foto

// FUNGSI KOMPRESI FOTO (Wajib agar tidak gagal kirim ke Google)
async function compressImage(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Resize max 1200px agar tajam tapi ringan
            const maxWidth = 1200;
            const scale = Math.min(1, maxWidth / img.width);
            
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Kompres ke JPEG quality 0.85
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

// 1. BUKA KAMERA DEPAN (NON-MIRROR)
const startCameraBtn = document.getElementById('startCamera');
if (startCameraBtn) {
    startCameraBtn.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user', // Kamera Depan
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
            
            const video = document.getElementById('camera');
            video.srcObject = stream;
            
            // Paksa tampilan LURUS (Tidak Mirror)
            video.style.transform = 'none'; 
            
            this.classList.add('hidden');
            document.getElementById('takePhoto').classList.remove('hidden');
            
        } catch (error) {
            alert('Gagal akses kamera: ' + error.message);
        }
    });
}

// 2. AMBIL FOTO (SIMPAN KE photoData)
const takePhotoBtn = document.getElementById('takePhoto');
if (takePhotoBtn) {
    takePhotoBtn.addEventListener('click', async function() {
        const video = document.getElementById('camera');
        const canvas = document.getElementById('canvas');
        const photoPreview = document.getElementById('photoPreview');
        
        // Set ukuran canvas sesuai video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        // Gambar video ke canvas (Tanpa flip/mirror)
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Simpan hasil foto ke variabel global photoData
        // Kita simpan versi full quality dulu untuk preview
        photoData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Tampilkan preview (Pastikan tidak mirror)
        photoPreview.src = photoData;
        photoPreview.style.transform = 'none'; 
        
        // Atur tampilan UI
        photoPreview.classList.remove('hidden');
        video.classList.add('hidden');
        
        this.classList.add('hidden');
        document.getElementById('retakePhoto').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = false;
        
        // Matikan kamera sementara untuk hemat baterai
        if (stream) stream.getTracks().forEach(track => track.stop());
    });
}

// 3. ULANGI FOTO
const retakePhotoBtn = document.getElementById('retakePhoto');
if (retakePhotoBtn) {
    retakePhotoBtn.addEventListener('click', function() {
        document.getElementById('photoPreview').classList.add('hidden');
        document.getElementById('camera').classList.remove('hidden');
        
        // Pastikan kamera tetap lurus saat nyala lagi
        document.getElementById('camera').style.transform = 'none';
        
        this.classList.add('hidden');
        document.getElementById('takePhoto').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = true;
        
        // Reset variabel foto
        photoData = null;
        startCameraAgain();
    });
}

async function startCameraAgain() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        const video = document.getElementById('camera');
        video.srcObject = stream;
        video.style.transform = 'none';
    } catch (error) {
        console.error('Gagal restart kamera:', error);
    }
}

// 4. SUBMIT FORM (KOMPRES DULU BARU KIRIM)
const attendanceForm = document.getElementById('attendanceForm');
if (attendanceForm) {
    attendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Cek apakah photoData sudah terisi
        if (!photoData) {
            alert('Silakan ambil foto terlebih dahulu!');
            return;
        }
        
        const studentName = document.getElementById('studentName').value;
        const kelas = document.getElementById('kelas').value;
        const submitBtn = document.getElementById('submitBtn');
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimasi & Kirim...';

        try {
            // Kompres foto sebelum dikirim agar tidak gagal
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
            alert('Gagal mengirim: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Konfirmasi Absensi';
        }
    });
}

// 5. RESET FORM
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
