package kafka

import (
	"time"

	"github.com/google/uuid"
)

// EventType определяет тип события
type EventType string

const (
	EventTypeComplaintCreated     EventType = "complaint_created"
	EventTypeComplaintStatusChanged EventType = "complaint_status_changed"
)

// BaseEvent содержит общие поля для всех событий
type BaseEvent struct {
	ID        string    `json:"id"`
	Type      EventType `json:"type"`
	Timestamp time.Time `json:"timestamp"`
	Service   string    `json:"service"`
	Version   string    `json:"version"`
}

// ComplaintCreatedEvent отправляется при создании новой жалобы
type ComplaintCreatedEvent struct {
	BaseEvent
	ComplaintID      int       `json:"complaint_id"`
	AuthorID         int       `json:"author_id"`
	AuthorName       string    `json:"author_name"`
	AuthorEmail      string    `json:"author_email,omitempty"`
	Text             string    `json:"text"`
	DeviceDescription string   `json:"device_description"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
}

// ComplaintStatusChangedEvent отправляется при изменении статуса жалобы
type ComplaintStatusChangedEvent struct {
	BaseEvent
	ComplaintID    int       `json:"complaint_id"`
	OldStatus      string    `json:"old_status"`
	NewStatus      string    `json:"new_status"`
	ChangedBy      *int      `json:"changed_by,omitempty"`
	ChangedByName  *string   `json:"changed_by_name,omitempty"`
	Comment        *string   `json:"comment,omitempty"`
	AuthorID       int       `json:"author_id"`
	AuthorEmail    string    `json:"author_email,omitempty"`
	ChangedAt      time.Time `json:"changed_at"`
}

// NewComplaintCreatedEvent создает новое событие создания жалобы
func NewComplaintCreatedEvent(complaintID, authorID int, authorName, authorEmail, text, deviceDesc string, createdAt time.Time) ComplaintCreatedEvent {
	return ComplaintCreatedEvent{
		BaseEvent: BaseEvent{
			ID:        uuid.New().String(),
			Type:      EventTypeComplaintCreated,
			Timestamp: time.Now(),
			Service:   "complaint-service",
			Version:   "1.0",
		},
		ComplaintID:       complaintID,
		AuthorID:          authorID,
		AuthorName:        authorName,
		AuthorEmail:       authorEmail,
		Text:              text,
		DeviceDescription: deviceDesc,
		Status:            "pending",
		CreatedAt:         createdAt,
	}
}

// NewComplaintStatusChangedEvent создает новое событие изменения статуса жалобы
func NewComplaintStatusChangedEvent(complaintID int, oldStatus, newStatus string, changedBy *int, changedByName *string, comment *string, authorID int, authorEmail string) ComplaintStatusChangedEvent {
	return ComplaintStatusChangedEvent{
		BaseEvent: BaseEvent{
			ID:        uuid.New().String(),
			Type:      EventTypeComplaintStatusChanged,
			Timestamp: time.Now(),
			Service:   "complaint-service",
			Version:   "1.0",
		},
		ComplaintID:   complaintID,
		OldStatus:     oldStatus,
		NewStatus:     newStatus,
		ChangedBy:     changedBy,
		ChangedByName: changedByName,
		Comment:       comment,
		AuthorID:      authorID,
		AuthorEmail:   authorEmail,
		ChangedAt:     time.Now(),
	}
}

// ComplaintEvent унифицированный интерфейс для событий жалоб
type ComplaintEvent interface {
	GetBaseEvent() BaseEvent
	GetType() EventType
}

// GetBaseEvent возвращает базовую информацию о событии
func (e ComplaintCreatedEvent) GetBaseEvent() BaseEvent {
	return e.BaseEvent
}

// GetType возвращает тип события
func (e ComplaintCreatedEvent) GetType() EventType {
	return e.Type
}

// GetBaseEvent возвращает базовую информацию о событии
func (e ComplaintStatusChangedEvent) GetBaseEvent() BaseEvent {
	return e.BaseEvent
}

// GetType возвращает тип события
func (e ComplaintStatusChangedEvent) GetType() EventType {
	return e.Type
}
