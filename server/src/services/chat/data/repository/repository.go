package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/diploma/chat-service/data/database"
	"github.com/diploma/chat-service/data/databaseModels"
	"github.com/jackc/pgx/v5"
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// Chat operations

// CreateChat создает новый чат
func (r *Repository) CreateChat(ctx context.Context, name string, chatType int, workspaceID int) (*databaseModels.Chat, error) {
	query := `
		INSERT INTO chats (name, type, workspacesid)
		VALUES ($1, $2, $3)
		RETURNING id, name, type, workspacesid
	`

	var chat databaseModels.Chat
	err := r.db.Pool.QueryRow(ctx, query, name, chatType, workspaceID).Scan(
		&chat.ID,
		&chat.Name,
		&chat.Type,
		&chat.WorkspaceID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create chat: %w", err)
	}

	return &chat, nil
}

// GetChatByID получает чат по ID
func (r *Repository) GetChatByID(ctx context.Context, chatID int) (*databaseModels.Chat, error) {
	query := `
		SELECT id, name, type, workspacesid
		FROM chats
		WHERE id = $1
	`

	var chat databaseModels.Chat
	err := r.db.Pool.QueryRow(ctx, query, chatID).Scan(
		&chat.ID,
		&chat.Name,
		&chat.Type,
		&chat.WorkspaceID,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("chat not found")
		}
		return nil, fmt.Errorf("failed to get chat: %w", err)
	}

	return &chat, nil
}

// UpdateChat обновляет настройки чата
func (r *Repository) UpdateChat(ctx context.Context, chatID int, name string) (*databaseModels.Chat, error) {
	query := `
		UPDATE chats
		SET name = $1
		WHERE id = $2
		RETURNING id, name, type, workspacesid
	`

	var chat databaseModels.Chat
	err := r.db.Pool.QueryRow(ctx, query, name, chatID).Scan(
		&chat.ID,
		&chat.Name,
		&chat.Type,
		&chat.WorkspaceID,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("chat not found")
		}
		return nil, fmt.Errorf("failed to update chat: %w", err)
	}

	return &chat, nil
}

// DeleteChat удаляет чат
func (r *Repository) DeleteChat(ctx context.Context, chatID int) error {
	query := `DELETE FROM chats WHERE id = $1`

	result, err := r.db.Pool.Exec(ctx, query, chatID)
	if err != nil {
		return fmt.Errorf("failed to delete chat: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("chat not found")
	}

	return nil
}

// GetUserChats получает список чатов пользователя
func (r *Repository) GetUserChats(ctx context.Context, userID int, workspaceID *int, chatType *int) ([]databaseModels.Chat, error) {
	var query string
	var args []interface{}

	if workspaceID != nil && chatType != nil {
		query = `
			SELECT DISTINCT c.id, c.name, c.type, c.workspacesid
			FROM chats c
			INNER JOIN "userinchat" uic ON c.id = uic.chatsid
			WHERE uic.usersid = $1 AND c.workspacesid = $2 AND c.type = $3
			ORDER BY c.id
		`
		args = []interface{}{userID, *workspaceID, *chatType}
	} else if workspaceID != nil {
		query = `
			SELECT DISTINCT c.id, c.name, c.type, c.workspacesid
			FROM chats c
			INNER JOIN "userinchat" uic ON c.id = uic.chatsid
			WHERE uic.usersid = $1 AND c.workspacesid = $2
			ORDER BY c.id
		`
		args = []interface{}{userID, *workspaceID}
	} else if chatType != nil {
		query = `
			SELECT DISTINCT c.id, c.name, c.type, c.workspacesid
			FROM chats c
			INNER JOIN "userinchat" uic ON c.id = uic.chatsid
			WHERE uic.usersid = $1 AND c.type = $2
			ORDER BY c.id
		`
		args = []interface{}{userID, *chatType}
	} else {
		query = `
			SELECT DISTINCT c.id, c.name, c.type, c.workspacesid
			FROM chats c
			INNER JOIN "userinchat" uic ON c.id = uic.chatsid
			WHERE uic.usersid = $1
			ORDER BY c.id
		`
		args = []interface{}{userID}
	}

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get user chats: %w", err)
	}
	defer rows.Close()

	var chats []databaseModels.Chat
	for rows.Next() {
		var chat databaseModels.Chat
		err := rows.Scan(
			&chat.ID,
			&chat.Name,
			&chat.Type,
			&chat.WorkspaceID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan chat: %w", err)
		}
		chats = append(chats, chat)
	}

	return chats, nil
}

