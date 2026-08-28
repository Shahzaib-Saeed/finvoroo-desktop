import api from "@/lib/api";
import { normalizeReportPreferenceKey } from "../lib/report-column-layout";

export const reportPreferencesApi = {
  async get(reportKey) {
    const key = normalizeReportPreferenceKey(reportKey);
    const res = await api.get(`/workspace/report-preferences/${encodeURIComponent(key)}`);
    return res.data?.data || { report_key: key, columns: [] };
  },

  async saveColumns(reportKey, columns) {
    const key = normalizeReportPreferenceKey(reportKey);
    const res = await api.put(
      `/workspace/report-preferences/${encodeURIComponent(key)}/columns`,
      { columns },
    );
    return res.data?.data || { report_key: key, columns: [] };
  },

  async resetColumns(reportKey) {
    const key = normalizeReportPreferenceKey(reportKey);
    const res = await api.delete(
      `/workspace/report-preferences/${encodeURIComponent(key)}/columns`,
    );
    return res.data?.data || { report_key: key, columns: [] };
  },
};
