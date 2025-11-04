// File: /public/login.js (VERSI BARU)

document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault(); 
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = ''; 

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // ==========================================================
            // == PERBAIKAN 1: SIMPAN TOKEN DAN USER ==
            // ==========================================================
            localStorage.setItem('token', data.token);
            // Simpan 'user' sebagai string JSON
            localStorage.setItem('user', JSON.stringify(data.user)); 
            // ==========================================================

            // Cek role untuk pengalihan (opsional, tapi bagus)
            const userRole = data.user.role;

            if (userRole === 'Admin') {
                // (Ganti ini dengan nama file dasbor admin Anda)
                window.location.href = '/dashboard_utama.html'; 
            } else if (userRole === 'Guru') {
                // (Ganti ini dengan nama file dasbor guru Anda)
                window.location.href = '/app-guru.html'; 
            } else {

                window.location.href = '/';
            }

        } else {
            errorMessage.textContent = data.message || 'Login gagal.';
        }
    } catch (error) {
        console.error('Error saat login:', error);
        errorMessage.textContent = 'Tidak dapat terhubung ke server.';
    }
});