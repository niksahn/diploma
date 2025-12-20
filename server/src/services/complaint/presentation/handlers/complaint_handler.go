package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	dmodels "github.com/diploma/complaint-service/data/models"
	"github.com/diploma/complaint-service/data/repository"
	apiModels "github.com/diploma/complaint-service/presentation/models"
	"github.com/diploma/shared/kafka"
	"github.com/gin-gonic/gin"
)

var allowedStatuses = map[string]bool{
	"pending":     true,
	"in_progress": true,
	"resolved":    true,
	"rejected":    true,
}

// ComplaintHandler обслуживает HTTP запросы.
type ComplaintHandler struct {
	repo           *repository.Repository
	kafkaProducer  *kafka.Producer
}

// NewComplaintHandler конструктор обработчика.
func NewComplaintHandler(repo *repository.Repository, kafkaProducer *kafka.Producer) *ComplaintHandler {
	return &ComplaintHandler{
		repo:          repo,
		kafkaProducer: kafkaProducer,
	}
}

// getUserID извлекает ID пользователя из заголовка (устанавливается Gateway).
func getUserID(c *gin.Context) (int, error) {
	userIDStr := c.GetHeader("X-User-ID")
	if userIDStr == "" {
		return 0, nil
	}
	return strconv.Atoi(userIDStr)
}

// getUserRole извлекает роль пользователя.
func getUserRole(c *gin.Context) string {
	role := c.GetHeader("X-User-Role")
	if role == "" {
		role = c.GetHeader("X-User-Roles")
	}
	if role == "" {
		return ""
	}
	parts := strings.Split(role, ",")
	return strings.TrimSpace(parts[0])
}

// isAdmin проверяет роль admin.
func isAdmin(c *gin.Context) bool {
	return strings.ToLower(getUserRole(c)) == "admin"
}

// CreateComplaint godoc
// @Summary Создать жалобу
// @Description Создает новую жалобу от текущего пользователя
// @Tags complaints
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body apiModels.CreateComplaintRequest true "Данные жалобы"
// @Success 201 {object} apiModels.ComplaintResponse
// @Failure 400 {object} apiModels.ErrorResponse
// @Failure 401 {object} apiModels.ErrorResponse
// @Router /complaints [post]
func (h *ComplaintHandler) CreateComplaint(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, apiModels.ErrorResponse{Error: "unauthorized"})
		return
	}

	var req apiModels.CreateComplaintRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiModels.ErrorResponse{Error: err.Error()})
		return
	}

	complaint, err := h.repo.CreateComplaint(c.Request.Context(), userID, req.Text, req.DeviceDescription, req.UserEmail)
	if err != nil {
		log.Printf("create complaint user %d failed: %v", userID, err)
		c.JSON(http.StatusInternalServerError, apiModels.ErrorResponse{Error: "failed to create complaint"})
		return
	}

	c.JSON(http.StatusCreated, mapComplaintResponse(*complaint))
}

// ListComplaints godoc
// @Summary Получить список жалоб
// @Description Пользователь видит только свои жалобы, администратор — все
// @Tags complaints
// @Produce json
// @Security BearerAuth
// @Param status query string false "Фильтр по статусу (pending/in_progress/resolved/rejected)"
// @Param author_id query int false "Фильтр по автору (только для администратора)"
// @Param limit query int false "Лимит результатов (по умолчанию 50, максимум 100)" default(50)
// @Param offset query int false "Смещение" default(0)
// @Success 200 {object} apiModels.ComplaintListResponse
// @Failure 400 {object} apiModels.ErrorResponse
// @Failure 401 {object} apiModels.ErrorResponse
// @Router /complaints [get]
func (h *ComplaintHandler) ListComplaints(c *gin.Context) {
	log.Printf("ListComplaints called")

	userID, err := getUserID(c)
	log.Printf("getUserID returned: userID=%d, err=%v", userID, err)

	if err != nil || userID == 0 {
		log.Printf("Unauthorized: err=%v, userID=%d", err, userID)
		c.JSON(http.StatusUnauthorized, apiModels.ErrorResponse{Error: "unauthorized"})
		return
	}

	admin := isAdmin(c)

	var statusFilter *string
	if status := c.Query("status"); status != "" {
		if !allowedStatuses[status] {
			c.JSON(http.StatusBadRequest, apiModels.ErrorResponse{Error: "invalid status"})
			return
		}
		statusFilter = &status
	}

	var authorID *int
	if admin {
		if author := c.Query("author_id"); author != "" {
			parsed, err := strconv.Atoi(author)
			if err != nil || parsed <= 0 {
				c.JSON(http.StatusBadRequest, apiModels.ErrorResponse{Error: "invalid author_id"})
				return
			}
			authorID = &parsed
		}
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}

	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if v, err := strconv.Atoi(offsetStr); err == nil && v >= 0 {
			offset = v
		}
	}

	filter := dmodels.ComplaintFilter{
		Status:   statusFilter,
		AuthorID: authorID,
		IsAdmin:  admin,
		ViewerID: userID,
		Limit:    limit,
		Offset:   offset,
	}

	complaints, total, err := h.repo.ListComplaints(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, apiModels.ErrorResponse{Error: "failed to fetch complaints"})
		return
	}

	var items []apiModels.ComplaintResponse
	for _, cpl := range complaints {
		items = append(items, mapComplaintResponse(cpl))
	}

	c.JSON(http.StatusOK, apiModels.ComplaintListResponse{
		Complaints: items,
		Total:      total,
		Limit:      limit,
		Offset:     offset,
	})
}

