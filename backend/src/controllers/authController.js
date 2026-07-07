import bcrypt from "bcrypt";
import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
} from "../utils/tokenService.js";

const REFRESH_COOKIE = "refreshToken";


const baseCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict", 
  path: "/api/auth", 
});

const cookieOptions = () => ({
  ...baseCookieOptions(),
  maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 7) * 24 * 60 * 60 * 1000,
});


const issueTokens = async (user, res) => {
  const refresh = generateRefreshToken();
  user.refreshTokens.push({
    tokenHash: hashToken(refresh),
    expiresAt: refreshTokenExpiry(),
  });
  await user.save();
  res.cookie(REFRESH_COOKIE, refresh, cookieOptions());
  return generateAccessToken(user._id);
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const accessToken = await issueTokens(user, res);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: accessToken,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user && (await bcrypt.compare(password, user.password))) {
      const accessToken = await issueTokens(user, res);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: accessToken,
      });
    }

    res.status(401).json({ message: "Invalid email or password" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// >> Refresh rotates the refresh token and aslo issues a new access token <<
export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];

    if (!token) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({ "refreshTokens.tokenHash": tokenHash });

    if (!user) {
   
      res.clearCookie(REFRESH_COOKIE, baseCookieOptions());
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const stored = user.refreshTokens.find((t) => t.tokenHash === tokenHash);

    // Rotation: the presented token is single-use, so remove it either way.
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.tokenHash !== tokenHash,
    );

    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      await user.save();
      res.clearCookie(REFRESH_COOKIE, baseCookieOptions());
      return res.status(401).json({ message: "Refresh token expired" });
    }

    
    const accessToken = await issueTokens(user, res);

    return res.json({ token: accessToken });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// >> Logout (revokes the current refresh token) <<
export const logoutUser = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];

    if (token) {
      const tokenHash = hashToken(token);
      await User.updateOne(
        { "refreshTokens.tokenHash": tokenHash },
        { $pull: { refreshTokens: { tokenHash } } },
      );
    }

    res.clearCookie(REFRESH_COOKIE, baseCookieOptions());
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
