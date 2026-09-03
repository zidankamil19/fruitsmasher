// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA
const SCRIPT_URL = "PASTE_WEB_APP_URL_DI_SINI";

let username = "";
let whatsapp = "";
let score = 0;
let gameInterval;
let isGameRunning = false;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Pengaturan Buah
// Kita gunakan emoji sebagai buah. Ukuran font disesuaikan.
let fruits = ["🍎", "🍊", "🍇", "🍉", "🍓"];
let currentFruit = {
  x: 0,
  y: 0,
  type: "",
  size: 30, // Ukuran target klik (radius)
  fontSize: 40, // Ukuran tampilan emoji
  speed: 3
};

// Fungsi untuk mengacak posisi dan jenis buah baru
function spawnFruit() {
  currentFruit.type = fruits[Math.floor(Math.random() * fruits.length)];
  // Pastikan buah tidak muncul terlalu di pinggir
  currentFruit.x = Math.random() * (canvas.width - currentFruit.fontSize) + currentFruit.fontSize/2;
  currentFruit.y = -currentFruit.fontSize; // Mulai dari atas layar
  
  // Sedikit meningkatkan kecepatan setiap kali buah muncul (opsional, biar makin susah)
  currentFruit.speed = 3 + (score / 100); 
}

// --- Logika Input: Klik atau Tap ---

// Menangani klik mouse
canvas.addEventListener("mousedown", function(e) {
  if (!isGameRunning) return;
  handleInput(e.clientX, e.clientY);
});

// Menangani tap pada layar sentuh (mobile)
canvas.addEventListener("touchstart", function(e) {
  if (!isGameRunning) return;
  // Mencegah scroll saat menap game
  e.preventDefault(); 
  // Ambil koordinat tap pertama
  let touch = e.touches[0];
  handleInput(touch.clientX, touch.clientY);
}, { passive: false });

function handleInput(clientX, clientY) {
  // Mendapatkan posisi canvas di layar
  let rect = canvas.getBoundingClientRect();
  
  // Menghitung posisi klik relatif terhadap canvas
  let clickX = clientX - rect.left;
  let clickY = clientY - rect.top;

  // Deteksi Tabrakan (Cek apakah klik berada di dalam area buah)
  // Kita gunakan rumus jarak Euclidean sederhana karena targetnya bulat (emoji)
  let dx = clickX - currentFruit.x;
  // Hitung ke tengah emoji
  let dy = clickY - (currentFruit.y - currentFruit.fontSize/2); 
  let distance = Math.sqrt(dx * dx + dy * dy);

  // Jika jarak klik kurang dari ukuran buah (radius target)
  if (distance < currentFruit.size) {
    score += 10;
    // Tambahkan efek visual kecil saat hancur (opsional, di sini kita langsung spawn baru)
    spawnFruit(); 
  }
}

// --- Logika Utama Game ---

function fetchLeaderboard() {
  fetch(SCRIPT_URL)
    .then((res) => res.json())
    .then((data) => {
      let tbody = document.getElementById("leaderboardBody");
      tbody.innerHTML = "";
      if (data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3'>Belum ada skor.</td></tr>";
        return;
      }
      data.forEach((item, index) => {
        tbody.innerHTML += `<tr><td>${index + 1}</td><td>${item.username}</td><td>${item.score}</td></tr>`;
      });
    })
    .catch(() => {
      document.getElementById("leaderboardBody").innerHTML =
        "<tr><td colspan='3'>Gagal memuat leaderboard.</td></tr>";
    });
}

function startGame() {
  username = document.getElementById("username").value.trim();
  whatsapp = document.getElementById("whatsapp").value.trim();

  if (!username || !whatsapp) {
    alert("Harap isi Username dan Nomor WA!");
    return;
  }

  document.getElementById("loginMenu").style.display = "none";
  canvas.style.display = "block";
  score = 0;
  isGameRunning = true;
  spawnFruit();
  
  // Jalankan loop game (30 FPS)
  gameInterval = setInterval(updateGame, 1000 / 30);
}

function updateGame() {
  // 1. Bersihkan layar
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Gambar Buah (Emoji)
  ctx.font = currentFruit.fontSize + "px Arial";
  ctx.textAlign = "center";
  // Menghambar emoji. Koordinat Y canvas adalah baseline teks, 
  // jadi kita biarkan y bertambah.
  ctx.fillText(currentFruit.type, currentFruit.x, currentFruit.y);

  // 3. Pergerakan Buah
  currentFruit.y += currentFruit.speed;

  // 4. Deteksi Game Over (Buah Jatuh melewati batas bawah)
  if (currentFruit.y > canvas.height + currentFruit.fontSize) {
    isGameRunning = false;
    clearInterval(gameInterval);
    alert(`Game Over! Buah jatuh. Skor Anda: ${score}`);
    saveData(username, whatsapp, score);
  }

  // 5. Tampilkan Skor di pojok kiri atas
  ctx.fillStyle = "#FFF";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Skor: " + score, 10, 25);
}

function saveData(user, wa, finalScore) {
  // Tampilkan status loading ringan
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFF";
  ctx.textAlign = "center";
  ctx.fillText("Menyimpan Skor...", canvas.width/2, canvas.height/2);

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "saveScore",
      username: user,
      whatsapp: wa,
      score: finalScore,
    }),
  }).then(() => {
    // Setelah data tersimpan, refresh leaderboard dan kembali ke menu
    fetchLeaderboard();
    document.getElementById("loginMenu").style.display = "block";
    canvas.style.display = "none";
  }).catch(err => {
    console.error("Gagal menyimpan:", err);
    alert("Gagal menyimpan skor ke database. Cek koneksi.");
    // Tetap kembali ke menu agar tidak stuck
    document.getElementById("loginMenu").style.display = "block";
    canvas.style.display = "none";
  });
}

// Load Leaderboard saat halaman pertama kali dibuka
fetchLeaderboard();
