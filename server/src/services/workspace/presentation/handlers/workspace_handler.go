package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/diploma/workspace-service/data/repository"
	"github.com/diploma/workspace-service/presentation/models"
	"github.com/gin-gonic/gin"
)

type WorkspaceHandler struct {
	repo *repository.Repository
}

func NewWorkspaceHandler(repo *repository.Repository) *WorkspaceHandler {
	return &WorkspaceHandler{repo: repo}
}

// getUserID извлекает ID пользователя из заголовка X-User-ID
func getUserID(c *gin.Context) (int, error) {
	userIDStr := c.GetHeader("X-User-ID")
	if userIDStr == "" {
		return 0, nil
	}
	return strconv.Atoi(userIDStr)
}

// getRoles извлекает роли из заголовков X-User-Role или X-User-Roles (через запятую)
func getRoles(c *gin.Context) []string {
	role := c.GetHeader("X-User-Role")
	if role == "" {
		role = c.GetHeader("X-User-Roles")
	}
	if role == "" {
		return nil
	}
	parts := strings.Split(role, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(strings.ToLower(parts[i]))
	}
	return parts
}

// isAdmin проверяет, является ли пользователь администратором
func isAdmin(c *gin.Context) bool {
	for _, r := range getRoles(c) {
		if r == "admin" {
			return true
		}
	}
	return false
}

// CreateWorkspace godoc
// @Summary Создать рабочее пространство
// @Description Создает новое рабочее пространство (только администратор)
// @Tags workspaces
// @Accept json
// @Produce json
// @Param request body models.CreateWorkspaceRequest true "Данные РП"
// @Success 201 {object} models.WorkspaceResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 409 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces [post]
func (h *WorkspaceHandler) CreateWorkspace(c *gin.Context) {
	adminID, err := getUserID(c)
	if err != nil || adminID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	var req models.CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	ctx := c.Request.Context()

	// Проверяем существование тарифа
	tariffExists, err := h.repo.TariffExists(ctx, req.TariffID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check tariff"})
		return
	}
	if !tariffExists {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "tariff not found"})
		return
	}

	// Проверяем существование пользователя (будущего руководителя)
	userExists, err := h.repo.UserExists(ctx, req.LeaderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check user"})
		return
	}
	if !userExists {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "leader user not found"})
		return
	}

	// Проверяем уникальность имени
	nameExists, err := h.repo.WorkspaceNameExists(ctx, req.Name, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check workspace name"})
		return
	}
	if nameExists {
		c.JSON(http.StatusConflict, models.ErrorResponse{Error: "workspace with this name already exists"})
		return
	}

	// Создаем РП
	workspace, err := h.repo.CreateWorkspace(ctx, req.Name, adminID, req.TariffID)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			c.JSON(http.StatusConflict, models.ErrorResponse{Error: "workspace with this name already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create workspace"})
		return
	}

	// Добавляем руководителя в РП с ролью 2
	err = h.repo.AddMember(ctx, workspace.ID, req.LeaderID, 2)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to add leader to workspace"})
		return
	}

	// Получаем информацию о тарифе для ответа
	tariff, err := h.repo.GetTariffByID(ctx, req.TariffID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to load tariff"})
		return
	}

	createdAt := time.Now().UTC()

	c.JSON(http.StatusCreated, models.WorkspaceResponse{
		ID:        workspace.ID,
		Name:      workspace.Name,
		Creator:   workspace.Creator,
		TariffsID: workspace.TariffsID,
		TariffID:  workspace.TariffsID,
		Tariff: &models.TariffInfo{
			ID:          tariff.ID,
			Name:        tariff.Name,
			Description: tariff.Description,
		},
		CreatedAt: createdAt.Format(time.RFC3339),
	})
}

