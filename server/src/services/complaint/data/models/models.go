package models

import (
	"database/sql"
	"time"
)

// Complaint представляет запись жалобы в БД.
type Complaint struct {
	ID                int            `db:"id"`
	Text              string         `db:"text"`
	Date              time.Time      `db:"date"`
	DeviceDescription string         `db:"devicedescription"`
	Author            int            `db:"author"`
	AuthorEmail       sql.NullString `db:"author_email"`
	Status            string         `db:"status"`
	CreatedAt         time.Time      `db:"created_at"`
	UpdatedAt         time.Time      `db:"updated_at"`
}

// ComplaintWithUser дополняет жалобу данными об авторе.
type ComplaintWithUser struct {
	Complaint
	AuthorName  string
	AuthorLogin string
	AssignedTo  *string
}

// ComplaintStatusHistory представляет запись истории статуса.
type ComplaintStatusHistory struct {
	ID             int       `db:"id"`
	ComplaintID    int       `db:"complaint_id"`
	Status         string    `db:"status"`
	Comment        *string   `db:"comment"`
	ChangedBy      *int      `db:"changed_by"`
	ChangedByLogin *string   `db:"changed_by_login"`
	CreatedAt      time.Time `db:"created_at"`
}

// ComplaintFilter параметры выборки жалоб.
type ComplaintFilter struct {
	Status   *string
	AuthorID *int
	IsAdmin  bool
	ViewerID int
	Limit    int
	Offset   int
}
