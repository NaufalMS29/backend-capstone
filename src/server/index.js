import 'dotenv/config';
import express from 'express';
import routes from '../routes/index.js';
import cors from 'cors';
import ErrorHandler from '../middlewares/error.js';

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

app.use(express.json());
app.use(routes);
app.use(ErrorHandler);

export default app;