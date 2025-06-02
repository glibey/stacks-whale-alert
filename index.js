import express from 'express';
import axios from 'axios';
import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';

const PORT = process.env.PORT || 3000;
const app = express();

// Twitter API
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Whale threshold
const MIN_WHALE_AMOUNT = 100; // STX

// APIs
const STACKS_API_URL = 'https://api.hiro.so/extended/v1/tx?unanchored=true&sort=desc';

// Seen transactions
const seenTx = new Set();

// Caching STX price
let cachedPrice = null;
let lastFetched = 0;

const getStxPrice = async () => {
  try {
    console.log('Fetching STX price from CoinMarketCap...');
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=STX',
      {
        headers: {
          'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
        },
      }
    );
    const stxData = response?.data?.data?.STX;
    const priceObj = Array.isArray(stxData)
      ? stxData.find(o => o.slug === 'stacks' && o.symbol === 'STX')
      : stxData;
    const price = priceObj?.quote?.USD?.price || null;
    console.log(`STX price = $${price}`);
    return price;
  } catch (error) {
    console.error('Error fetching STX price:', error.message);
    return null;
  }
};

const getCachedStxPrice = async () => {
  const now = Date.now();
  if (!cachedPrice || now - lastFetched > 1_800_000) { // 30 min
    cachedPrice = await getStxPrice();
    lastFetched = now;
  }
  return cachedPrice;
};

const processTransaction = async (tx) => {
  const txId = tx.tx_id;
  if (seenTx.has(txId)) return;

  const amountStx = (tx?.token_transfer?.amount || 0) / 1e6;

  if (amountStx >= MIN_WHALE_AMOUNT) {
    const price = await getCachedStxPrice();
    const usdAmount = price ? (amountStx * price).toFixed(2) : '-';
    const tweetText = `🐳 Whale Alert! 🚨\n\n#Stacks #STX Transfer: ${amountStx.toFixed(2)} STX ($${usdAmount})\nTx: https://explorer.stacks.co/txid/${txId}`;
    try {
      await twitterClient.v2.tweet(tweetText);
      console.log(`Tweeted: ${tweetText}`);
    } catch (err) {
      console.error('Error posting tweet:', err.message);
    }
  }

  seenTx.add(txId);
};

const fetchTransfers = async () => {
  try {
    console.log('Fetching latest STX transactions...');
    const { data } = await axios.get(`${STACKS_API_URL}&limit=50`);
    const transactions = data.results || [];
    await Promise.all(transactions.map(processTransaction));
  } catch (err) {
    console.error('Error fetching transactions:', err.message);
  }
};

// Service status
app.get('/', (req, res) => {
  res.send('Stacks Whale Alert Service is running.');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Scheduler
(async () => {
  await fetchTransfers();
  setInterval(fetchTransfers, 600_000); // every 10 min
})();
