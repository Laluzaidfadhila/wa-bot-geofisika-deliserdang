const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

module.exports = async (req, res) => {
  // 1. Inisialisasi Supabase di dalam handler dengan hardcoded fallback URL
  const supabaseUrl = process.env.SUPABASE_URL || 'https://zvxvrnowcocwuhfzbmmy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('Supabase init error:', err);
  }

  // 2. Hanya terima metode POST
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Webhook endpoint active' });
  }

  // 3. Menangani parameter pengirim pesan dari Fonnte
  const sender = req.body.sender || req.body.from;
  const message = req.body.message;

  if (!sender || !message) {
    return res.status(200).send('No message payload received');
  }

  const text = message.trim().toUpperCase();

  try {
    // Log pesan masuk ke Supabase
    if (supabase) {
      await supabase.from('chat_logs').insert([
        { phone: sender, message: message, direction: 'incoming' }
      ]);
    }

    let replyMessage = '';

    // Logika Menu / Keyword
    if (text === 'MENU' || text === 'HALO' || text === 'HI') {
      replyMessage = `Selamat datang di Layanan Informasi Stasiun Geofisika Kelas I Deli Serdang.\n\nSilakan pilih menu:\n1. Informasi Gempa Terkini\n2. Informasi Pelayanan Publik\n3. Bantuan / Layanan Pengaduan`;
    } else if (text === '1') {
      const bmkgRes = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
      const gempa = bmkgRes.data.Infogempa.gempa;
      replyMessage = `*INFORMASI GEMPA TERKINI (BMKG)*\n\nTanggal: ${gempa.Tanggal}\nJam: ${gempa.Jam}\nMagnitudo: ${gempa.Magnitude}\nKedalaman: ${gempa.Kedalaman}\nWilayah: ${gempa.Wilayah}\nPotensi: ${gempa.Potensi}`;
    } else if (text === '2') {
      replyMessage = `*LAYANAN INFORMASI GEOFISIKA*\n\n1. Permohonan Data Petir & Gempa\n2. Kunjungan Edukasi\n\nSilakan hubungi staf kami pada jam kerja operasional.`;
    } else if (text === '3') {
      replyMessage = `*LAYANAN PENGADUAN*\n\nUntuk pengaduan atau konsultasi lebih lanjut, silakan sampaikan keluhan Anda secara langsung melalui pesan ini. Staf kami akan merespons secepatnya.`;
    } else {
      replyMessage = `Ketik *MENU* untuk melihat daftar layanan resmi Stasiun Geofisika Deli Serdang.`;
    }

    // Kirim balasan via Fonnte
    await axios.post(
      'https://api.fonnte.com/send',
      {
        target: sender,
        message: replyMessage
      },
      {
        headers: {
          Authorization: process.env.FONNTE_TOKEN || 'tQTBfHSeQoXKNwKSejPJ'
        }
      }
    );

    // Log pesan keluar ke Supabase
    if (supabase) {
      await supabase.from('chat_logs').insert([
        { phone: sender, message: replyMessage, direction: 'outgoing' }
      ]);
    }

    return res.status(200).send('SUCCESS');
  } catch (err) {
    console.error('Error handling webhook:', err);
    return res.status(500).send('INTERNAL ERROR');
  }
};