// GetComplaint godoc
// @Summary Получить жалобу
// @Description Детальная информация по жалобе
// @Tags complaints
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID жалобы"
// @Success 200 {object} apiModels.ComplaintDetailResponse
// @Failure 401 {object} apiModels.ErrorResponse
// @Failure 403 {object} apiModels.ErrorResponse
// @Failure 404 {object} apiModels.ErrorResponse
// @Router /complaints/{id} [get]
func (h *ComplaintHandler) GetComplaint(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, apiModels.ErrorResponse{Error: "unauthorized"})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, apiModels.ErrorResponse{Error: "invalid id"})
		return
	}

	complaint, err := h.repo.GetComplaint(c.Request.Context(), id)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, apiModels.ErrorResponse{Error: "complaint not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, apiModels.ErrorResponse{Error: "failed to get complaint"})
		return
	}

	if !isAdmin(c) && complaint.Author != userID {
		c.JSON(http.StatusForbidden, apiModels.ErrorResponse{Error: "forbidden"})
		return
	}

	history, err := h.repo.GetComplaintHistory(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, apiModels.ErrorResponse{Error: "failed to get history"})
		return
	}

	resp := apiModels.ComplaintDetailResponse{
		ComplaintResponse: mapComplaintResponse(*complaint),
	}
	for _, hItem := range history {
		resp.StatusHistory = append(resp.StatusHistory, mapHistoryResponse(hItem))
	}

	c.JSON(http.StatusOK, resp)
}

