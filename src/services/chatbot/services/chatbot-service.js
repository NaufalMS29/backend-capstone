import fastApiClient from '../../../config/fastapi.js';
import ChatbotRepository from '../repositories/chatbot-repositories.js';

class ChatbotService {
  constructor() {
    this._repository = new ChatbotRepository();
  }

  async createNewChatSession(userId, title) {
    return await this._repository.createSession(userId, title);
  }

  // 2. PASTIKAN FUNGSI INI JUGA ADA UNTUK GET SESSIONS
  async getUserChatSessions(userId) {
    return await this._repository.getSessionsByUserId(userId);
  }

  async getSessionById(sessionId) {
    const query = {
      text: 'SELECT * FROM chat_sessions WHERE id = $1',
      values: [sessionId],
    };
    const result = await this._pool.query(query);
    return result.rows[0]; // Mengembalikan data sesi atau undefined jika tidak ketemu
  }

  // 2. Fungsi untuk mengupdate token session dari FastAPI ke database lokal
  async updateFastapiSessionId(sessionId, fastapiSessionId) {
    const query = {
      text: 'UPDATE chat_sessions SET fastapi_session_id = $2 WHERE id = $1 RETURNING *',
      values: [sessionId, fastapiSessionId],
    };
    const result = await this._pool.query(query);
    return result.rows[0];
  }

  async getChatHistory(sessionId) {
    // Ambil riwayat pesan berdasarkan sessionId dari repository
    const messages = await this._repository.getMessagesBySessionId(sessionId);

    // Petakan hasilnya agar formatnya rapi saat diterima Frontend
    return messages.map((msg) => ({
      sender: msg.sender,     // 'user' atau 'bot'
      message: msg.message,   // Isi teks pesan
      created_at: msg.created_at
    }));
  }

  async clearUserChatData(userId) {
    // 1. Hapus semua isi chatnya
    await this._repository.deleteMessagesByUserId(userId);

    // 2. Hapus juga sesi judulnya (aktifkan jika ingin sidebar-nya ikut bersih saat logout)
    await this._repository.deleteSessionsByUserId(userId);

    return true;
  }

  async sendMessageToAi(userId, sessionId, userMessage) {
    // 1. Simpan pesan user ke database lokal
    await this._repository.saveMessage(sessionId, 'user', userMessage);

    // 2. Ambil data session lokal untuk mengecek fastapi_session_id
    const sessionData = await this._repository.getSessionById(sessionId);
    const fastapiSessionId = sessionData?.fastapi_session_id || null;

    // 3. FITUR RAG: Cari data wilayah di DB berdasarkan pesan user
    const contextData = await this._extractContextFromMessage(userMessage);

    // 4. Susun Payload ke FastAPI
    const fastapiPayload = {
      session_id: fastapiSessionId,
      message: userMessage,
      context_data: contextData ? {
        nama_wilayah: contextData.nama_wilayah,
        total_siswa: Number(contextData.total_siswa),
        jumlah_sppg_prediksi: Number(contextData.jumlah_sppg_prediksi),
        kebutuhan_sppg: parseFloat(contextData.kebutuhan_sppg),
        gap_prediksi: parseFloat(contextData.gap_prediksi),
        status: contextData.status,
        interpretasi: contextData.interpretasi
      } : {}
    };

    // 5. Tembak FastAPI
    const responseAi = await fastApiClient.post('/chat', fastapiPayload);

    // --- KODE PERBAIKAN STRUKTUR ARRAY FASTAPI DI SINI ---
    const chatHistoryFromAi = responseAi.data || [];
    let botReply = 'Maaf, saya tidak dapat memproses jawaban saat ini.';
    let newFastapiSessionId = null;

    // Ekstrak chat terakhir (assistant) dari array response FastAPI
    if (Array.isArray(chatHistoryFromAi) && chatHistoryFromAi.length > 0) {
      const lastMessage = chatHistoryFromAi[chatHistoryFromAi.length - 1];
      botReply = lastMessage.content || botReply;
    } else if (responseAi.data?.reply) {
      botReply = responseAi.data.reply;
    }

    // Ambil session_id baru dari FastAPI (jika dilempar di root/header objek)
    if (responseAi.data?.session_id) {
      newFastapiSessionId = responseAi.data.session_id;
    }

    // Jika FastAPI memberikan session_id baru dan di DB kita masih kosong, lakukan update
    if (newFastapiSessionId && !fastapiSessionId) {
      await this._repository.updateFastapiSessionId(sessionId, newFastapiSessionId);
    }
    // -----------------------------------------------------

    // 6. Simpan balasan bot ke database lokal
    await this._repository.saveMessage(sessionId, 'bot', botReply);

    return {
      sender: 'bot',
      message: botReply,
      context_used: contextData ? contextData.nama_wilayah : null
    };
  }

