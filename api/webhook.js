const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Webhook endpoint active' });
  }

  const { sender, message } = req.body;
  if (!sender || !message) {
    return res.status(200).send('OK');
  }

  const text = message.trim().toUpperCase();

  try {
    await supabase.from('chat_logs').insert([
      { phone: sender, message: message, direction: 'incoming' }
    ]);

    let replyMessage = '';

    if (text === 'MENU' || text === 'HALO' || text === 'HI') {
      replyMessage = `Selamat datang di Layanan Informasi Stasiun Geofisika Kelas I Deli Serdang.\n\nSilakan pilih menu:\n1. Informasi Gempa Terkini\n2. Informasi Pelayanan Publik\n3. Bantuan / Layanan Pengaduan`;
    } else if (text === '1') {
      const bmkgRes = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
      const gempa = bmkgRes.data.Infogempa.gempa;
      replyMessage = `*INFORMASI GEMPA TERKINI (BMKG)*\n\nTanggal: ${gempa.Tanggal}\nJam: ${gempa.Jam}\nMagnitudo: ${gempa.Magnitude}\nKedalaman: ${gempa.Kedalaman}\nWilayah: ${gempa.Wilayah}\nPotensi: ${gempa.Potensi}`;
    } else if (text === '2') {
      replyMessage = `*LAYANAN INFORMASI GEOFISIKA*\n\n1. Permohonan Data Petir & Gempa\n2. Kunjungan Edukasi\n\nSilakan hubungi staf kami pada jam kerja operasional.`;
    } else {
      replyMessage = `Ketik *MENU* untuk melihat daftar layanan resmi Stasiun Geofisika Deli Serdang.`;
    }

    await axios.post(
      'https://api.fonnte.com/send',
      {
        target: sender,
        message: replyMessage
      },
      {
        headers: {
          Authorization: process.env.FONNTE_TOKEN
        }
      }
    );

    await supabase.from('chat_logs').insert([
      { phone: sender, message: replyMessage, direction: 'outgoing' }
    ]);

    return res.status(200).send('SUCCESS');
  } catch (err) {
    console.error('Error handling webhook:', err);
    return res.status(500).send('INTERNAL ERROR');
  }
};
