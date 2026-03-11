export interface Participant {
  id:                 number;
  full_name:          string;
  email:              string;
  role:               string;
  avatar:             string | null;
  clinic_branch_name?: string;
}

export interface MessageItem {
  id:            number;
  conversation:  number;
  sender_id:     number;
  sender_name:   string;
  sender_avatar: string | null;
  body:          string;
  is_edited:     boolean;
  created_at:    string;
}

export interface Conversation {
  id:                number;
  clinic:            number;
  other_participant: Participant | null;
  last_message:      MessageItem | null;
  unread_count:      number;
  updated_at:        string;
}

export type WSIncomingEvent =
  | { type: 'chat_message';  message: MessageItem }
  | { type: 'typing';        user_id: number; name: string; is_typing: boolean }
  | { type: 'marked_read';   conversation: number }
  | { type: 'error';         error: string };