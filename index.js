import axios from 'axios';
import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';
import { generateWhaleAlertImage } from './lib/image-generator.js';
import fs from 'fs';

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
const MIN_WHALE_AMOUNT = 100000; // STX

// APIs
const STACKS_API_URL = 'https://api.hiro.so/extended/v1/tx/';

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

const sendTwitterAndTelegram = async (message, imagePath = null) => {
  // Twitter
  try {
    if (imagePath) {
      console.log('Uploading media to Twitter...');
      const mediaId = await twitterClient.v1.uploadMedia(imagePath);
      await twitterClient.v2.tweet({
        text: message,
        media: { media_ids: [mediaId] }
      });
    } else {
      await twitterClient.v2.tweet(message);
    }
    console.log('Tweeted successfully');
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
  }

  // Cleanup image
  if (imagePath && fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
};

// Known Addresses mapping
const knownLabels = {
  'SP000000000000000000002Q6VF78': 'Stacks Protocol',
  'SP1P72Z3704V2FEKBWRFM27M8MRWP240J05W6WRE': 'Binance',
  'SP2788M6S8Y39NZZS0VTM1S7M9F9D67T5E7B78GNB': 'OKX',
  // Add more as needed
};

const resolveBnsName = async (address) => {
  if (knownLabels[address]) return knownLabels[address];
  try {
    const { data } = await axios.get(`https://api.hiro.so/v1/addresses/stacks/${address}/names`);
    if (data.names && data.names.length > 0) {
      return data.names[0]; // Returns the first registered name
    }
  } catch (err) {
    // Silently fail
  }
  return null;
};

const classifyTransaction = (amountStx) => {
  if (amountStx >= 500_000) return '🐳 Mega Whale';
  if (amountStx >= 250_000) return '🐋 Humpback Whale';
  if (amountStx >= 100_000) return '🦈 Shark';
  if (amountStx >= 50_000) return '🐬 Dolphin';
  return '🐠 Fish';
};

const fetchRecentTransactions = async () => {
  const attempts = [
    { limit: 20, unanchored: false },
    { limit: 10, unanchored: false },
    { limit: 10, unanchored: true },
  ];

  for (const attempt of attempts) {
    try {
      const { data } = await axios.get(STACKS_API_URL, {
        params: {
          type: 'token_transfer',
          order: 'desc',
          sort_by: 'block_height',
          exclude_function_args: true,
          limit: attempt.limit,
          unanchored: attempt.unanchored,
        },
      });
      return data.results || [];
    } catch (err) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      console.error('Error fetching transactions:', status, err.response?.data || err.message);

      if (!(status === 500 && code === '57014')) {
        throw err;
      }
    }
  }

  throw new Error('Hiro recent transactions API timed out for all retry attempts');
};

const processTransaction = async (tx) => {
  const txId = tx.tx_id;
  if (seenTx.has(txId)) return;

  const transfer = tx?.token_transfer;
  if (!transfer?.sender_address || !transfer?.recipient_address) {
    seenTx.add(txId);
    return;
  }

  const amountStx = (transfer.amount || 0) / 1e6;
  const sender = transfer.sender_address;
  const recipient = transfer.recipient_address;

  if (amountStx >= MIN_WHALE_AMOUNT) {
    const [price, senderName, recipientName] = await Promise.all([
      getCachedStxPrice(),
      resolveBnsName(sender),
      resolveBnsName(recipient)
    ]);

    const usdAmount = price ? (amountStx * price).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-';
    const classification = classifyTransaction(amountStx);

    const senderDisplay = senderName ? `${senderName} (${sender.slice(0, 6)}...${sender.slice(-4)})` : `${sender.slice(0, 6)}...${sender.slice(-4)}`;
    const recipientDisplay = recipientName ? `${recipientName} (${recipient.slice(0, 6)}...${recipient.slice(-4)})` : `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;

    const message = `${classification} Alert! 🚨\n\n💰 ${amountStx.toLocaleString()} #STX (${usdAmount})\n\n📤 From: ${senderDisplay}\n📥 To: ${recipientDisplay}\n\n🔗 Explorer: https://explorer.stacks.co/txid/${txId}`;

    // Generate Visual Image
    let imagePath = null;
    try {
      imagePath = await generateWhaleAlertImage({
        amount: amountStx,
        classification,
        usdAmount,
        sender: senderName || `${sender.slice(0, 8)}...`,
        recipient: recipientName || `${recipient.slice(0, 8)}...`,
      });
    } catch (err) {
      console.error('Error generating image:', err.message);
    }

    await sendTwitterAndTelegram(message, imagePath);
  }

  seenTx.add(txId);
};

const fetchTransfers = async () => {
  try {
    console.log('Fetching latest STX transactions...');
    const transactions = await fetchRecentTransactions();
    await Promise.all(transactions.map(processTransaction));
  } catch (err) {
    console.error('Error fetching transactions:', err.response?.status, err.response?.data || err.message);
  }
};

// Scheduler
(async () => {
  await fetchTransfers();
  setInterval(fetchTransfers, 600_000); // every 10 min
})();
