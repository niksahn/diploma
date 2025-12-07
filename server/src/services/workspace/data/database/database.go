package database

import (
	"context"
	"fmt"

	"github.com/diploma/workspace-service/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func NewDB(cfg *config.Config) (*DB, error) {
	connString := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	pool, err := pgxpool.New(context.Background(), connString)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Проверяем подключение
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Минимальный сид данных для тестов: пользователь с id=1,
	// чтобы не падали внешние ключи в userinworkspace.
	seedDefaultUser(context.Background(), pool)

	return &DB{Pool: pool}, nil
}

func (db *DB) Close() {
	db.Pool.Close()
}

// seedDefaultUser создает системного пользователя с id=1, если он отсутствует.
func seedDefaultUser(ctx context.Context, pool *pgxpool.Pool) {
	_, err := pool.Exec(ctx, `
		INSERT INTO users (id, login, password, status, surname, name)
		VALUES (1, 'system-user@example.com', 'placeholder', 0, 'System', 'User')
		ON CONFLICT (id) DO NOTHING
	`)
	if err != nil {
		// Логируем, но не блокируем запуск сервиса
		fmt.Printf("failed to seed default user: %v\n", err)
	}
}
