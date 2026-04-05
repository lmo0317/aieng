import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'trend-english',
  brand: {
    displayName: '트렌드 잉글리시',
    primaryColor: '#5b5bd6',
    icon: 'https://aieng.cafe24app.com/logo/trend-eng-logo-600x600.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  webViewProps: {
    type: 'partner',
    bounces: true,
    pullToRefreshEnabled: false,
    allowsBackForwardNavigationGestures: true,
  },
  permissions: [],
});
