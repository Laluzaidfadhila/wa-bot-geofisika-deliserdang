const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Webhook endpoint active' });
  }

  const sender = req.body.sender || req.body.from;
  const message = req.body.message;

  if (!sender || !message) {
    return res.status(200).send('No message payload received');
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://zvxvrnowcocwuhfzbmmy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabase = null;
  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      console.error('Supabase Init Error:', e);
    }
  }

  const text = message.trim().toUpperCase();
  const fonnteToken = process.env.FONNTE_TOKEN || 'tQTBfHSeQoXKNwKSejPJ';

  try {
    // 1. Simpan Log Pesan Masuk
    if (supabase) {
      await supabase.from('chat_logs').insert([
        { phone: sender, message: message, direction: 'incoming' }
      ]);
    }

    // 2. Cek Status Live Chat User
    let isLiveChat = false;
    if (supabase) {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('is_live_chat')
          .eq('phone', sender)
          .maybeSingle();

        if (user && user.is_live_chat === true) {
          isLiveChat = true;
        }
      } catch (err) {
        console.error('Error reading user state:', err);
      }
    }

    // 3. Reset dari Live Chat ke Bot (Keyword: BOT / STOP / BATAL)
    if (text === 'BOT' || text === 'STOP' || text === 'BATAL') {
      if (supabase) {
        await supabase.from('users').upsert(
          { phone: sender, is_live_chat: false },
          { onConflict: 'phone' }
        );
      }

      const resetMsg = `BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA\nSTASIUN GEOFISIKA KELAS I DELI SERDANG\n========================================\n\nSesi obrolan langsung dengan petugas telah diakhiri.\nLayanan bot otomatis kini aktif kembali.\n\nKetik *MENU* untuk melihat daftar layanan.`;

      await axios.post('https://api.fonnte.com/send', { target: sender, message: resetMsg }, { headers: { Authorization: fonnteToken } });
      return res.status(200).send('SUCCESS');
    }

    // 4. Jika User dalam Mode Live Chat, Hentikan Balasan Bot
    if (isLiveChat) {
      return res.status(200).send('LIVE_CHAT_ACTIVE');
    }

    // 5. Aktifkan Mode Live Chat Admin (Keyword: ADMIN / 4)
    if (text === 'ADMIN' || text === '4') {
      if (supabase) {
        await supabase.from('users').upsert(
          { phone: sender, is_live_chat: true },
          { onConflict: 'phone' }
        );
      }

      const userReply = `BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA\nSTASIUN GEOFISIKA KELAS I DELI SERDANG\n========================================\n\nAnda terhubung dengan *Layanan Petugas Piket Operasional*.\n\nSilakan tuliskan pertanyaan atau kendala Anda di sini. Petugas kami akan membalas pesan Anda secara langsung dari nomor ini.\n\n--- \n_Ketik *BOT* kapan saja jika ingin kembali ke menu otomatis._`;

      await axios.post('https://api.fonnte.com/send', { target: sender, message: userReply }, { headers: { Authorization: fonnteToken } });
      return res.status(200).send('SUCCESS');
    }

    // 6. Logika Menu Otomatis Standar
    let replyMessage = '';
    const header = `BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA\nSTASIUN GEOFISIKA KELAS I DELI SERDANG\n========================================\n\n`;
    const footer = `\n\n========================================\nWebsite: stageof-deliserdang.bmkg.go.id\nEmail: stageof.deliserdang@bmkg.go.id`;

    if (text === 'MENU' || text === 'HALO' || text === 'HI' || text === 'START') {
      replyMessage = header +
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

      replyMessage = header +
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
      replyMessage = header +
        `*PELAYANAN DATA DAN EDUKASI PUBLIK*\n\n` +
        `Silakan ketik kode sub-menu berikut:\n\n` +
        `*2A* - Permohonan Data Petir & Gempabumi\n` +
        `*2B* - Pendaftaran Kunjungan Edukasi / Studi\n` +
        `*2C* - Ketentuan Tarif & PNBP\n\n` +
        `_Ketik kode pilihan Anda (contoh: 2A)_` + footer;

    } else if (text === '2A') {
      replyMessage = header +
        `*PERMOHONAN DATA GEOFISIKA*\n\n` +
        `Persyaratan Permohonan Data:\n` +
        `1. Surat Permohonan Resmi ditujukan kepada Kepala Stasiun Geofisika Kelas I Deli Serdang.\n` +
        `2. Mengisi Formulir Layanan PTSP.\n` +
        `3. Melampirkan Salinan Identitas (KTP/KTM).\n\n` +
        `*Jam Layanan*: Senin - Jumat (08.00 - 16.00 WIB)\n\n` +
        `_Ketik *MENU* untuk kembali ke menu utama._` + footer;

    } else if (text === '2B') {
      replyMessage = header +
        `*PERMOHONAN KUNJUNGAN EDUKASI*\n\n` +
        `Ketentuan Kunjungan Lapangan / Studi:\n` +
        `1. Mengirimkan Surat Permohonan resmi dari Sekolah/Perguruan Tinggi (Minimal H-7).\n` +
        `2. Mencantumkan jumlah peserta dan pendamping.\n\n` +
        `Surat dapat dikirim via email ke:\n*stageof.deliserdang@bmkg.go.id*\n\n` +
        `_Ketik *MENU* untuk kembali ke menu utama._` + footer;

    } else if (text === '2C') {
      replyMessage = header +
        `*KETENTUAN TARIF DAN PNBP*\n\n` +
        `• Sesuai PP No. 47 Tahun 2018 tentang Tarif PNBP BMKG.\n` +
        `• Permohonan data untuk kegiatan pendidikan, penanggulangan bencana, dan keagamaan dapat dikenakan *Tarif Rp0 (Nol Rupiah)* sesuai syarat berlaku.\n\n` +
        `_Ketik *MENU* untuk kembali ke menu utama._` + footer;

    } else if (text === '3') {
      replyMessage = header +
        `*INFORMASI PENGAMATAN GEOFISIKA*\n\n` +
        `Fasilitas Pengamatan Operasional:\n` +
        `1. Pengamatan Gempabumi (Seismograph)\n` +
        `2. Pengamatan Sambaran Petir (Lightning Detector)\n` +
        `3. Pengamatan Magnet Bumi (Magnetometer)\n` +
        `4. Pengamatan Hilal & Tanda Waktu\n\n` +
        `_Ketik *MENU* untuk kembali ke menu utama._` + footer;

    } else {
      replyMessage = header +
        `Pesan tidak dikenali.\n\n` +
        `Silakan ketik *MENU* untuk melihat pilihan layanan atau ketik *ADMIN* untuk terhubung dengan petugas piket.` + footer;
    }

    // Kirim Balasan Bot
    await axios.post('https://api.fonnte.com/send', { target: sender, message: replyMessage }, { headers: { Authorization: fonnteToken } });

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