// GetUserWorkspaces godoc
// @Summary Получить список РП пользователя
// @Description Возвращает список рабочих пространств текущего пользователя
// @Tags workspaces
// @Produce json
// @Success 200 {object} models.UserWorkspacesResponse
// @Failure 401 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces [get]
func (h *WorkspaceHandler) GetUserWorkspaces(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	ctx := c.Request.Context()

	workspaces, err := h.repo.GetUserWorkspaces(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get workspaces"})
		return
	}

	response := models.UserWorkspacesResponse{
		Workspaces: make([]models.UserWorkspaceResponse, 0, len(workspaces)),
		Total:      len(workspaces),
	}

	for _, ws := range workspaces {
		response.Workspaces = append(response.Workspaces, models.UserWorkspaceResponse{
			ID:       ws.ID,
			Name:     ws.Name,
			Role:     ws.Role,
			JoinedAt: ws.JoinedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	c.JSON(http.StatusOK, response)
}

// GetWorkspace godoc
// @Summary Получить информацию о РП
// @Description Возвращает детальную информацию о рабочем пространстве
// @Tags workspaces
// @Produce json
// @Param id path int true "ID рабочего пространства"
// @Success 200 {object} models.WorkspaceDetailsResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/{id} [get]
func (h *WorkspaceHandler) GetWorkspace(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	workspaceID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid workspace id"})
		return
	}

	ctx := c.Request.Context()

	// Сначала проверяем существование РП
	exists, err := h.repo.WorkspaceExists(ctx, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check workspace"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "workspace not found"})
		return
	}

	// Проверяем, что пользователь является участником РП
	isMember, err := h.repo.IsMemberOfWorkspace(ctx, userID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check membership"})
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "user is not a member of this workspace"})
		return
	}

	// Получаем информацию о РП
	workspace, err := h.repo.GetWorkspaceByID(ctx, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "workspace not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get workspace"})
		return
	}

	c.JSON(http.StatusOK, models.WorkspaceDetailsResponse{
		ID:        workspace.ID,
		Name:      workspace.Name,
		Creator:   workspace.Creator,
		CreatedAt: workspace.CreatedAt.UTC().Format(time.RFC3339),
		Tariff: models.TariffInfo{
			ID:          workspace.TariffID,
			Name:        workspace.TariffName,
			Description: workspace.TariffDesc,
		},
		MembersCount: workspace.MembersCount,
		ChatsCount:   workspace.ChatsCount,
		TasksCount:   workspace.TasksCount,
	})
}

// UpdateWorkspace godoc
// @Summary Обновить РП
// @Description Обновляет параметры рабочего пространства (только руководитель)
// @Tags workspaces
// @Accept json
// @Produce json
// @Param id path int true "ID рабочего пространства"
// @Param request body models.UpdateWorkspaceRequest true "Новые данные РП"
// @Success 200 {object} models.WorkspaceResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 409 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/{id} [put]
func (h *WorkspaceHandler) UpdateWorkspace(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	workspaceID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid workspace id"})
		return
	}

	ctx := c.Request.Context()

	// Проверяем, что пользователь - руководитель РП
	role, err := h.repo.GetUserRoleInWorkspace(ctx, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "not a member") {
			c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "user is not a member of this workspace"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check user role"})
		return
	}
	if role != 2 {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	var req models.UpdateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	// Проверяем существование тарифа
	tariffExists, err := h.repo.TariffExists(ctx, req.TariffID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check tariff"})
		return
	}
	if !tariffExists {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "tariff not found"})
		return
	}

	// Проверяем уникальность имени (исключая текущее РП)
	nameExists, err := h.repo.WorkspaceNameExists(ctx, req.Name, &workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check workspace name"})
		return
	}
	if nameExists {
		c.JSON(http.StatusConflict, models.ErrorResponse{Error: "workspace with this name already exists"})
		return
	}

	// Обновляем РП
	err = h.repo.UpdateWorkspace(ctx, workspaceID, req.Name, req.TariffID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "workspace not found"})
			return
		}
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			c.JSON(http.StatusConflict, models.ErrorResponse{Error: "workspace with this name already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update workspace"})
		return
	}

	tariff, err := h.repo.GetTariffByID(ctx, req.TariffID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to load tariff"})
		return
	}

	c.JSON(http.StatusOK, models.WorkspaceResponse{
		ID:        workspaceID,
		Name:      req.Name,
		TariffsID: req.TariffID,
		TariffID:  req.TariffID,
		Tariff: &models.TariffInfo{
			ID:          tariff.ID,
			Name:        tariff.Name,
			Description: tariff.Description,
		},
	})
}

