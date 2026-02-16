const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, ref } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashed,
      referralCode: username,
      referredBy: ref || null
    });

    res.json({ msg: 'Registered successfully', userId: user._id });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        tier: user.tier,
        verified: user.verified,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Upgrade Tier
router.post('/upgrade-tier', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const costs = { 1: 7000, 2: 12000, 3: 35000 };
    const nextTier = user.tier + 1;

    if (nextTier > 3) {
      return res.status(400).json({ msg: 'Already at maximum tier' });
    }

    if (user.balance < costs[nextTier]) {
      return res.status(400).json({ 
        msg: 'Insufficient balance for upgrade',
        required: costs[nextTier],
        current: user.balance
      });
    }

    user.balance -= costs[nextTier];
    user.tier = nextTier;

    user.transactions.push({
      type: 'tier-upgrade',
      amount: costs[nextTier],
      description: `Upgraded to Tier ${nextTier}`
    });

    await user.save();

    res.json({ 
      msg: `Successfully upgraded to Tier ${nextTier}`,
      tier: user.tier,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Get Transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('transactions');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user.transactions);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

module.exports = router;