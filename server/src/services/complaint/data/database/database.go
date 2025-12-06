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

	log.Println("Database connection established")
	return &DB{Pool: pool}, nil
}

// Close освобождает пул соединений.
func (db *DB) Close() {
	db.Pool.Close()
}
