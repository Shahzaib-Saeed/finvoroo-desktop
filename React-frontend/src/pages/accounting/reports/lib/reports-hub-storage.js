const WELCOME_KEY = 'reports_hub_welcome_dismissed';
const WIZARD_HINT_KEY = 'reports_wizard_completed';

export function isReportsWelcomeVisible() {
  try {
    return localStorage.getItem(WELCOME_KEY) !== '1';
  } catch {
    return true;
  }
}

export function dismissReportsWelcome() {
  try {
    localStorage.setItem(WELCOME_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasCompletedReportWizard() {
  try {
    return localStorage.getItem(WIZARD_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markReportWizardCompleted() {
  try {
    localStorage.setItem(WIZARD_HINT_KEY, '1');
  } catch {
    /* ignore */
  }
}
