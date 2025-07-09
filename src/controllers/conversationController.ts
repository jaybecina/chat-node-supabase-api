import { Response } from "express";
import { supabase } from "../config/supabase";
import { AuthenticatedRequest } from "../types/express";

export const getAllConversations = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(
        `
      *,
      members:conversation_members(user_id, role),
      last_message:messages(content, created_at, sender:users(username))
    `
      )
      .eq("conversation_members.user_id", req.user.id)
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

export const createDirectConversation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { recipient_id } = req.body;

  if (!recipient_id) {
    return res.status(400).json({ error: "Recipient ID is required" });
  }

  try {
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("is_group", false)
      .eq("type", "one_to_one")
      .contains("member_ids", [req.user.id, recipient_id]);

    if (existing && existing.length > 0) {
      return res.json(existing[0]);
    }

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        creator_id: req.user.id,
        is_group: false,
        type: "one_to_one",
        member_ids: [req.user.id, recipient_id],
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("conversation_members").insert([
      {
        conversation_id: conversation.id,
        user_id: req.user.id,
        role: "member",
      },
      {
        conversation_id: conversation.id,
        user_id: recipient_id,
        role: "member",
      },
    ]);

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
};

export const createGroupConversation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, member_ids } = req.body;

  if (!title || !member_ids || !Array.isArray(member_ids)) {
    return res.status(400).json({ error: "Title and member IDs are required" });
  }

  try {
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        title,
        creator_id: req.user.id,
        is_group: true,
        type: "group",
        member_ids: [...member_ids, req.user.id],
      })
      .select()
      .single();

    if (error) throw error;

    const members = [...member_ids, req.user.id].map((userId) => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: userId === req.user?.id ? "admin" : "member",
    }));

    await supabase.from("conversation_members").insert(members);

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to create group conversation" });
  }
};

export const getMessagesForConversation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { conversationId } = req.params;
  const { before } = req.query;
  const limit = 50;

  try {
    const { data: member } = await supabase
      .from("conversation_members")
      .select()
      .eq("conversation_id", conversationId)
      .eq("user_id", req.user.id)
      .single();

    if (!member) {
      return res
        .status(403)
        .json({ error: "Not a member of this conversation" });
    }

    let query = supabase
      .from("messages")
      .select(
        `
      *,
      sender:users(id, username, avatar_url)
    `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", req.user.id);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const addMemberToConversation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { conversationId } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const { data: member } = await supabase
      .from("conversation_members")
      .select()
      .eq("conversation_id", conversationId)
      .eq("user_id", req.user.id)
      .eq("role", "admin")
      .single();

    if (!member) {
      return res.status(403).json({ error: "Only admins can add members" });
    }

    const { error } = await supabase.from("conversation_members").insert({
      conversation_id: conversationId,
      user_id: user_id,
      role: "member",
    });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to add member" });
  }
};
