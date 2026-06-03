import 'dotenv/config';
import express from 'express';
import routes from '../routes/index.js';
import cors from 'cors';
import ErrorHandler from '../middlewares/error.js';

const app = express();

app.use(cors());
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.sendStatus(200);
});
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(routes);
app.use(ErrorHandler);

export default app;