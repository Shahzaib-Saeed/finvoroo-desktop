import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { LoadingBarContainer } from 'react-top-loading-bar';
import { Toaster } from '@/components/ui/sonner';
import { AppVersionWatcher } from '@/components/app-version-watcher';
import { PageTitleManager } from '@/components/page-title-manager';
import { AppRouting } from '@/routing/app-routing';
import { I18nProvider } from '@/providers/i18n-provider';
import { ModulesProvider } from '@/providers/modules-provider';
import { SettingsProvider } from '@/providers/settings-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { TooltipsProvider } from '@/providers/tooltips-provider';

const { BASE_URL } = import.meta.env;
const routerBasename =
  import.meta.env.VITE_ROUTER_BASENAME ?? (BASE_URL === '/' ? '' : BASE_URL) ?? '';

export function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <I18nProvider>
          <HelmetProvider>
            <TooltipsProvider>
              <LoadingBarContainer>
                <BrowserRouter basename={routerBasename}>
                  <AppVersionWatcher />
                  <PageTitleManager />
                  <Toaster position="top-right" />
                  <ModulesProvider>
                    <AppRouting />
                  </ModulesProvider>
                </BrowserRouter>
              </LoadingBarContainer>
            </TooltipsProvider>
          </HelmetProvider>
        </I18nProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
