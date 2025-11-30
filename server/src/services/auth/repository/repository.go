package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/diploma/auth-service/database"
	"github.com/diploma/auth-service/models"
	"github.com/jackc/pgx/v5"
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// User methods

func (r *Repository) CreateUser(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (login, password, surname, name, patronymic, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`

	err := r.db.Pool.QueryRow(
		ctx,
		query,
		user.Login,
		user.Password,
		user.Surname,
		user.Name,
		user.Patronymic,
		user.Status,
	).Scan(&user.ID)

	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("user with login %s already exists", user.Login)
		}
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (r *Repository) GetUserByLogin(ctx context.Context, login string) (*models.User, error) {
	query := `
		SELECT id, login, password, surname, name, patronymic, status
		FROM users
		WHERE login = $1
	`

	user := &models.User{}
	err := r.db.Pool.QueryRow(ctx, query, login).Scan(
		&user.ID,
		&user.Login,
		&user.Password,
		&user.Surname,
		&user.Name,
		&user.Patronymic,
		&user.Status,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id int) (*models.User, error) {
	query := `
		SELECT id, login, password, surname, name, patronymic, status
		FROM users
		WHERE id = $1
	`

	user := &models.User{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Login,
		&user.Password,
		&user.Surname,
		&user.Name,
		&user.Patronymic,
		&user.Status,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (r *Repository) UpdateUserStatus(ctx context.Context, userID int, status int) error {
	query := `UPDATE users SET status = $1 WHERE id = $2`
	_, err := r.db.Pool.Exec(ctx, query, status, userID)
	return err
}

// Administrator methods

func (r *Repository) CreateAdministrator(ctx context.Context, admin *models.Administrator) error {
	query := `
		INSERT INTO administrators (login, password)
		VALUES ($1, $2)
		RETURNING id
	`

	err := r.db.Pool.QueryRow(
		ctx,
		query,
		admin.Login,
		admin.Password,
	).Scan(&admin.ID)

	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("administrator with login %s already exists", admin.Login)
		}
		return fmt.Errorf("failed to create administrator: %w", err)
	}

	return nil
}

func (r *Repository) GetAdministratorByLogin(ctx context.Context, login string) (*models.Administrator, error) {
	query := `
		SELECT id, login, password
		FROM administrators
		WHERE login = $1
	`

	admin := &models.Administrator{}
	err := r.db.Pool.QueryRow(ctx, query, login).Scan(
		&admin.ID,
		&admin.Login,
		&admin.Password,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("administrator not found")
		}
		return nil, fmt.Errorf("failed to get administrator: %w", err)
	}

	return admin, nil
}

// RefreshToken methods

func (r *Repository) CreateRefreshToken(ctx context.Context, token *models.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (user_id, token, expires_at, revoked, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	err := r.db.Pool.QueryRow(
		ctx,
		query,
		token.UserID,
		token.Token,
		token.ExpiresAt,
		token.Revoked,
		token.Role,
	).Scan(&token.ID)

	if err != nil {
		return fmt.Errorf("failed to create refresh token: %w", err)
	}

	return nil
}

func (r *Repository) GetRefreshToken(ctx context.Context, token string) (*models.RefreshToken, error) {
	query := `
		SELECT id, user_id, token, expires_at, revoked, role
		FROM refresh_tokens
		WHERE token = $1
	`

	refreshToken := &models.RefreshToken{}
	err := r.db.Pool.QueryRow(ctx, query, token).Scan(
		&refreshToken.ID,
		&refreshToken.UserID,
		&refreshToken.Token,
		&refreshToken.ExpiresAt,
		&refreshToken.Revoked,
		&refreshToken.Role,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("refresh token not found")
		}
		return nil, fmt.Errorf("failed to get refresh token: %w", err)
	}

	return refreshToken, nil
}

func (r *Repository) RevokeRefreshToken(ctx context.Context, token string) error {
	query := `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`
	_, err := r.db.Pool.Exec(ctx, query, token)
	return err
}

func (r *Repository) RevokeAllUserTokens(ctx context.Context, userID int) error {
	query := `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE`
	_, err := r.db.Pool.Exec(ctx, query, userID)
	return err
}

func (r *Repository) CleanExpiredTokens(ctx context.Context) error {
	query := `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE`
	_, err := r.db.Pool.Exec(ctx, query)
	return err
}

// Helper function to check for unique violation
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return contains(errStr, "duplicate key") || contains(errStr, "unique constraint")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(len(substr) == 0 ||
			(len(s) > len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					containsMiddle(s, substr))))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
