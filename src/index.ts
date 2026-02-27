import express from 'express';
import cors from 'cors';
import { identifyHandler } from './identify';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/identify', identifyHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});