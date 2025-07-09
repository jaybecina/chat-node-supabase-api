import { Response } from "express";
import { supabase } from "../config/supabase";
import { CreateRoomDTO, UpdateRoomDTO } from "../types/room";
import { AuthenticatedRequest } from "../types/express";

export const createRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description }: CreateRoomDTO = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        name,
        description,
        created_by: user_id,
      })
      .select()
      .single();

    if (error) throw error;

    // Automatically add creator as a room member
    const { error: memberError } = await supabase.from("room_members").insert({
      room_id: room.id,
      user_id,
    });

    if (memberError) throw memberError;

    res.status(201).json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllRooms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: rooms, error } = await supabase
      .from("rooms")
      .select("*, room_members(user_id)");

    if (error) throw error;

    res.json(rooms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoomById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { data: room, error } = await supabase
      .from("rooms")
      .select("*, room_members(user_id)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!room) return res.status(404).json({ error: "Room not found" });

    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description }: UpdateRoomDTO = req.body;
    const user_id = req.user?.id;

    // Check if user owns the room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("id", id)
      .single();

    if (roomError) throw roomError;
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.created_by !== user_id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this room" });
    }

    const { data: updatedRoom, error } = await supabase
      .from("rooms")
      .update({ name, description })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(updatedRoom);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    // Check if user owns the room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("id", id)
      .single();

    if (roomError) throw roomError;
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.created_by !== user_id) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this room" });
    }

    // Delete room (this will cascade delete room members due to foreign key constraint)
    const { error } = await supabase.from("rooms").delete().eq("id", id);

    if (error) throw error;

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const joinRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    // Check if room exists
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("id", id)
      .single();

    if (roomError) throw roomError;
    if (!room) return res.status(404).json({ error: "Room not found" });

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from("room_members")
      .select()
      .eq("room_id", id)
      .eq("user_id", user_id)
      .single();

    if (memberError && memberError.code !== "PGRST116") throw memberError;
    if (existingMember) {
      return res.status(400).json({ error: "Already a member of this room" });
    }

    // Add user to room
    const { error } = await supabase.from("room_members").insert({
      room_id: id,
      user_id,
    });

    if (error) throw error;

    res.status(200).json({ message: "Successfully joined room" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const leaveRoom = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    // Check if user is a member
    const { data: member, error: memberError } = await supabase
      .from("room_members")
      .select()
      .eq("room_id", id)
      .eq("user_id", user_id)
      .single();

    if (memberError) throw memberError;
    if (!member) {
      return res.status(400).json({ error: "Not a member of this room" });
    }

    // Remove user from room
    const { error } = await supabase
      .from("room_members")
      .delete()
      .eq("room_id", id)
      .eq("user_id", user_id);

    if (error) throw error;

    res.status(200).json({ message: "Successfully left room" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
