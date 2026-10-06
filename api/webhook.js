const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Inisialisasi Supabase & Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

const supabase = createClient(supabaseUrl, supabaseKey);

// Fungsi pembantu mengirim balasan via Fonnte API
async function sendWAMessage(target, message) {
  try {
    await axios.post(
      'https://api.fonnte.com/send',
      {
        target: target,
        message: message,
      },
      {
        headers: {
          Authorization: FONNTE_TOKEN,
        },
      }
    );
  } catch (error) {
    console.error('Error sending WA message:', error.response?.data || error.message);
  }
}

// Fungsi mengambil data gempa bumi terkini dari API BMKG Pusat
async function getLatestEarthquake() {
  try {
    const response = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
    const gempa = response.data.Infogempa.gempa;
    
    return `🌋 *INFORMASI GEMPA BUMI TERKINI (BMKG)*\n\n` +
           `📅 *Tanggal:* ${gempa.Tanggal}\n` +
           `⏰ *Waktu:* ${gempa.Jam}\n` +
           `📈 *Magnitudo:* *${gempa.Magnitude}*\n` +
           `📏 *Kedalaman:* ${gempa.Kedalaman}\n` +
           `📍 *Lokasi:* ${gempa.Wilayah}\n` +
           `🌊 *Potensi:* *${gempa.Potensi}*\n\n` +
           `_Laporan Resmi Stasiun Geofisika Kelas I Deli Serdang_`;
  } catch (error) {
    console.error('Error fetching BMKG data:', error.message);
    return 'Mohon maaf, sistem gagal terhubung ke server data BMKG. Silakan coba beberapa saat lagi.';
  }
}

// Handler utama Serverless Function Vercel
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Webhook payload dari Fonnte
    const { sender, message, name } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ message: 'Payload tidak valid' });
    }

    const cleanSender = sender.trim();
    const userMsg = message.trim().toLowerCase();

    // 1. Catat / Update Pengguna di Database Supabase
    await supabase.from('users').upsert(
      { phone: cleanSender, name: name || 'Masyarakat' },
      { onConflict: 'phone' }
    );

    let replyMessage = '';

    // 2. Logika Navigasi Menu Pelayanan WA Bot
    if (userMsg === 'menu' || userMsg === 'halo' || userMsg === 'pilih' || userMsg === '0' || userMsg === 'p') {
      replyMessage = `Selamat datang di *Layanan Digital Resmi Stasiun Geofisika Kelas I Deli Serdang (BMKG)* 🏛️⚡\n\n` +
                     `Silakan ketik nomor pilihan layanan berikut:\n\n` +
                     `1️⃣ *Gempa Bumi Terkini* (Data Real-time BMKG)\n` +
                     `2️⃣ *Peta Kerapatan Petir & Cuaca*\n` +
                     `3️⃣ *Permohonan Data & Jasa Seismometri/Petir*\n` +
                     `4️⃣ *Informasi Profil & Kontak Kantor*\n` +
                     `5️⃣ *Edukasi & Panduan Mitigasi Bencana*\n` +
                     `6️⃣ *Layanan Pengaduan / Live Support*\n\n` +
                     `💡 *Petunjuk:* Ketik angka *1 - 6* atau ketik *MENU* kapan saja untuk kembali.`;
    } 
    else if (userMsg === '1' || userMsg.includes('gempa')) {
      replyMessage = await getLatestEarthquake();
    } 
    else if (userMsg === '2' || userMsg.includes('petir')) {
      replyMessage = `🌩️ *INFORMASI KERAPATAN PETIR & CUACA*\n\n` +
                     `Untuk melihat buletin peta kerapatan petir bulanan dan peta rawan petir wilayah Sumatera Utara & Deli Serdang, silakan akses portal resmi kami:\n\n` +
                     `🌐 https://bbmkg1.bmkg.go.id\n\n` +
                     `Ketik *0* atau *MENU* untuk kembali.`;
    } 
    else if (userMsg === '3' || userMsg.includes('data') || userMsg.includes('jasa')) {
      // Simpan draf permohonan layanan ke Supabase
      await supabase.from('service_requests').insert([
        { phone: cleanSender, service_type: 'Permohonan Data & Jasa' }
      ]);

      replyMessage = `📋 *PERMOHONAN DATA & JASA PELAYANAN*\n\n` +
                     `Permohonan Anda telah terdaftar di sistem.\n\n` +
                     `*Persyaratan Dokumen:*\n` +
                     `• Surat Permohonan Resmi Instansi/Kampus\n` +
                     `• Kartu Identitas (KTP / KTM)\n\n` +
                     `Petugas Pelayanan PTSP Stasiun Geofisika Deli Serdang akan memverifikasi permohonan Anda pada jam kerja (08.00 - 16.00 WIB).\n\n` +
                     `Ketik *0* atau *MENU* untuk kembali.`;
    } 
    else if (userMsg === '4' || userMsg.includes('profil') || userMsg.includes('alamat')) {
      replyMessage = `🏛️ *STASIUN GEOFISIKA KELAS I DELI SERDANG*\n\n` +
                     `📍 *Alamat:* Jl. Geofisika No. 1, Tuntungan I, Kec. Pancur Batu, Kab. Deli Serdang, Sumatera Utara\n` +
                     `✉️ *Email:* stageof.deliserdang@bmkg.go.id\n` +
                     `⏰ *Jam Operasional:* Senin - Jumat (08.00 - 16.00 WIB)\n\n` +
                     `Ketik *0* atau *MENU* untuk kembali.`;
    } 
    else if (userMsg === '5' || userMsg.includes('mitigasi')) {
      replyMessage = `🛡️ *PANDUAN MITIGASI BENCANA GEMPA BUMI*\n\n` +
                     `1. *Di Dalam Ruangan:* Merunduk, lindungi kepala di bawah meja yang kokoh.\n` +
                     `2. *Di Luar Ruangan:* Jauhi bangunan tinggi, tiang listrik, dan pohon rindang.\n` +
                     `3. *Hindari Hoaks:* Pantau informasi resmi hanya dari saluran BMKG.\n\n` +
                     `Ketik *0* atau *MENU* untuk kembali.`;
    } 
    else if (userMsg === '6' || userMsg.includes('petugas') || userMsg.includes('cs')) {
      replyMessage = `☎️ *LIVE SUPPORT & PENGADUAN*\n\n` +
                     `Pesan Anda telah diteruskan ke petugas operasional.\n` +
                     `Petugas kami akan membalas pesan Anda sesegera mungkin.\n\n` +
                     `Ketik *0* atau *MENU* untuk kembali.`;
    } 
    else {
      replyMessage = `Mohon maaf, kata kunci tidak dikenali.\n\nKetik *MENU* atau *0* untuk menampilkan daftar layanan resmi Stasiun Geofisika Kelas I Deli Serdang.`;
    }

    // 3. Simpan Riwayat Pesan ke Tabel `chat_logs` di Supabase
    await supabase.from('chat_logs').insert([
      {
        phone: cleanSender,
        incoming_message: message,
        outgoing_message: replyMessage,
      },
    ]);

    // 4. Kirimkan Balasan Otomatis ke WhatsApp Pengguna
    await sendWAMessage(cleanSender, replyMessage);

    return res.status(200).json({ status: 'success', message: 'Balasan berhasil dikirim' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ status: 'error', error: error.message });
  }
};
