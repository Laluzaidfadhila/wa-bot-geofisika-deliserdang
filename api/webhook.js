const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Webhook endpoint active' });
  }

  const sender = req.body.sender || req.body.from;
  const message = req.body.message;

  if (!sender || !message) {
    return res.status(200).send('No payload received');
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://zvxvrnowcocwuhfzbmmy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fonnteToken = process.env.FONNTE_TOKEN || 'tQTBfHSeQoXKNwKSejPJ';

  let supabase = null;
  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      console.error('Supabase initialization error:', e);
    }
  }

  const text = message.trim().toUpperCase();

  try {
    // 1. Simpan log pesan masuk ke database
    if (supabase) {
      await supabase.from('chat_logs').insert([
        { phone: sender, message: message, direction: 'incoming' }
      ]);
    }

    // 2. Helper function untuk mengelola status Live Chat pengguna
    const setLiveChatStatus = async (status) => {
      if (!supabase) return;
      try {
        const { data } = await supabase.from('users').select('id').eq('phone', sender).maybeSingle();
        if (data) {
          await supabase.from('users').update({ is_live_chat: status }).eq('phone', sender);
        } else {
          await supabase.from('users').insert([{ phone: sender, is_live_chat: status }]);
        }
      } catch (err) {
        console.error('Error updating live chat status:', err);
      }
    };

    // 3. Cek apakah pengguna saat ini sedang dalam mode Live Chat
    let isLiveChat = false;
    if (supabase) {
      try {
        const { data } = await supabase.from('users').select('is_live_chat').eq('phone', sender).maybeSingle();
        if (data && data.is_live_chat === true) {
          isLiveChat = true;
        }
      } catch (e) {
        console.error('Error fetching user state:', e);
      }
    }

    // 4. Fitur Reset Sesi ke Bot (Keyword: BOT / STOP / BATAL)
    if (text === 'BOT' || text === 'STOP' || text === 'BATAL') {
      await setLiveChatStatus(false);
      const resetMsg = `BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA\nSTASIUN GEOFISIKA KELAS I DELI SERDANG\n========================================\n\nSesi obrolan langsung dengan petugas telah diakhiri.\nLayanan bot otomatis kini aktif kembali.\n\nKetik *MENU* untuk menampilkan daftar layanan resmi.`;
      
      await axios.post('https://api.fonnte.com/send', { target: sender, message: resetMsg }, { headers: { Authorization: fonnteToken } });
      return res.status(200).send('SUCCESS');
    }

    // 5. JIKA DALAM MODE LIVE CHAT: Bot tidak membalas pesan secara otomatis
    if (isLiveChat) {
      return res.status(200).send('LIVE_CHAT_ACTIVE');
    }

    // 6. Hubungi Admin / Petugas Piket (Keyword: ADMIN / 4)
    if (text === 'ADMIN' || text === '4') {
      await setLiveChatStatus(true);
      const userReply = `BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA\nSTASIUN GEOFISIKA KELAS I DELI SERDANG\n========================================\n\nAnda telah terhubung dengan *Layanan Petugas Piket Operasional*.\n\nSilakan tuliskan pertanyaan, permohonan, atau pengaduan Anda di sini. Petugas kami akan membalas pesan Anda secara langsung dari nomor ini.\n\n---\n_Ketik *BOT* kapan saja jika ingin kembali ke layanan otomatis._`;
      
      await axios.post('https://api.fonnte.com/send', { target: sender, message: userReply }, { headers: { Authorization: fonnteToken } });
      return res.status(200).send('SUCCESS');
    }

    // 7. Katalog Layanan & Logika Menu Otomatis
    let reply = '';
    const header = `BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA\nSTASIUN GEOFISIKA KELAS I DELI SERDANG\n========================================\n\n`;
    const footer = `\n\n========================================\nWebsite: stageof-deliserdang.bmkg.go.id\nEmail: stageof.deliserdang@bmkg.go.id`;

    if (text === 'MENU' || text === 'HALO' || text === 'HI' || text === 'START') {
      reply = header + 
        `Selamat datang di Layanan Informasi Resmi Stasiun Geofisika Kelas I Deli Serdang.\n\n` +
        `Silakan balas dengan angka pilihan menu:\n\n` +
        `*1* - Informasi Gempabumi Terkini\n` +
        `*2* - Pelayanan Data & Edukasi Publik\n` +
        `*3* - Informasi Pengamatan Geofisika\n` +
        `*4* - Hubungi Petugas Piket (Live Chat)\n\n` +
        `_Ketik angka pilihan Anda (contoh: 1)_` + footer;

    } else if (text === '1') {
      const bmkgRes = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
      const g = bmkgRes.data.Infogempa.gempa;
      reply = header + 
        `*INFORMASI GEMPABUMI TERKINI*\n\n` +
        `• *Waktu*: ${g.Tanggal} | ${g.Jam} WIB\n` +
        `• *Magnitudo*: ${g.Magnitude}\n` +
        `• *Kedalaman*: ${g.Kedalaman}\n` +
        `• *Lokasi*: ${g.Wilayah}\n` +
        `• *Potensi Tsunami*: ${g.Potensi}\n` +
        `• *Goncangan Dirasakan*: ${g.Dirasakan || 'Dalam pendataan'}\n\n` +
        `Peta Shakemap:\nhttps://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}\n\n` +
        `_Ketik *MENU* untuk kembali ke menu utama._` + footer;

    } else if (text === '2') {
      reply = header + 
        `*PELAYANAN DATA DAN EDUKASI PUBLIK*\n\n` +
        `Silakan ketik kode sub-menu berikut:\n\n` +
        `*2A* - Permohonan Data Petir & Gempabumi\n` +
        `*2B* - Pendaftaran Kunjungan Edukasi / Studi\n` +
        `*2C* - Ketentuan Tarif & PNBP\n\n` +
        `_Ketik kode pilihan Anda (contoh: 2A)_` + footer;

    } else if (text === '2A') {
      reply = header + 
        `*PERMOHONAN DATA GEOFISIKA*\n\n` +
        `Persyaratan Permohonan Data:\n` +
        `1. Surat Permohonan Resmi ditujukan kepada Kepala Stasiun Geofisika Kelas I Deli Serdang.\n` +
        `2. Mengisi Formulir Layanan PTSP.\n` +
        `3. Melampirkan Salinan Identitas (KTP/KTM).\n\n` +
        `*Jam Layanan*: Senin - Jumat (08.00 - 16.00 WIB)\n\n` +
        `_Ketik *MENU* untuk kembali ke menu utama._` + footer;

    } else if (text === '2B') {
      reply = header + 
        `*PERMOHONAN KUNJUNGAN EDUKASI*\n\n` +
        `Ketentuan Kunjungan Lapangan / Studi:\n` +
        `1. Mengirimkan Surat Permohonan resmi dari Sekolah/Perguruan Tinggi (Minimal H-7).\n` +
        `2. Mencantumkan jumlah peserta dan pendamping.\n\n` +
        `Surat dikirim via email ke:\n*stageof.deliserdang@bmkg.go.id*\n\n` +
        `_Ketik *MENU* untuk kembali ke menu utama._` + footer;

    } else if (text === '2C') {
      reply = header + 
        `*KETENTUAN TARIF DAN PNBP*\n\n` +
        `• Sesuai PP No. 47 Tahun 2018 tentang Tarif PNBP BMKG.\n` +
        `• Permohonan data untuk kegiatan pendidikan, penanggulangan bencana, dan keagamaan dapat dikenakan *Tarif Rp0 (Nol Rupiah)* sesuai syarat berlaku.\n\n` +
        `_Ketik *MENU* untuk kembali ke menu utama._` + footer;

    } else if (text === '3') {
      reply = header + 
        `*INFORMASI PENGAMATAN GEOFISIKA*\n\n` +
        `Fasilitas Pengamatan Operasional:\n` +
        `1. Pengamatan Gempabumi (Seismograph)\n` +
        `2. Pengamatan Sambaran Petir (Lightning Detector)\n` +
        `3. Pengamatan Magnet Bumi (Magnetometer)\n` +
        `4. Pengamatan Hilal & Tanda Waktu\n\n` +
        `_Ketik *MENU* untuk kembali ke menu utama._` + footer;

    } else {
      reply = header + 
        `Pesan tidak dikenali.\n\n` +
        `Silakan ketik *MENU* untuk melihat pilihan layanan atau ketik *ADMIN* untuk terhubung dengan petugas piket.` + footer;
    }

    // Kirim balasan otomatis
    await axios.post('https://api.fonnte.com/send', { target: sender, message: reply }, { headers: { Authorization: fonnteToken } });

    if (supabase) {
      await supabase.from('chat_logs').insert([
        { phone: sender, message: reply, direction: 'outgoing' }
      ]);
    }

    return res.status(200).send('SUCCESS');
  } catch (err) {
    console.error('Error in webhook execution:', err);
    return res.status(500).send('INTERNAL ERROR');
  }
};
