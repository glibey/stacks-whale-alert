import axios from 'axios';
import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';

// Twitter API setup
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Whale threshold
const MIN_WHALE_AMOUNT = 10000; // STX

// Stacks API endpoint
const STACKS_API_URL = 'https://api.hiro.so/extended/v1/tx?unanchored=true&sort=desc';

// Seen tx set to avoid duplicates
const seenTx = new Set();

let cachedPrice = null;
let lastFetched = 0;

const getCachedStxPrice = async () => {
  const now = Date.now();
  if (!cachedPrice || now - lastFetched > 1_300_000) { // 30 minutes
    cachedPrice = await getStxPrice();
    lastFetched = now;
  }
  return cachedPrice;
};

const getStxPrice = async () => {
  try {
    const { data } = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      { params: { ids: 'blockstack', vs_currencies: 'usd' } }
    );
    return data?.blockstack?.usd || null;
  } catch (error) {
    console.error('Error fetching STX price:', error.message);
    return null;
  }
};

const fetchTransfers = async () => {
  try {
    const { data } = await axios.get(`${STACKS_API_URL}?limit=50`);
    const transactions = data.results || [];
    for (const tx of transactions) {
      const txId = tx.tx_id;
      if (seenTx.has(txId)) continue;

      const amountStx = (tx?.token_transfer?.amount || 0) / 1e6;

      if (amountStx >= MIN_WHALE_AMOUNT) {
        const price = await getCachedStxPrice();
        const fromAddress = tx.sender_address;
        const toAddress = tx?.token_transfer?.recipient_address;
        const usdAmount = price ? amountStx * price: '-';
        const tweetText = `🐳 Whale Alert! 🚨 \n\n` +
                          `#Stacks #STX Transfer: ${Number(amountStx).toFixed(2)} STX ($${usdAmount})\n` +
                          `Tx: https://explorer.stacks.co/txid/${txId}`;

        await twitterClient.v2.tweet(tweetText);
        console.log(tweetText);
      }

      seenTx.add(txId);
    }
  } catch (err) {
    console.error('Error fetching or posting:', err);
  }
};

setInterval(fetchTransfers, 600000);
