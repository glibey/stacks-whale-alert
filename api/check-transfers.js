import axios from 'axios';
import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';

// Twitter API
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

const sendTwitterAndTelegram = async (message) => {
  // Twitter
  try {
    await twitterClient.v2.tweet(message);
    console.log(message);
  } catch (err) {
    console.error('Error posting tweet:', err.message);
  }

  // Telegram
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      await axios.post(telegramApiUrl, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      });
      console.log('Sent Telegram message');
    } catch (err) {
      console.error('Error posting Telegram message:', err.message);
    }
  } else {
    console.warn('Telegram credentials not configured.');
  }
};

const processTransaction = async (tx) => {
  const txId = tx.tx_id;
  if (seenTx.has(txId)) return;

  const amountStx = (tx?.token_transfer?.amount || 0) / 1e6;

  if (amountStx >= MIN_WHALE_AMOUNT) {
    const price = await getCachedStxPrice();
    const usdAmount = price ? (amountStx * price).toFixed(2) : '-';
    const message = `🐳 Whale Alert! 🚨\n\n#Stacks #STX Transfer: ${amountStx.toFixed(2)} STX ($${usdAmount})\nTx: https://explorer.stacks.co/txid/${txId}`;

    await sendTwitterAndTelegram(message);
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

export default async function handler(req, res) {
  try {
    await fetchTransfers();
    res.status(200).json({ message: 'Whale transfer check completed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}