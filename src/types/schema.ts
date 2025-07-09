export interface User {
  id: string;
  created_at: Date;
  email: string;
  username: string;
  avatar_url?: string;
  last_seen?: Date;
}

export interface Profile {
  user_id: string;
  full_name?: string;
  is_mentor: boolean;
  cohort_id?: string;
  track_id?: string;
}

export interface Message {
  id: string;
  created_at: Date;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at?: Date;
  attachments?: string[];
}

export interface Conversation {
  id: string;
  created_at: Date;
  title?: string;
  is_group: boolean;
  last_message_at?: Date;
  creator_id: string;
  type: "one_to_one" | "group";
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  joined_at: Date;
  role: "admin" | "member";
  last_read_at?: Date;
}

export interface Track {
  id: string;
  name: string;
  description?: string;
}

export interface Cohort {
  id: string;
  name: string;
  track_id: string;
  start_date: Date;
  end_date?: Date;
}

export interface UnreadCount {
  conversation_id: string;
  user_id: string;
  count: number;
}
