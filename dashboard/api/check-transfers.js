import { getMinWhaleAmount } from '../server/config.js';
import { createWhaleAlertService } from '../server/whale-alert-service.js';

const { fetchTransfers } = createWhaleAlertService({
  minWhaleAmount: getMinWhaleAmount(),
});

export default async function handler(req, res) {
  try {
    console.log('[api] /api/check-transfers invoked');
    await fetchTransfers();
    console.log('[api] /api/check-transfers completed successfully');
    res.status(200).json({ message: 'Whale transfer check completed.' });
  } catch (err) {
    console.error('[api] Handler error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
