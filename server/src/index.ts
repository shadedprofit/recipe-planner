/* istanbul ignore file */
import { createApp } from './app';

const port = parseInt(process.env.PORT ?? '3001', 10);
const app = createApp();

app.listen(port, () => {
  console.log(`Recipe planner server listening on port ${port}`);
});
