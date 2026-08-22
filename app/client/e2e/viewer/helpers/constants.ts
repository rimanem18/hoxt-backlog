/**
 * e2eコンテナからserverコンテナへ直接到達するためのベースURL。
 * ブラウザ（page.route経由）とNode側（直接fetch）の両方から共通で使う。
 * Docker Composeのサービス名解決であり、`NEXT_PUBLIC_API_BASE_URL`の`localhost`とは
 * 別物（knowledge/e2e/e2e-container-cannot-reach-server-via-localhost.md参照）。
 */
export const SERVER_BASE_URL = 'http://server:3001';

/** ブラウザから見た（実際には到達できない）APIベースURL。page.routeの横取り対象。 */
export const BROWSER_API_BASE_URL = 'http://localhost:3001';