// UserInChat operations

// AddUserToChat добавляет пользователя в чат
func (r *Repository) AddUserToChat(ctx context.Context, chatID, userID, role int) error {
	query := `
		INSERT INTO "userinchat" (chatsid, usersid, role, date)
		VALUES ($1, $2, $3, CURRENT_DATE)
		ON CONFLICT DO NOTHING
	`

	_, err := r.db.Pool.Exec(ctx, query, chatID, userID, role)
	if err != nil {
		return fmt.Errorf("failed to add user to chat: %w", err)
	}

	return nil
}

// RemoveUserFromChat удаляет пользователя из чата
func (r *Repository) RemoveUserFromChat(ctx context.Context, chatID, userID int) error {
	query := `DELETE FROM "userinchat" WHERE chatsid = $1 AND usersid = $2`

	result, err := r.db.Pool.Exec(ctx, query, chatID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove user from chat: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found in chat")
	}

	return nil
}

// UpdateUserRoleInChat обновляет роль пользователя в чате
func (r *Repository) UpdateUserRoleInChat(ctx context.Context, chatID, userID, role int) error {
	query := `
		UPDATE "userinchat"
		SET role = $1
		WHERE chatsid = $2 AND usersid = $3
	`

	result, err := r.db.Pool.Exec(ctx, query, role, chatID, userID)
	if err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found in chat")
	}

	return nil
}

// GetChatMembers получает список участников чата
type ChatMember struct {
	ID         int
	UserID     int
	Login      string
	Name       string
	Surname    string
	Patronymic *string
	Status     int
	Role       int
	JoinedAt   time.Time
}

func (r *Repository) GetChatMembers(ctx context.Context, chatID int) ([]ChatMember, error) {
	query := `
		SELECT uic.id, u.id, u.login, u.name, u.surname, u.patronymic, u.status, uic.role, uic.date
		FROM "userinchat" uic
		INNER JOIN users u ON uic.usersid = u.id
		WHERE uic.chatsid = $1
		ORDER BY u.surname, u.name
	`

	rows, err := r.db.Pool.Query(ctx, query, chatID)
	if err != nil {
		return nil, fmt.Errorf("failed to get chat members: %w", err)
	}
	defer rows.Close()

	var members []ChatMember
	for rows.Next() {
		var member ChatMember
		var patronymic sql.NullString
		err := rows.Scan(
			&member.ID,
			&member.UserID,
			&member.Login,
			&member.Name,
			&member.Surname,
			&patronymic,
			&member.Status,
			&member.Role,
			&member.JoinedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan member: %w", err)
		}
		if patronymic.Valid {
			member.Patronymic = &patronymic.String
		}
		members = append(members, member)
	}

	return members, nil
}

// IsUserInChat проверяет, является ли пользователь участником чата
func (r *Repository) IsUserInChat(ctx context.Context, userID, chatID int) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM "userinchat"
		WHERE usersid = $1 AND chatsid = $2
	`

	var isMember bool
	err := r.db.Pool.QueryRow(ctx, query, userID, chatID).Scan(&isMember)
	if err != nil {
		return false, fmt.Errorf("failed to check user in chat: %w", err)
	}

	return isMember, nil
}

// GetUserRoleInChat получает роль пользователя в чате
func (r *Repository) GetUserRoleInChat(ctx context.Context, userID, chatID int) (int, error) {
	query := `
		SELECT role
		FROM "userinchat"
		WHERE usersid = $1 AND chatsid = $2
	`

	var role int
	err := r.db.Pool.QueryRow(ctx, query, userID, chatID).Scan(&role)
	if err != nil {
		if err == pgx.ErrNoRows {
			return 0, fmt.Errorf("user not in chat")
		}
		return 0, fmt.Errorf("failed to get user role: %w", err)
	}

	return role, nil
}

// CountAdminsInChat считает количество администраторов в чате
func (r *Repository) CountAdminsInChat(ctx context.Context, chatID int) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM "userinchat"
		WHERE chatsid = $1 AND role = 2
	`

	var count int
	err := r.db.Pool.QueryRow(ctx, query, chatID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count admins: %w", err)
	}

	return count, nil
}

