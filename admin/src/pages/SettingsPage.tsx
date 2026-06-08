import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GRAFANA_OVERVIEW_PANEL_IDS,
  grafanaConfig,
  grafanaCredentials,
  grafanaDashboardEmbedUrl,
  grafanaDashboardExternalUrl,
  grafanaPanelEmbedUrl,
} from "../shared/config/grafana";
import { ru } from "../shared/i18n/ru";

const PANEL_TITLE_KEYS: Record<number, keyof typeof ru.settings.panels> = {
  1: "health",
  2: "requestRate",
  3: "responseTime",
  4: "errorRate",
  5: "memory",
  6: "goroutines",
  7: "responseSize",
};

async function checkGrafanaHealth(): Promise<boolean> {
  const url = `${grafanaConfig.baseUrl}/api/health`;
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) return false;
  const data = (await res.json()) as { database?: string };
  return data.database === "ok";
}

function GrafanaPanelEmbed({ panelId, title }: { panelId: number; title: string }) {
  const src = useMemo(() => grafanaPanelEmbedUrl(panelId), [panelId]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <iframe
        title={title}
        src={src}
        className="w-full border-0 bg-white"
        style={{ height: 280 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function SettingsPage() {
  const dashboardSrc = useMemo(() => grafanaDashboardEmbedUrl(), []);
  const grafanaExternal = useMemo(() => grafanaDashboardExternalUrl(), []);

  const healthQuery = useQuery({
    queryKey: ["grafana-health", grafanaConfig.baseUrl],
    queryFn: checkGrafanaHealth,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const grafanaOk = healthQuery.data === true;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{ru.settings.title}</h1>
          <p className="text-gray-600 mt-1">{ru.settings.subtitle}</p>
          <p className="text-sm text-gray-500 mt-2 max-w-3xl">{ru.settings.embedHint}</p>
          <p className="text-sm text-gray-600 mt-2">
            {ru.settings.grafanaCredentials(grafanaCredentials.login, grafanaCredentials.password)}
          </p>
        </div>
        <a
          href={grafanaExternal}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shrink-0"
        >
          {ru.settings.openGrafana}
        </a>
      </div>

      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          healthQuery.isLoading
            ? "border-gray-200 bg-gray-50 text-gray-700"
            : grafanaOk
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {healthQuery.isLoading && <span>Проверка подключения к Grafana…</span>}
        {!healthQuery.isLoading && grafanaOk && (
          <span>
            {ru.settings.grafanaReachable}: {grafanaConfig.baseUrl}
          </span>
        )}
        {!healthQuery.isLoading && !grafanaOk && (
          <span>{ru.settings.grafanaUnreachable(grafanaConfig.baseUrl)}</span>
        )}
      </div>

      {grafanaOk && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">{ru.settings.fullDashboard}</h2>
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <iframe
                title={ru.settings.fullDashboard}
                src={dashboardSrc}
                className="w-full border-0"
                style={{ height: 560 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <p className="text-xs text-gray-500">
              {ru.settings.panelLoadError}: {grafanaConfig.baseUrl}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">{ru.settings.panelsSection}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {GRAFANA_OVERVIEW_PANEL_IDS.map((panelId) => {
                const key = PANEL_TITLE_KEYS[panelId];
                const title = key ? ru.settings.panels[key] : `Панель ${panelId}`;
                return <GrafanaPanelEmbed key={panelId} panelId={panelId} title={title} />;
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default SettingsPage;
