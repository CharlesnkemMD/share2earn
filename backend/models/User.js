const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['referral', 'withdrawal', 'tier-upgrade'], required: true },
  amount: { type: Number, required: true },
  description: String,
  date: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  referralCode: { type: String, unique: true },
  referredBy: { type: String, default: null },
  referrals: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  tier: { type: Number, default: 1 }, // 1, 2, 3
  verified: { type: Boolean, default: false },
  role: { type: String, default: 'user' }, // 'user' or 'admin'
  transactions: [TransactionSchema]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);