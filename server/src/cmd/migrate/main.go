// Package main runs database migrations (golang-migrate).
// Usage:
//
//	up (default): migrate -database "postgres://..." up
//	down:         migrate -database "postgres://..." down 1
//	force V:      migrate -database "postgres://..." force V
//	version:      migrate -database "postgres://..." version
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "user")
	dbPassword := getEnv("DB_PASSWORD", "password")
	dbName := getEnv("DB_NAME", "messenger_db")
	dbSSL := getEnv("DB_SSLMODE", "disable")

	path := flag.String("path", "migrations", "path to migrations directory")
	flag.Parse()

	args := flag.Args()
	cmd := "up"
	if len(args) > 0 {
		cmd = args[0]
	}

	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		dbUser, dbPassword, dbHost, dbPort, dbName, dbSSL)

	m, err := migrate.New("file://"+*path, dsn)
	if err != nil {
		log.Fatalf("migrate.New: %v", err)
	}
	defer m.Close()

	switch cmd {
	case "up":
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("migrate up: %v", err)
		}
		if err == migrate.ErrNoChange {
			log.Println("No migrations to apply (already up to date).")
		} else {
			log.Println("Migrations applied successfully.")
		}
	case "down":
		steps := 1
		if len(args) >= 2 {
			if n, err := strconv.Atoi(args[1]); err == nil && n > 0 {
				steps = n
			}
		}
		if err := m.Steps(-steps); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("migrate down: %v", err)
		}
		log.Printf("Rolled back %d migration(s).", steps)
	case "force":
		if len(args) < 2 {
			log.Fatal("force requires version number, e.g. migrate force 0")
		}
		v, err := strconv.Atoi(args[1])
		if err != nil {
			log.Fatalf("invalid version: %v", err)
		}
		if err := m.Force(v); err != nil {
			log.Fatalf("migrate force: %v", err)
		}
		log.Printf("Set dirty version to %d.", v)
	case "version":
		version, dirty, err := m.Version()
		if err != nil && err != migrate.ErrNilVersion {
			log.Fatalf("migrate version: %v", err)
		}
		if err == migrate.ErrNilVersion {
			log.Println("No migration applied yet.")
			return
		}
		log.Printf("Current version: %d (dirty: %v)", version, dirty)
	default:
		log.Fatalf("unknown command: %q (use up, down, force, version)", cmd)
	}
}

func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
