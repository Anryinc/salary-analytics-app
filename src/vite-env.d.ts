/// <reference types="vite/client" />

/** Версия приложения из package.json (подставляется Vite при сборке). */
declare const __APP_VERSION__: string;
/** Короткий SHA коммита сборки (GITHUB_SHA в CI) или "dev". */
declare const __APP_COMMIT__: string;
