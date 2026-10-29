import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[Server] AI Editorial Workspace server running on port ${PORT}`);
  console.log(`[Server] Health check available at http://localhost:${PORT}/api/health`);
  console.log(`[Server] LLM Mock mode: ${process.env.LLM_MOCK === 'true' ? 'ACTIVE' : 'OFF'}`);
});

