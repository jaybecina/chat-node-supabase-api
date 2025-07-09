export interface Room {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
}

export interface CreateRoomDTO {
  name: string;
  description?: string;
}

export interface UpdateRoomDTO {
  name?: string;
  description?: string;
}

export interface JoinRoomDTO {
  room_id: string;
}
