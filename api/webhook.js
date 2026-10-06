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

  try {
    // Log pesan masuk
    if (supabase) {
      await supabase.from('chat_logs').insert([
        { phone: sender, message: message, direction: 'incoming' }
      ]);
    }

    let replyMessage = '';

    // HEADER RESMI BMKG
    const header = `BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA\nSTASIUN GEOFISIKA KELAS I DELI SERDANG\n========================================\n\n`;
    const footer = `\n\n========================================\nLayanan Informasi Resmi BMKG Deli Serdang\nWebsite: stageof-deliserdang.bmkg.go.id\nEmail: stageof.deliserdang@bmkg.go.id`;

    // LOGIKA MENU
    if (text === 'MENU' || text === 'HALO' || text === 'HI' || text === 'START') {
      replyMessage = header + 
        `Selamat datang di Layanan Otomatis Informasi dan Pelayanan Publik Stasiun Geofisika Kelas I Deli Serdang.\n\n` +
        `Silakan ketik nomor menu yang Anda butuhkan:\n\n` +
        `1. Informasi Gempabumi Terkini\n` +
        `2. Pelayanan Data dan Edukasi Publik\n` +
        `3. Informasi Pengamatan Geofisika\n` +
        `4. Layanan Pengaduan Masyarakat\n\n` +
        `Petunjuk: Ketik MENU kapan saja untuk kembali ke daftar menu utama.` + 
        footer;

    } else if (text === '1') {
      const bmkgRes = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
      const g = bmkgRes.data.Infogempa.gempa;
      
      replyMessage = header +
        `INFORMASI GEMPABUMI TERKINI (BMKG)\n\n` +
        `Waktu Kejadian: ${g.Tanggal} pukul ${g.Jam} WIB\n` +
        `Magnitudo: ${g.Magnitude}\n` +
        `Kedalaman: ${g.Kedalaman}\n` +
        `Koordinat: ${g.Coordinates}\n` +
        `Lokasi: ${g.Wilayah}\n` +
        `Potensi Tsunami: ${g.Potensi}\n` +
        `Dirasakan (MMI): ${g.Dirasakan || 'Tidak dirasakan / Dalam pendataan'}\n\n` +
        `Peta Goncangan (Shakemap):\nhttps://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` +
        footer;

    } else if (text === '2') {
      replyMessage = header +
        `PELAYANAN DATA DAN EDUKASI PUBLIK\n\n` +
        `Silakan ketik kode menu di bawah ini untuk informasi lebih lanjut:\n\n` +
        `2A - Permohonan Data Geofisika (Petir / Gempabumi)\n` +
        `2B - Permohonan Kunjungan Edukasi\n` +
        `2C - Tarif dan Ketentuan PNBP\n\n` +
        `Contoh: Ketik 2A lalu kirim.` +
        footer;

    } else if (text === '2A') {
      replyMessage = header +
        `PERMOHONAN DATA GEOFISIKA\n\n` +
        `Persyaratan permohonan data petir atau gempabumi:\n` +
        `1. Melampirkan Surat Permohonan Resmi ditujukan kepada Kepala Stasiun Geofisika Kelas I Deli Serdang.\n` +
        `2. Mengisi formulir permohonan data pada Pelayanan Terpadu Satu Pintu (PTSP).\n` +
        `3. Melampirkan identitas diri (KTP/KTM).\n\n` +
        `Pelayanan dilaksanakan pada jam kerja operasional (Senin - Jumat, 08.00 - 16.00 WIB).` +
        footer;

    } else if (text === '2B') {
      replyMessage = header +
        `PERMOHONAN KUNJUNGAN EDUKASI\n\n` +
        `Ketentuan permohonan kunjungan studi/lapangan:\n` +
        `1. Mengirimkan Surat Permohonan Kunjungan resmi dari Sekolah/Perguruan Tinggi minimal 7 hari kerja sebelum pelaksanaan.\n` +
        `2. Mencantumkan estimasi jumlah peserta dan dosen/guru pendamping.\n\n` +
        `Surat permohonan dikirimkan melalui email resmi: stageof.deliserdang@bmkg.go.id` +
        footer;

    } else if (text === '2C') {
      replyMessage = header +
        `TARIF DAN KETENTUAN PNBP\n\n` +
        `Tarif Pelayanan Jasa Meteorologi, Klimatologi, dan Geofisika diatur berdasarkan Peraturan Pemerintah Republik Indonesia Nomor 47 Tahun 2018 tentang Jenis dan Tarif atas Jenis Penerimaan Negara Bukan Pajak (PNBP) yang Berlaku pada BMKG.\n\n` +
        `Permohonan data untuk kegiatan keagamaan, bencana alam, dan tugas akhir pendidikan dapat dikenakan tarif Rp0 (nol rupiah) sesuai ketentuan syarat yang berlaku.` +
        footer;

    } else if (text === '3') {
      replyMessage = header +
        `INFORMASI PENGAMATAN GEOFISIKA\n\n` +
        `Stasiun Geofisika Kelas I Deli Serdang mengoperasikan sarana pengamatan geofisika meliputi:\n` +
        `1. Pengamatan Seismisitas (Gempabumi)\n` +
        `2. Pengamatan Petir (Lightning Detector)\n` +
        `3. Pengamatan Magnet Bumi (Magnetometer)\n` +
        `4. Pengamatan Tanda Waktu dan Hilal\n\n` +
        `Informasi publikasi berkala dapat diakses melalui kanal resmi BMKG.` +
        footer;

    } else if (text === '4') {
      replyMessage = header +
        `LAYANAN PENGADUAN MASYARAKAT\n\n` +
        `Sampaikan permohonan informasi atau pengaduan Anda melalui obrolan ini dengan format:\n\n` +
        `NAMA#LOKASI#ISI_PESAN\n\n` +
        `Contoh:\n` +
        `Budi#Deli Serdang#Mohon konfirmasi mengenai informasi gempabumi lokal terkini.\n\n` +
        `Petugas kami akan menindaklanjuti pesan Anda pada jam operasional kerja.` +
        footer;

    } else {
      replyMessage = header +
        `Pesan tidak dapat diproses.\n\n` +
        `Silakan ketik MENU untuk menampilkan pilihan layanan resmi Stasiun Geofisika Kelas I Deli Serdang.` +
        footer;
    }

    // Kirim balasan via Fonnte
    const fonnteToken = process.env.FONNTE_TOKEN || 'tQTBfHSeQoXKNwKSejPJ';
    await axios.post(
      'https://api.fonnte.com/send',
      {
        target: sender,
        message: replyMessage
      },
      {
        headers: {
          Authorization: fonnteToken
        }
      }
    );

    // Log pesan keluar
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
