const trimSlash = (url: string) => url.replace(/\/$/, "");

/** Учётные данные из server/src/docker-compose.yml (сервис grafana). */
export const grafanaCredentials = {
  login: "admin",
  password: "admin123",
};

function defaultGrafanaBaseUrl(): string {
  if (import.meta.env.VITE_GRAFANA_URL) {
    return trimSlash(import.meta.env.VITE_GRAFANA_URL);
  }
  // В dev — через прокси Vite (vite.config.ts), иначе iframe/CORS и localhost на Windows
  if (import.meta.env.DEV) {
    return "/grafana-proxy";
  }
  return "http://127.0.0.1:3000";
}

export const grafanaConfig = {
  baseUrl: defaultGrafanaBaseUrl(),
  dashboardUid: import.meta.env.VITE_GRAFANA_DASHBOARD_UID || "microservices-overview",
  orgId: import.meta.env.VITE_GRAFANA_ORG_ID || "1",
  timeFrom: import.meta.env.VITE_GRAFANA_TIME_FROM || "now-1h",
  timeTo: import.meta.env.VITE_GRAFANA_TIME_TO || "now",
  refresh: import.meta.env.VITE_GRAFANA_REFRESH || "30s"
};

/** ID панелей дашборда microservices-overview. */
export const GRAFANA_OVERVIEW_PANEL_IDS = [1, 2, 3, 4, 5, 6, 7] as const;

function baseEmbedParams(): URLSearchParams {
  return new URLSearchParams({
    orgId: grafanaConfig.orgId,
    theme: "light",
    refresh: grafanaConfig.refresh,
    from: grafanaConfig.timeFrom,
    to: grafanaConfig.timeTo
  });
}

/** Полный дашборд (режим kiosk — без верхнего меню Grafana). */
export function grafanaDashboardEmbedUrl(): string {
  const params = baseEmbedParams();
  params.set("kiosk", "tv");
  return `${grafanaConfig.baseUrl}/d/${grafanaConfig.dashboardUid}?${params}`;
}

/** Одна панель (d-solo) для встраивания в сетку. */
export function grafanaPanelEmbedUrl(panelId: number): string {
  const params = baseEmbedParams();
  params.set("panelId", String(panelId));
  return `${grafanaConfig.baseUrl}/d-solo/${grafanaConfig.dashboardUid}?${params}`;
}

export function grafanaDashboardExternalUrl(): string {
  return `${grafanaConfig.baseUrl}/d/${grafanaConfig.dashboardUid}?orgId=${grafanaConfig.orgId}`;
}
