export const ru = {
  appTitle: "Панель администратора",
  corporateMessengerAdmin: "",
  adminPanel: "Панель администратора",
  admin: "Администратор",
  nav: {
    dashboard: "Обзор",
    workspaces: "Рабочие пространства",
    users: "Пользователи",
    complaints: "Жалобы",
    settings: "Настройки и состояние",
  },
  actions: {
    refresh: "Обновить",
    refreshing: "Обновление…",
    retry: "Повторить",
    prev: "Назад",
    next: "Вперёд",
    apply: "Применить",
    cancel: "Отмена",
    save: "Сохранить",
    saving: "Сохранение…",
    create: "Создать",
    creating: "Создание…",
    open: "Открыть",
    view: "Просмотр",
    delete: "Удалить",
    deleting: "Удаление…",
    add: "Добавить",
    adding: "Добавление…",
    removing: "Удаление…",
    update: "Обновить",
    updating: "Обновление…",
    logout: "Выйти",
    signIn: "Войти",
    signingIn: "Вход…",
  },
  errors: {
    loginFailed: "Не удалось войти",
    unauthorized: "Требуется авторизация",
    requestFailed: "Ошибка запроса",
    loadWorkspaces: "Не удалось загрузить рабочие пространства",
    loadUsers: "Не удалось загрузить пользователей",
    loadComplaints: "Не удалось загрузить жалобы",
    loadComplaint: "Не удалось загрузить жалобу",
    loadTariffs: "Не удалось загрузить тарифы",
    healthCheckFailed: "Проверка состояния не выполнена",
    updateStatusFailed: "Не удалось обновить статус",
    createWorkspaceFailed: "Не удалось создать рабочее пространство",
  },
  login: {
    title: "Вход",
    login: "Логин",
    password: "Пароль",
  },
  dashboard: {
    title: "Обзор",
    subtitle: "Краткая сводка по состоянию платформы и активности",
    retryHealth: "Проверить снова",
    checking: "Проверка…",
    rechecking: "Повторная проверка…",
    refreshStats: "Обновить показатели",
    health: "Состояние",
    checkingHealth: "Проверка состояния сервисов…",
    service: "Сервис",
    unknown: "Неизвестно",
    quickStats: "Показатели",
    complaints: "Жалобы",
    workspaces: "Рабочие пространства",
    loading: "Загрузка…",
    latestComplaints: "Последние жалобы",
    loadingComplaints: "Загрузка жалоб…",
    noComplaints: "Жалоб не найдено",
  },
  workspaces: {
    title: "Рабочие пространства",
    subtitle: "Список всех рабочих пространств",
    loading: "Загрузка рабочих пространств…",
    create: "Создать",
    tariffIdOptional: "ID тарифа (необязательно)",
    limit: "Лимит",
    totalOffset: (total: number, offset: number) =>
      `Всего: ${total} | Смещение: ${offset}`,
    name: "Название",
    tariff: "Тариф",
    members: "Участники",
    createdAt: "Дата создания",
    actions: "Действия",
    none: "Рабочих пространств пока нет",
    showing: (count: number, total: number, offset: number) =>
      `Показано ${count} из ${total} (смещение ${offset})`,
  },
  workspaceCreate: {
    title: "Создание рабочего пространства",
    subtitle: "Заполните поля для создания рабочего пространства",
    refreshingTariffs: "Обновление тарифов…",
    loadingTariffs: "Загрузка тарифов…",
    name: "Название",
    namePlaceholder: "Название рабочего пространства",
    leaderUserId: "ID руководителя (пользователь)",
    leaderPlaceholder: "ID пользователя — будущий руководитель",
    tariff: "Тариф",
    selectTariff: "Выберите тариф",
    tariffs: "Тарифы",
    noDescription: "Без описания",
    success: "Рабочее пространство успешно создано",
    nameRequired: "Укажите название рабочего пространства",
    leaderRequired: "ID руководителя должен быть положительным числом",
    tariffRequired: "Выберите тариф",
  },
  workspaceDetail: {
    title: "Рабочее пространство",
    missingId: "В адресе не указан идентификатор рабочего пространства",
    creatorCreated: (creator: number, date: string) =>
      `Создатель: ${creator} • Создано ${date}`,
    name: "Название",
    namePlaceholder: "Название рабочего пространства",
    tariff: "Тариф",
    selectTariff: "Выберите тариф",
    tariffs: "Тарифы",
    members: "Участники",
    membersCount: (n: number) => `${n} участников`,
    userIdPlaceholder: "ID пользователя",
    login: "Логин",
    role: "Роль",
    joined: "Дата вступления",
    actions: "Действия",
    noMembers: "Участников пока нет",
    loadingTariffs: "Загрузка тарифов…",
    loadTariffsFailed: "Не удалось получить тарифы",
    loadingMembers: "Загрузка участников…",
    loading: "Загрузка…",
  },
  users: {
    title: "Пользователи",
    subtitle: "Список пользователей с фильтрами",
    search: "Поиск",
    searchPlaceholder: "логин, имя, фамилия",
    status: "Статус",
    workspaceIdOptional: "ID рабочего пространства (необязательно)",
    limit: "Лимит",
    loading: "Загрузка пользователей…",
    id: "ID",
    login: "Логин",
    name: "ФИО",
    none: "Пользователи не найдены",
    showing: (count: number, total: number, offset: number) =>
      `Показано ${count} из ${total} (смещение ${offset})`,
  },
  userStatus: {
    all: "Все",
    online: "В сети",
    dnd: "Не беспокоить",
    away: "Отошёл",
    offline: "Не в сети",
  },
  complaints: {
    title: "Жалобы",
    subtitle: "Просмотр жалоб, деталей и изменение статусов",
    loading: "Загрузка жалоб…",
    loadingDetails: "Загрузка деталей…",
    selectHint: "Выберите жалобу для просмотра деталей",
    complaint: (id: number) => `Жалоба №${id}`,
    author: "Автор",
    status: "Статус",
    created: "Создана",
    device: "Устройство",
    text: "Текст",
    statusHistory: "История статусов",
    updateStatus: "Изменить статус",
    commentOptional: "Комментарий (необязательно)",
    commentPlaceholder: "Заметка к смене статуса",
    statusUpdated: "Статус успешно обновлён",
    none: "Жалоб не найдено",
    actions: "Действия",
    filterAll: "Все",
    statusPending: "Ожидает",
    statusInProgress: "В работе",
    statusResolved: "Решена",
    statusRejected: "Отклонена",
  },
  table: {
    id: "ID",
    author: "Автор",
    status: "Статус",
    created: "Создано",
  },
  settings: {
    title: "Настройки и состояние",
    subtitle: "Мониторинг микросервисов через Grafana (Prometheus)",
    openGrafana: "Открыть Grafana",
    fullDashboard: "Общий дашборд",
    panelsSection: "Метрики по сервисам",
    embedHint:
      "Графики подгружаются с Grafana (Prometheus). Запустите: docker compose up -d prometheus grafana в каталоге server/src.",
    grafanaCredentials: (login: string, password: string) =>
      `Вход в Grafana (отдельная вкладка): логин ${login}, пароль ${password}`,
    grafanaReachable: "Grafana доступна",
    grafanaUnreachable: (url: string) =>
      `Не удаётся подключиться к ${url}. Запустите контейнер grafana и используйте 127.0.0.1 вместо localhost (см. .env.example).`,
    panelLoadError: "Адрес Grafana",
    panels: {
      health: "Доступность сервисов",
      requestRate: "Частота HTTP-запросов",
      responseTime: "Время ответа (p95)",
      errorRate: "Ошибки HTTP (4xx/5xx)",
      memory: "Использование памяти",
      goroutines: "Горутины (нагрузка)",
      responseSize: "Размер ответа (p95)",
    },
  },
  notFound: {
    pageNotFound: "Страница не найдена",
    goHome: "На главную",
  },
} as const;

const complaintStatusLabels: Record<string, string> = {
  pending: ru.complaints.statusPending,
  in_progress: ru.complaints.statusInProgress,
  resolved: ru.complaints.statusResolved,
  rejected: ru.complaints.statusRejected,
};

export function complaintStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return complaintStatusLabels[status] ?? status;
}

const healthStatusLabels: Record<string, string> = {
  ok: "Исправно",
  healthy: "Исправно",
  up: "Работает",
  ready: "Готово",
  degraded: "Снижена",
  warn: "Предупреждение",
  warning: "Предупреждение",
};

export function healthStatusLabel(status?: string | null): string {
  if (!status) return ru.dashboard.unknown;
  const key = status.toLowerCase();
  return healthStatusLabels[key] ?? status;
}

export function userStatusLabel(status?: number): string {
  switch (status) {
    case 1:
      return ru.userStatus.online;
    case 2:
      return ru.userStatus.dnd;
    case 3:
      return ru.userStatus.away;
    case 4:
      return ru.userStatus.offline;
    default:
      return status != null ? String(status) : "—";
  }
}

export const LOCALE = "ru-RU";
