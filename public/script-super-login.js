// File: public/script-super-login.js (BARU)

document.getElementById('super-login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Mencegah reload

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const submitButton = event.target.querySelector('button[type="submit"]');

    errorMessage.classList.add('d-none'); // Sembunyikan error lama
    errorMessage.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Memproses...';

    try {
        // Panggil API Login Super Admin BARU
        const response = await fetch('/api/superAuth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Login gagal (${response.status}).. Anda bukan pemilik Aplikasi`);
        }

        // Sukses? simpan token (gunakan nama berbeda, misal 'superAdminToken')
        localStorage.setItem('superAdminToken', data.token);
        // (Opsional: Simpan info user jika backend mengirim)
        localStorage.setItem('superAdminUser', JSON.stringify(data.user)); 

        // Redirect ke halaman manajemen sekolah
        window.location.href = 'super-admin-schools.html';

    } catch (error) {
        console.error("Error login Super Admin:", error);
        errorMessage.textContent = error.message;
        errorMessage.classList.remove('d-none'); 
        submitButton.disabled = false;
        submitButton.textContent = 'login-super.html';
    }
});