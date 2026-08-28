/**
 * Chrome/Edge --kiosk-printing skips the print dialog and sends
 * window.print() straight to the Windows default printer.
 * No desktop agent. Users download this shortcut from Finvoroo.
 */

export function downloadSilentPrintShortcut() {
  const appUrl = window.location.href.split('#')[0];
  const bat = `@echo off
title Finvoroo POS
set "URL=${appUrl}"

if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
  start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app="%URL%"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
  start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app="%URL%"
  exit /b 0
)
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
  start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app="%URL%"
  exit /b 0
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
  start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --app="%URL%"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
  start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --app="%URL%"
  exit /b 0
)

echo Install Google Chrome or Microsoft Edge, then run this file again.
pause
`;

  const blob = new Blob([bat.replace(/\n/g, '\r\n')], { type: 'application/octet-stream' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = 'Finvoroo-POS-Print.bat';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
