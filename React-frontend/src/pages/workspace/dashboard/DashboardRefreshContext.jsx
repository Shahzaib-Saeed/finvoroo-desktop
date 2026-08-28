import { createContext, useContext } from 'react';

/**
 * Provides `triggerDashboardRefresh()` to any component inside the workspace
 * layout, so pages that mutate data (invoices, bills, payments, etc.) can
 * immediately pull fresh dashboard numbers without a page reload.
 *
 * Usage (from any child component / hook):
 *   const { triggerDashboardRefresh } = useDashboardRefresh();
 *   // after saving an invoice / bill / payment:
 *   triggerDashboardRefresh();
 *
 * The WorkspaceDashboardPage uses `registerDashRefresh(silentRefresh)` to
 * wire up its own refresh function into the layout-level ref.
 */

const DashboardRefreshContext = createContext({
  triggerDashboardRefresh: () => {},
  registerDashRefresh: () => {},
});

export function DashboardRefreshProvider({ onRefresh, onRegister, children }) {
  return (
    <DashboardRefreshContext.Provider
      value={{
        triggerDashboardRefresh: onRefresh ?? (() => {}),
        registerDashRefresh: onRegister ?? (() => {}),
      }}
    >
      {children}
    </DashboardRefreshContext.Provider>
  );
}

export function useDashboardRefresh() {
  return useContext(DashboardRefreshContext);
}
