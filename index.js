import 'dotenv/config';
import { createWhaleAlertService } from './lib/whale-alert-service.js';

const { fetchTransfers } = createWhaleAlertService({
  minWhaleAmount: 100000,
});

// Scheduler
(async () => {
  console.log('[run] Starting whale alert bot');
  await fetchTransfers();
  console.log('[run] Initial fetch complete, scheduling every 60 seconds');
  setInterval(fetchTransfers, 60_000);
})();
