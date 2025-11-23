import mongoose from 'mongoose';

const usageSchema = new mongoose.Schema({
  dailyUsed: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  plan: {
    type: String,
    enum: ['free', 'monthly', 'three_month'],
    default: 'free'
  },
  trialEnds: { type: Date, default: null },
  usage: { type: usageSchema, default: () => ({}) }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