// DeleteWorkspace godoc
// @Summary Удалить РП
// @Description Удаляет рабочее пространство (только администратор)
// @Tags workspaces
// @Param id path int true "ID рабочего пространства"
// @Success 204
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/{id} [delete]
func (h *WorkspaceHandler) DeleteWorkspace(c *gin.Context) {
	adminID, err := getUserID(c)
	if err != nil || adminID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	workspaceID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid workspace id"})
		return
	}

	ctx := c.Request.Context()

	err = h.repo.DeleteWorkspace(ctx, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "workspace not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to delete workspace"})
		return
	}

	c.Status(http.StatusNoContent)
}

// AddMember godoc
// @Summary Добавить участника в РП
// @Description Добавляет пользователя в рабочее пространство (только руководитель)
// @Tags workspace-members
// @Accept json
// @Produce json
// @Param id path int true "ID рабочего пространства"
// @Param request body models.AddMemberRequest true "Данные участника"
// @Success 201 {object} models.MemberAddedResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 409 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/{id}/members [post]
func (h *WorkspaceHandler) AddMember(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	workspaceID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid workspace id"})
		return
	}

	ctx := c.Request.Context()

	// Проверяем, что пользователь - руководитель РП
	role, err := h.repo.GetUserRoleInWorkspace(ctx, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "not a member") {
			c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "user is not a member of this workspace"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check user role"})
		return
	}
	if role != 2 {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	var req models.AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	// Проверяем существование пользователя
	userExists, err := h.repo.UserExists(ctx, req.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check user"})
		return
	}
	if !userExists {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "user not found"})
		return
	}

	// Проверяем, что пользователь еще не является участником
	isMember, err := h.repo.IsMemberOfWorkspace(ctx, req.UserID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check membership"})
		return
	}
	if isMember {
		c.JSON(http.StatusConflict, models.ErrorResponse{Error: "user is already a member of this workspace"})
		return
	}

	// Добавляем участника
	err = h.repo.AddMember(ctx, workspaceID, req.UserID, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to add member"})
		return
	}

	c.JSON(http.StatusCreated, models.MemberAddedResponse{
		UserID:      req.UserID,
		WorkspaceID: workspaceID,
		Role:        req.Role,
		Date:        time.Now().Format("2006-01-02"),
	})
}

