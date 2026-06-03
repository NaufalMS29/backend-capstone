import 'dotenv/config';
import server from './server/index.js';

// Export untuk Vercel (serverless handler)
export default server;

// Jalankan server hanya saat development lokal
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 5000;
  const host = process.env.HOST || 'localhost';

  server.listen(port, () => {
    console.log(`🚀 Gateway Server running at http://${host}:${port}`);
  });
}
