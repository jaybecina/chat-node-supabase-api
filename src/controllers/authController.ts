import { RequestHandler } from "express";
import { supabase } from "../config/supabase";

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.status(200).json({
    message: "Login successful",
    token: data.session?.access_token,
    user: data.user,
  });
};

export const register: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res
    .status(201)
    .json({ message: "User registered successfully", user: data.user });
};

export const logout: RequestHandler = async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();

  if (!token) {
    return res.status(400).json({ error: "No valid token provided" });
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(400).json({ error: "Failed to log out" });
  }

  res.status(200).json({ message: "Logged out successfully" });
};
