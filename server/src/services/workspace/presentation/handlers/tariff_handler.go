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

type TariffHandler struct {
	repo *repository.Repository
}

func NewTariffHandler(repo *repository.Repository) *TariffHandler {
	return &TariffHandler{repo: repo}
}

// GetTariffs godoc
// @Summary Получить список тарифов
// @Description Возвращает список всех доступных тарифных планов (публичный эндпоинт)
// @Tags tariffs
// @Produce json
// @Success 200 {object} models.TariffsResponse
// @Router /workspaces/tariffs [get]
func (h *TariffHandler) GetTariffs(c *gin.Context) {
	ctx := c.Request.Context()

	tariffs, err := h.repo.GetAllTariffs(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get tariffs"})
		return
	}

	response := models.TariffsResponse{
		Tariffs: make([]models.TariffResponse, 0, len(tariffs)),
	}

	for _, tariff := range tariffs {
		response.Tariffs = append(response.Tariffs, models.TariffResponse{
			ID:          tariff.ID,
			Name:        tariff.Name,
			Description: tariff.Description,
		})
	}

	c.JSON(http.StatusOK, response)
}

// CreateTariff godoc
// @Summary Создать тариф
// @Description Создает новый тарифный план (только администратор)
// @Tags tariffs
// @Accept json
// @Produce json
// @Param request body models.CreateTariffRequest true "Данные тарифа"
// @Success 201 {object} models.TariffResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 409 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/tariffs [post]
func (h *TariffHandler) CreateTariff(c *gin.Context) {
	// Проверяем, что пользователь - администратор
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	var req models.CreateTariffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	ctx := c.Request.Context()

	tariff, err := h.repo.CreateTariff(ctx, req.Name, req.Description)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			c.JSON(http.StatusConflict, models.ErrorResponse{Error: "tariff with this name already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create tariff"})
		return
	}

	c.JSON(http.StatusCreated, models.TariffResponse{
		ID:          tariff.ID,
		Name:        tariff.Name,
		Description: tariff.Description,
	})
}

// UpdateTariff godoc
// @Summary Обновить тариф
// @Description Обновляет тарифный план (только администратор)
// @Tags tariffs
// @Accept json
// @Produce json
// @Param id path int true "ID тарифа"
// @Param request body models.UpdateTariffRequest true "Новые данные тарифа"
// @Success 200 {object} models.TariffResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Security BearerAuth
// @Router /workspaces/tariffs/{id} [put]
func (h *TariffHandler) UpdateTariff(c *gin.Context) {
	// Проверяем, что пользователь - администратор
	if !isAdmin(c) {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Error: "insufficient permissions"})
		return
	}

	tariffID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid tariff id"})
		return
	}

	var req models.UpdateTariffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: err.Error()})
		return
	}

	ctx := c.Request.Context()

	tariff, err := h.repo.UpdateTariff(ctx, tariffID, req.Name, req.Description)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "tariff not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update tariff"})
		return
	}

	c.JSON(http.StatusOK, models.TariffResponse{
		ID:          tariff.ID,
		Name:        tariff.Name,
		Description: tariff.Description,
	})
}
