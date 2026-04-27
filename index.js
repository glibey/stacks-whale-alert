import 'dotenv/config';
import { getMinWhaleAmount } from './lib/config.js';
import { createWhaleAlertService } from './lib/whale-alert-service.js';

const { fetchTransfers } = createWhaleAlertService({
  minWhaleAmount: getMinWhaleAmount(),
});

// Scheduler
(async () => {
  console.log('[run] Starting whale alert bot');
  await fetchTransfers();
  console.log('[run] Initial fetch complete, scheduling every 60 seconds');
  setInterval(fetchTransfers, 60_000);
})();