// GetMembers godoc
// @Summary Получить список участников РП
// @Description Возвращает список всех участников рабочего пространства
// @Tags workspace-members
// @Produce json
// @Param id path int true "ID рабочего пространства"
// @Success 200 {object} models.MembersResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/{id}/members [get]
func (h *WorkspaceHandler) GetMembers(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	workspaceID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid workspace id"})
		return
	}

	ctx := c.Request.Context()

	// Проверяем, что пользователь является участником РП
	isMember, err := h.repo.IsMemberOfWorkspace(ctx, userID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check membership"})
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "user is not a member of this workspace"})
		return
	}

	// Получаем список участников
	members, err := h.repo.GetMembers(ctx, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get members"})
		return
	}

	response := models.MembersResponse{
		Members: make([]models.MemberResponse, 0, len(members)),
		Total:   len(members),
	}

	for _, member := range members {
		response.Members = append(response.Members, models.MemberResponse{
			UserID:     member.UserID,
			Login:      member.Login,
			Name:       member.Name,
			Surname:    member.Surname,
			Patronymic: member.Patronymic,
			Role:       member.Role,
			Status:     member.Status,
			JoinedAt:   member.JoinedAt.UTC().Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, response)
}

// UpdateMemberRole godoc
// @Summary Изменить роль участника
// @Description Изменяет роль пользователя в рабочем пространстве (только руководитель)
// @Tags workspace-members
// @Accept json
// @Produce json
// @Param id path int true "ID рабочего пространства"
// @Param user_id path int true "ID пользователя"
// @Param request body models.UpdateMemberRoleRequest true "Новая роль"
// @Success 200 {object} models.MemberRoleUpdatedResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/{id}/members/{user_id} [put]
func (h *WorkspaceHandler) UpdateMemberRole(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	workspaceID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid workspace id"})
		return
	}

	targetUserID, err := strconv.Atoi(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid user id"})
		return
	}

	ctx := c.Request.Context()

	// Проверяем, что пользователь - руководитель РП
	role, err := h.repo.GetUserRoleInWorkspace(ctx, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "not a member") {
			c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "user is not a member of this workspace"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check user role"})
		return
	}
	if role != 2 {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	var req models.UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	// Обновляем роль
	err = h.repo.UpdateMemberRole(ctx, workspaceID, targetUserID, req.Role)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "member not found in workspace"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update member role"})
		return
	}

	c.JSON(http.StatusOK, models.MemberRoleUpdatedResponse{
		UserID:      targetUserID,
		WorkspaceID: workspaceID,
		Role:        req.Role,
		UpdatedAt:   time.Now().Format("2006-01-02"),
	})
}

// RemoveMember godoc
// @Summary Удалить участника из РП
// @Description Удаляет пользователя из рабочего пространства (только руководитель)
// @Tags workspace-members
// @Param id path int true "ID рабочего пространства"
// @Param user_id path int true "ID пользователя"
// @Success 204
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/{id}/members/{user_id} [delete]
func (h *WorkspaceHandler) RemoveMember(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	workspaceID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid workspace id"})
		return
	}

	targetUserID, err := strconv.Atoi(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid user id"})
		return
	}

	ctx := c.Request.Context()

	// Проверяем, что пользователь - руководитель РП
	role, err := h.repo.GetUserRoleInWorkspace(ctx, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "not a member") {
			c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "user is not a member of this workspace"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check user role"})
		return
	}
	if role != 2 {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	// Удаляем участника
	err = h.repo.RemoveMember(ctx, workspaceID, targetUserID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "member not found in workspace"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to remove member"})
		return
	}

	c.Status(http.StatusNoContent)
}

// ChangeLeader godoc
// @Summary Сменить руководителя РП
// @Description Передает роль руководителя другому участнику (только текущий руководитель)
// @Tags workspaces
// @Accept json
// @Produce json
// @Param id path int true "ID рабочего пространства"
// @Param request body models.ChangeLeaderRequest true "Новый руководитель"
// @Success 200 {object} models.LeaderChangedResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/{id}/leader [put]
func (h *WorkspaceHandler) ChangeLeader(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil || userID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "unauthorized"})
		return
	}

	workspaceID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid workspace id"})
		return
	}

	ctx := c.Request.Context()

	// Проверяем, что текущий пользователь - руководитель РП
	role, err := h.repo.GetUserRoleInWorkspace(ctx, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "not a member") {
			c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "user is not a member of this workspace"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check user role"})
		return
	}
	if role != 2 {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	var req models.ChangeLeaderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	// Проверяем, что новый руководитель является участником РП
	isMember, err := h.repo.IsMemberOfWorkspace(ctx, req.NewLeaderID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to check new leader membership"})
		return
	}
	if !isMember {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "new leader is not a member of this workspace"})
		return
	}

	// Меняем руководителя
	err = h.repo.ChangeLeader(ctx, workspaceID, userID, req.NewLeaderID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to change leader"})
		return
	}

	c.JSON(http.StatusOK, models.LeaderChangedResponse{
		WorkspaceID: workspaceID,
		OldLeaderID: userID,
		NewLeaderID: req.NewLeaderID,
		UpdatedAt:   time.Now().Format(time.RFC3339),
	})
}
