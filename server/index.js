require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let dbConnected = false;
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => { dbConnected = true; console.log('MongoDB connected'); })
    .catch(err => console.error('MongoDB error:', err.message));
}

const SpinSchema = new mongoose.Schema({
  walletAddress: String,
  bet: Number,
  lines: Number,
  reels: Array,
  winAmount: Number,
  freeSpins: Number,
  timestamp: { type: Date, default: Date.now }
});
const Spin = mongoose.model('Spin', SpinSchema);

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: dbConnected }));

app.post('/api/spin/save', async (req, res) => {
  if (!dbConnected) return res.json({ saved: false });
  try {
    await new Spin(req.body).save();
    res.json({ saved: true });
  } catch (e) {
    res.json({ saved: false, error: e.message });
  }
});

app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.listen(PORT, () => console.log(`Slots server on port ${PORT}`));
