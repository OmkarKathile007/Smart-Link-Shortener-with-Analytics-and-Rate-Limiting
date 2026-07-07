import bcrypt from "bcrypt";
import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
} from "../utils/tokenService.js";

const REFRESH_COOKIE = "refreshToken";

// Base attributes shared by set + clear. NOTE: no `maxAge` here — Express's
// clearCookie() would let maxAge override its expiry and the cookie would NOT
// be cleared. maxAge is added only when setting the cookie (see cookieOptions).
const baseCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict", // use "none" (+Secure) if our API & client are on different domains :)
  path: "/api/auth", // cookie only sent to /refresh and /logout
});

const cookieOptions = () => ({
  ...baseCookieOptions(),
  maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 7) * 24 * 60 * 60 * 1000,
});

// Issue an access token (returned in body) + a refresh token (httpOnly cookie).
// Only the hash of the refresh token is persisted on the user.
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

//>> Register <<
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
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
    res.status(500).json({
      message: err.message,
    });
  }
};

// >> Login <<
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      const accessToken = await issueTokens(user, res);

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: accessToken,
      });
    }

    res.status(401).json({
      message: "Invalid credentials",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
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
      // Unknown/already-rotated token — reject and clear the stale cookie.
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

    // issueTokens pushes the new refresh token and saves the user.
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