// IsUserInWorkspace проверяет, является ли пользователь участником рабочего пространства
func (r *Repository) IsUserInWorkspace(ctx context.Context, userID, workspaceID int) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM "userinworkspace"
		WHERE usersid = $1 AND workspacesid = $2
	`

	var isMember bool
	err := r.db.Pool.QueryRow(ctx, query, userID, workspaceID).Scan(&isMember)
	if err != nil {
		return false, fmt.Errorf("failed to check user in workspace: %w", err)
	}

	return isMember, nil
}

// WorkspaceExists проверяет наличие рабочего пространства
func (r *Repository) WorkspaceExists(ctx context.Context, workspaceID int) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM workspaces
		WHERE id = $1
	`

	var exists bool
	if err := r.db.Pool.QueryRow(ctx, query, workspaceID).Scan(&exists); err != nil {
		return false, fmt.Errorf("failed to check workspace existence: %w", err)
	}

	return exists, nil
}

// Message operations

// CreateMessage создает новое сообщение
func (r *Repository) CreateMessage(ctx context.Context, chatID, userID int, text string) (*databaseModels.Message, error) {
	now := int(time.Now().Unix())

	// Инициализируем статус как пустой JSON объект
	statusJSON := "{}"

	query := `
		INSERT INTO messages (chatsid, usersid, text, date, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, chatsid, usersid, text, date, status
	`

	var message databaseModels.Message
	err := r.db.Pool.QueryRow(ctx, query, chatID, userID, text, now, statusJSON).Scan(
		&message.ID,
		&message.ChatID,
		&message.UserID,
		&message.Text,
		&message.Date,
		&message.Status,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	return &message, nil
}

// GetMessageByID получает сообщение по ID
func (r *Repository) GetMessageByID(ctx context.Context, messageID int) (*databaseModels.Message, error) {
	query := `
		SELECT id, chatsid, usersid, text, date, status
		FROM messages
		WHERE id = $1
	`

	var message databaseModels.Message
	err := r.db.Pool.QueryRow(ctx, query, messageID).Scan(
		&message.ID,
		&message.ChatID,
		&message.UserID,
		&message.Text,
		&message.Date,
		&message.Status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("message not found")
		}
		return nil, fmt.Errorf("failed to get message: %w", err)
	}

	return &message, nil
}

// UpdateMessage обновляет текст сообщения
func (r *Repository) UpdateMessage(ctx context.Context, messageID int, text string) (*databaseModels.Message, error) {
	query := `
		UPDATE messages
		SET text = $1
		WHERE id = $2
		RETURNING id, chatsid, usersid, text, date, status
	`

	var message databaseModels.Message
	err := r.db.Pool.QueryRow(ctx, query, text, messageID).Scan(
		&message.ID,
		&message.ChatID,
		&message.UserID,
		&message.Text,
		&message.Date,
		&message.Status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("message not found")
		}
		return nil, fmt.Errorf("failed to update message: %w", err)
	}

	return &message, nil
}

// DeleteMessage удаляет сообщение
func (r *Repository) DeleteMessage(ctx context.Context, messageID int) error {
	query := `DELETE FROM messages WHERE id = $1`

	result, err := r.db.Pool.Exec(ctx, query, messageID)
	if err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("message not found")
	}

	return nil
}

// GetChatMessages получает историю сообщений чата
type MessageWithUser struct {
	ID       int
	ChatID   int
	UserID   int
	UserName string
	Text     string
	Date     int
	Status   string
}