  async sendPublicMessageToAi(userMessage, clientFastapiSessionId = null) {
    // 1. Cari data wilayah dengan helper yang sudah diperbaiki
    const contextData = await this._extractContextFromMessage(userMessage);

    // 2. Susun payload ke FastAPI sesuai skema Swagger
    const fastapiPayload = {
      session_id: clientFastapiSessionId,
      message: userMessage,
      context_data: contextData ? {
        nama_wilayah: contextData.nama_wilayah,
        total_siswa: Number(contextData.total_siswa),
        jumlah_sppg_prediksi: Number(contextData.jumlah_sppg_prediksi),
        kebutuhan_sppg: parseFloat(contextData.kebutuhan_sppg),
        gap_prediksi: parseFloat(contextData.gap_prediksi),
        status: contextData.status,
        interpretasi: contextData.interpretasi
      } : {}
    };

    // 3. Tembak FastAPI
    const responseAi = await fastApiClient.post('/chat', fastapiPayload);

    // PERBAIKAN: Menyesuaikan ekstraksi array response dari FastAPI Anda
    const chatHistoryFromAi = responseAi.data || [];
    let botReply = 'Halo! Ada yang bisa saya bantu?';
    let activeSessionId = clientFastapiSessionId;

    // Jika response berupa array history chat (seperti di Swagger)
    if (Array.isArray(chatHistoryFromAi) && chatHistoryFromAi.length > 0) {
      const lastMessage = chatHistoryFromAi[chatHistoryFromAi.length - 1];
      botReply = lastMessage.content || botReply; // Ambil properti 'content' dari AI
    } else if (responseAi.data?.reply) {
      // Antisipasi jika formatnya objek single response
      botReply = responseAi.data.reply;
    }

    // Ambil session_id yang dilempar balik oleh FastAPI (jika ada di root response/header)
    if (responseAi.data?.session_id) {
      activeSessionId = responseAi.data.session_id;
    }

    return {
      sender: 'bot',
      message: botReply,
      fastapi_session_id: activeSessionId,
      context_used: contextData ? contextData.nama_wilayah : null
    };
  }

  async _extractContextFromMessage(message) {
    // Daftar kata sambung yang harus diabaikan agar tidak salah mencocokkan nama kota/daerah
    const stopWords = ['dan', 'dari', 'yang', 'pada', 'bisa', 'ada', 'atau', 'untuk', 'dengan', 'saya', 'sebaran', 'hasil', 'prediksi', 'analisis', 'wilayah', 'kondisi', 'kelayakan'];

    const words = message.split(/\s+/); // Split berdasarkan spasi

    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase(); // Bersihkan tanda baca & buat lowercase

      // Hanya cari di DB jika panjang kata > 3 karakter DAN bukan termasuk kata sambung (stop-words)
      if (cleanWord.length > 3 && !stopWords.includes(cleanWord)) {
        const foundData = await this._repository.findContextData(cleanWord);
        if (foundData) {
          return foundData; // Langsung kembalikan jika benar-benar nama daerah yang valid di DB
        }
      }
    }
    return null;
  }
}

export default ChatbotService;