import 'dotenv/config';
import server from './server/index.js';

const port = process.env.PORT;
const host = process.env.HOST;

server.listen(port, () => {
  console.log(`🚀 Gateway Server running at http://${host}:${port}`);
});