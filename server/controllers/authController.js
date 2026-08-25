import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const JWT_EXPIRES_IN = '7d';
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

function createToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ id: userId }, secret, { expiresIn: JWT_EXPIRES_IN });
}

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = createToken(user._id.toString());
    return res.status(201).json({ token, user: { name: user.name, email: user.email, headline: user.headline, location: user.location, bio: user.bio, phone: user.phone } });
  } catch (error) {
    console.error('Registration failed', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user._id.toString());
    return res.json({ token, user: { name: user.name, email: user.email, headline: user.headline, location: user.location, bio: user.bio, phone: user.phone } });
  } catch (error) {
    console.error('Login failed', error);
    return res.status(500).json({ message: 'Login failed' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select('name email headline location bio phone');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('Profile fetch failed', error);
    return res.status(500).json({ message: 'Profile fetch failed' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, headline, location, bio, phone } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (headline !== undefined) user.headline = headline;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;
    if (phone !== undefined) user.phone = phone;

    await user.save();
    return res.json({ user: { name: user.name, email: user.email, headline: user.headline, location: user.location, bio: user.bio, phone: user.phone } });
  } catch (error) {
    console.error('Profile update failed', error);
    return res.status(500).json({ message: 'Profile update failed' });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    if (!googleClientId || !googleClient) {
      return res.status(500).json({ message: 'Google client ID is not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const verified = payload?.email_verified;
    const googleId = payload?.sub;
    const name = payload?.name || '';

    if (!email || !verified || !googleId) {
      return res.status(401).json({ message: 'Unable to verify Google account' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        password: null,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = createToken(user._id.toString());
    return res.json({ token, user: { name: user.name, email: user.email, headline: user.headline, location: user.location, bio: user.bio, phone: user.phone } });
  } catch (error) {
    console.error('Google authentication failed', error);
    return res.status(401).json({ message: 'Google authentication failed' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If an account exists for that email, a reset link will be sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60);
    await user.save();

    return res.json({ message: 'Password reset token generated.', resetToken });
  } catch (error) {
    console.error('Forgot password failed', error);
    return res.status(500).json({ message: 'Forgot password failed' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password failed', error);
    return res.status(500).json({ message: 'Reset password failed' });
  }
};
