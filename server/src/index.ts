/* istanbul ignore file */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './app';

const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const port = parseInt(process.env.PORT ?? '3001', 10);
const app = createApp();

app.listen(port, () => {
  console.log(`Recipe planner server listening on port ${port}`);
});