func (r *Repository) GetChatMessages(ctx context.Context, chatID int, limit, offset int, before *int) ([]MessageWithUser, error) {
	var query string
	var args []interface{}

	if before != nil {
		query = `
			SELECT m.id, m.chatsid, m.usersid, 
			       COALESCE(u.surname || ' ' || u.name, 'Unknown') as user_name,
			       m.text, m.date, m.status
			FROM messages m
			LEFT JOIN users u ON m.usersid = u.id
			WHERE m.chatsid = $1 AND m.date < $2
			ORDER BY m.date DESC
			LIMIT $3 OFFSET $4
		`
		args = []interface{}{chatID, *before, limit, offset}
	} else {
		query = `
			SELECT m.id, m.chatsid, m.usersid,
			       COALESCE(u.surname || ' ' || u.name, 'Unknown') as user_name,
			       m.text, m.date, m.status
			FROM messages m
			LEFT JOIN users u ON m.usersid = u.id
			WHERE m.chatsid = $1
			ORDER BY m.date DESC
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{chatID, limit, offset}
	}

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}
	defer rows.Close()

	var messages []MessageWithUser
	for rows.Next() {
		var msg MessageWithUser
		err := rows.Scan(
			&msg.ID,
			&msg.ChatID,
			&msg.UserID,
			&msg.UserName,
			&msg.Text,
			&msg.Date,
			&msg.Status,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		messages = append(messages, msg)
	}

	return messages, nil
}

// GetLastMessage получает последнее сообщение в чате
func (r *Repository) GetLastMessage(ctx context.Context, chatID int) (*MessageWithUser, error) {
	query := `
		SELECT m.id, m.chatsid, m.usersid,
		       COALESCE(u.surname || ' ' || u.name, 'Unknown') as user_name,
		       m.text, m.date, m.status
		FROM messages m
		LEFT JOIN users u ON m.usersid = u.id
		WHERE m.chatsid = $1
		ORDER BY m.date DESC
		LIMIT 1
	`

	var msg MessageWithUser
	err := r.db.Pool.QueryRow(ctx, query, chatID).Scan(
		&msg.ID,
		&msg.ChatID,
		&msg.UserID,
		&msg.UserName,
		&msg.Text,
		&msg.Date,
		&msg.Status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // Нет сообщений
		}
		return nil, fmt.Errorf("failed to get last message: %w", err)
	}

	return &msg, nil
}

// MarkMessagesAsRead отмечает сообщения как прочитанные
func (r *Repository) MarkMessagesAsRead(ctx context.Context, chatID, userID, lastMessageID int) (int, error) {
	// Обновляем все непрочитанные сообщения до lastMessageID
	// Используем CAST для преобразования text в jsonb
	query := `
		UPDATE messages
		SET status = jsonb_set(
			COALESCE(status::jsonb, '{}'::jsonb),
			$1::text[],
			'true'::jsonb
		)::text
		WHERE chatsid = $2
		  AND id <= $3
		  AND (COALESCE(status::jsonb->>$4, 'false') = 'false' OR status::jsonb->>$4 IS NULL)
	`

	key := fmt.Sprintf("read_%d", userID)
	keyPath := []string{key}
	result, err := r.db.Pool.Exec(ctx, query, keyPath, chatID, lastMessageID, key)
	if err != nil {
		return 0, fmt.Errorf("failed to mark messages as read: %w", err)
	}

	return int(result.RowsAffected()), nil
}

// CountUnreadMessages считает непрочитанные сообщения для пользователя
func (r *Repository) CountUnreadMessages(ctx context.Context, chatID, userID int) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM messages
		WHERE chatsid = $1
		  AND (status::jsonb->>$2 IS NULL OR status::jsonb->>$2 = 'false')
	`

	key := fmt.Sprintf("read_%d", userID)
	var count int
	err := r.db.Pool.QueryRow(ctx, query, chatID, key).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count unread messages: %w", err)
	}

	return count, nil
}
