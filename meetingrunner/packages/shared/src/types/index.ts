export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'member';

export interface Board {
  id: string;
  title: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardWithDetails extends Board {
  lists: ListWithCards[];
  members: User[];
}

export interface BoardMember {
  boardId: string;
  userId: string;
}

export interface List {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListWithCards extends List {
  cards: CardSummary[];
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description: Record<string, unknown> | null;
  position: number;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardSummary extends Card {
  assignees: User[];
  commentCount: number;
  attachmentCount: number;
}

export interface CardDetail extends Card {
  assignees: User[];
  comments: Comment[];
  attachments: Attachment[];
}

export interface Comment {
  id: string;
  cardId: string;
  parentId: string | null;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  replies?: Comment[];
}

export interface Attachment {
  id: string;
  cardId: string;
  uploadedBy: string;
  filename: string;
  fileKey: string;
  fileSize: number;
  mimeType: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  cardId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'card_assigned'
  | 'comment_added'
  | 'due_approaching'
  | 'due_overdue';

// API request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface CreateBoardRequest {
  title: string;
  description?: string;
}

export interface CreateListRequest {
  title: string;
}

export interface CreateCardRequest {
  title: string;
  description?: unknown;
  dueDate?: string;
}

export interface MoveCardRequest {
  targetListId: string;
  position: number;
}

export interface ReorderRequest {
  orderedIds: string[];
}

export interface CreateCommentRequest {
  body: string;
  parentId?: string;
}

export interface InviteUserRequest {
  email: string;
  displayName: string;
  role?: UserRole;
}

export interface PresignRequest {
  filename: string;
  mimeType: string;
}

export interface PresignResponse {
  uploadUrl: string;
  fileKey: string;
}

export interface ConfirmAttachmentRequest {
  fileKey: string;
  filename: string;
  fileSize: number;
  mimeType: string;
}

// Socket event types
export interface SocketEvents {
  'card:created': { card: CardSummary; listId: string };
  'card:updated': { card: CardSummary };
  'card:moved': { cardId: string; fromListId: string; toListId: string; position: number };
  'card:deleted': { cardId: string; listId: string };
  'list:created': { list: List };
  'list:updated': { list: List };
  'list:reordered': { boardId: string; orderedIds: string[] };
  'list:deleted': { listId: string; boardId: string };
  'comment:created': { comment: Comment; cardId: string };
  'comment:updated': { comment: Comment };
  'comment:deleted': { commentId: string; cardId: string };
  'member:added': { boardId: string; user: User };
  'member:removed': { boardId: string; userId: string };
  'notification:new': { notification: Notification };
}

// Trello import types
export interface TrelloBoard {
  name: string;
  desc?: string;
  lists: TrelloList[];
  cards: TrelloCard[];
  actions?: TrelloAction[];
}

export interface TrelloList {
  id: string;
  name: string;
  pos: number;
  closed: boolean;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc?: string;
  idList: string;
  due: string | null;
  pos: number;
  closed: boolean;
}

export interface TrelloAction {
  type: string;
  data: Record<string, unknown>;
  date: string;
  memberCreator?: { fullName: string };
}

export interface ImportResult {
  boardId: string;
  boardTitle: string;
  listsCreated: number;
  cardsCreated: number;
  commentsCreated: number;
  errors: string[];
}
