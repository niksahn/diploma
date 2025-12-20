package main

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"

	"github.com/diploma/shared/kafka"
)

// EmailService отправляет email уведомления
type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	fromEmail    string
}

// NewEmailService создает новый email сервис
func NewEmailService(smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail string) *EmailService {
	return &EmailService{
		smtpHost:     smtpHost,
		smtpPort:     smtpPort,
		smtpUser:     smtpUser,
		smtpPassword: smtpPassword,
		fromEmail:    fromEmail,
	}
}

// SendComplaintStatusNotification отправляет уведомление об изменении статуса жалобы
func (e *EmailService) SendComplaintStatusNotification(event kafka.ComplaintStatusChangedEvent) error {
	subject := fmt.Sprintf("Complaint #%d Status Update", event.ComplaintID)

	body := fmt.Sprintf(`Hello %s,

Your complaint status has been updated:

Complaint ID: %d
Status: %s → %s
Changed by: %s
Date: %s

Complaint text: %s
Device: %s

%s

Thank you for using our service!

Best regards,
Support Team`,
		event.UserName,
		event.ComplaintID,
		strings.Title(event.OldStatus),
		strings.Title(event.NewStatus),
		event.ChangedByLogin,
		event.ChangedAt,
		event.ComplaintText,
		event.DeviceDescription,
		func() string {
			if event.Comment != "" {
				return fmt.Sprintf("Comment: %s", event.Comment)
			}
			return ""
		}(),
	)

	return e.sendEmail(event.UserEmail, subject, body)
}

// sendEmail отправляет email через SMTP
func (e *EmailService) sendEmail(to, subject, body string) error {
	if e.smtpHost == "" || e.smtpUser == "" {
		log.Println("SMTP not configured, skipping email send")
		return nil
	}

	// Создаем сообщение
	message := fmt.Sprintf("From: %s <%s>\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"\r\n"+
		"%s\r\n", e.fromEmail, e.fromEmail, to, subject, body)

	// Аутентификация
	auth := smtp.PlainAuth("", e.smtpUser, e.smtpPassword, e.smtpHost)

	// Отправка
	err := smtp.SendMail(
		e.smtpHost+":"+e.smtpPort,
		auth,
		e.fromEmail,
		[]string{to},
		[]byte(message),
	)

	if err != nil {
		log.Printf("Failed to send email to %s: %v", to, err)
		return err
	}

	log.Printf("Email sent successfully to %s", to)
	return nil
}







