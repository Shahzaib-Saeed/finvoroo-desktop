import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Embeds a unique build id in the bundle and writes public/version.json on build.
 * The running app polls version.json; when it changes after a deploy, users get
 * a refresh prompt (or auto-reload when returning to the tab).
 */
export function buildVersionPlugin() {
  const buildId =
    process.env.VITE_BUILD_ID ||
    process.env.GITHUB_SHA?.slice(0, 12) ||
    `${Date.now()}`;

  return {
    name: 'build-version',
    config() {
      return {
        define: {
          __APP_BUILD_ID__: JSON.stringify(buildId),
        },
      };
    },
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        '<head>\n    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n    <meta http-equiv="Pragma" content="no-cache" />\n    <meta http-equiv="Expires" content="0" />',
      );
    },
    closeBundle() {
      const outDir = process.env.VITE_OUT_DIR || 'dist';
      const payload = JSON.stringify(
        {
          buildId,
          builtAt: new Date().toISOString(),
        },
        null,
        2,
      );
      writeFileSync(resolve(process.cwd(), outDir, 'version.json'), payload);
    },
  };
}
