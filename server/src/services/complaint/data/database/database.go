package database

import (
	"context"
	"fmt"
	"log"

	"github.com/diploma/complaint-service/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DB обертка над пулом соединений.
type DB struct {
	Pool *pgxpool.Pool
}

// NewDB открывает соединение с PostgreSQL.
func NewDB(cfg *config.Config) (*DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Обновляем/создаем необходимые таблицы и колонки
	if err := ensureSchema(pool); err != nil {
		return nil, fmt.Errorf("failed to ensure schema: %w", err)
	}

	log.Println("Database connection established")
	return &DB{Pool: pool}, nil
}

// Close освобождает пул соединений.
func (db *DB) Close() {
	db.Pool.Close()
}

// ensureSchema приводит структуру БД к ожидаемой тестами
func ensureSchema(pool *pgxpool.Pool) error {
	schemaSQL := `
CREATE TABLE IF NOT EXISTS complaints (
	id SERIAL PRIMARY KEY,
	text VARCHAR(255) NOT NULL,
	date DATE NOT NULL DEFAULT CURRENT_DATE,
	devicedescription VARCHAR(255) NOT NULL,
	author INT4 NOT NULL,
	status VARCHAR(50) NOT NULL DEFAULT 'pending',
	created_at TIMESTAMP NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_status_history (
	id SERIAL PRIMARY KEY,
	complaint_id INT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
	status VARCHAR(50) NOT NULL,
	comment TEXT,
	changed_by INT,
	created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Добавляем недостающие колонки, если таблица уже существовала
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_complaints_author ON complaints(author);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
`
	_, err := pool.Exec(context.Background(), schemaSQL)
	return err
}