// UpdateComplaintStatus godoc
// @Summary Изменить статус жалобы (админ)
// @Description Обновляет статус жалобы и добавляет запись в историю
// @Tags complaints
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID жалобы"
// @Param request body apiModels.UpdateStatusRequest true "Новый статус"
// @Success 200 {object} apiModels.ComplaintStatusHistoryResponse
// @Failure 400 {object} apiModels.ErrorResponse
// @Failure 401 {object} apiModels.ErrorResponse
// @Failure 403 {object} apiModels.ErrorResponse
// @Failure 404 {object} apiModels.ErrorResponse
// @Router /complaints/{id}/status [put]
func (h *ComplaintHandler) UpdateComplaintStatus(c *gin.Context) {
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, apiModels.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	adminID, err := getUserID(c)
	if err != nil || adminID == 0 {
		c.JSON(http.StatusUnauthorized, apiModels.ErrorResponse{Error: "unauthorized"})
		return
	}

	complaintID, err := strconv.Atoi(c.Param("id"))
	if err != nil || complaintID <= 0 {
		c.JSON(http.StatusBadRequest, apiModels.ErrorResponse{Error: "invalid id"})
		return
	}

	var req apiModels.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiModels.ErrorResponse{Error: err.Error()})
		return
	}

	if !allowedStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, apiModels.ErrorResponse{Error: "invalid status"})
		return
	}

	history, err := h.repo.UpdateComplaintStatus(c.Request.Context(), complaintID, req.Status, req.Comment, adminID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, apiModels.ErrorResponse{Error: "complaint not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, apiModels.ErrorResponse{Error: "failed to update status"})
		return
	}

	// Отправляем событие в Kafka асинхронно
	if h.kafkaProducer != nil {
		// Получаем обновленную жалобу для данных события
		complaint, err := h.repo.GetComplaint(c.Request.Context(), complaintID)
		if err == nil {
			// Получаем информацию об администраторе
			adminLogin := "admin" // По умолчанию
			if history.ChangedByLogin != nil {
				adminLogin = *history.ChangedByLogin
			}

			userEmail := ""
			if complaint.AuthorEmail.Valid {
				userEmail = complaint.AuthorEmail.String
			}

			event := kafka.ComplaintStatusChangedEvent{
				ComplaintID:       complaint.ID,
				OldStatus:         history.Status, // Предыдущий статус из истории
				NewStatus:         req.Status,
				Comment:           "",
				ChangedBy:         adminID,
				ChangedByLogin:    adminLogin,
				UserEmail:         userEmail,
				UserName:          complaint.AuthorName,
				ComplaintText:     complaint.Text,
				DeviceDescription: complaint.DeviceDescription,
				ChangedAt:         history.CreatedAt.Format(time.RFC3339),
			}

			if req.Comment != nil {
				event.Comment = *req.Comment
			}

			// Отправляем событие асинхронно
			go func() {
				if err := h.kafkaProducer.Publish(kafka.TopicComplaintStatusChanged, event); err != nil {
					log.Printf("Failed to publish complaint status changed event: %v", err)
				}
			}()
		} else {
			log.Printf("Failed to get complaint for Kafka event: %v", err)
		}
	}

	c.JSON(http.StatusOK, mapHistoryResponse(*history))
}

// DeleteComplaint godoc
// @Summary Удалить жалобу (админ)
// @Description Физически удаляет жалобу и историю
// @Tags complaints
// @Security BearerAuth
// @Param id path int true "ID жалобы"
// @Success 204 "No Content"
// @Failure 400 {object} apiModels.ErrorResponse
// @Failure 401 {object} apiModels.ErrorResponse
// @Failure 403 {object} apiModels.ErrorResponse
// @Failure 404 {object} apiModels.ErrorResponse
// @Router /complaints/{id} [delete]
func (h *ComplaintHandler) DeleteComplaint(c *gin.Context) {
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, apiModels.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, apiModels.ErrorResponse{Error: "invalid id"})
		return
	}

	if err := h.repo.DeleteComplaint(c.Request.Context(), id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, apiModels.ErrorResponse{Error: "complaint not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, apiModels.ErrorResponse{Error: "failed to delete complaint"})
		return
	}

	c.Status(http.StatusNoContent)
}

func mapComplaintResponse(cpl dmodels.ComplaintWithUser) apiModels.ComplaintResponse {
	resp := apiModels.ComplaintResponse{
		ID:                cpl.ID,
		Text:              cpl.Text,
		Date:              cpl.Date.Format("2006-01-02"),
		DeviceDescription: cpl.DeviceDescription,
		Author:            cpl.Author,
		AuthorName:        cpl.AuthorName,
		AuthorLogin:       cpl.AuthorLogin,
		Status:            cpl.Status,
		CreatedAt:         cpl.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:         cpl.UpdatedAt.UTC().Format(time.RFC3339),
	}

	// Handle nullable AuthorEmail field
	if cpl.AuthorEmail.Valid {
		resp.AuthorEmail = cpl.AuthorEmail.String
	} else {
		resp.AuthorEmail = ""
	}

	if cpl.AssignedTo != nil {
		resp.AssignedTo = *cpl.AssignedTo
	}

	return resp
}

func mapHistoryResponse(item dmodels.ComplaintStatusHistory) apiModels.ComplaintStatusHistoryResponse {
	resp := apiModels.ComplaintStatusHistoryResponse{
		ID:        item.ID,
		Status:    item.Status,
		ChangedAt: item.CreatedAt.UTC().Format(time.RFC3339),
	}

	if item.Comment != nil {
		resp.Comment = *item.Comment
	}
	if item.ChangedBy != nil {
		resp.ChangedBy = *item.ChangedBy
	}
	if item.ChangedByLogin != nil {
		resp.ChangedByLogin = *item.ChangedByLogin
	}

	return resp
}
