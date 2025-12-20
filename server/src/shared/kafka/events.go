package kafka

// ComplaintStatusChangedEvent событие изменения статуса жалобы
type ComplaintStatusChangedEvent struct {
	ComplaintID       int    `json:"complaint_id"`
	OldStatus         string `json:"old_status"`
	NewStatus         string `json:"new_status"`
	Comment           string `json:"comment,omitempty"`
	ChangedBy         int    `json:"changed_by"`
	ChangedByLogin    string `json:"changed_by_login"`
	UserEmail         string `json:"user_email"`
	UserName          string `json:"user_name"`
	ComplaintText     string `json:"complaint_text"`
	DeviceDescription string `json:"device_description"`
	ChangedAt         string `json:"changed_at"`
}

// Kafka топики
const (
	TopicComplaintStatusChanged = "complaints.status.changed"
)







