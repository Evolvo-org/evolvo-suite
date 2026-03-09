import { defineConfig } from 'cypress';

export default defineConfig({
  allowCypressEnv: false,
  video: false,
  e2e: {
    baseUrl: 'http://localhost:3001',
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    supportFile: false,
  },
});
