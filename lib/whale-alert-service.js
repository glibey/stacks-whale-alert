import axios from 'axios';
import fs from 'fs';
import { TwitterApi } from 'twitter-api-v2';
import { generateWhaleAlertImage } from './image-generator.js';

const STACKS_API_URL = 'https://api.hiro.so/extended/v1/tx/';
const DEFAULT_FETCH_ATTEMPTS = [
  { limit: 20, unanchored: false, type: undefined },
  { limit: 10, unanchored: false, type: undefined },
  { limit: 10, unanchored: true, type: undefined },
  { limit: 10, unanchored: false, type: 'token_transfer' },
];

const knownLabels = {
  SP000000000000000000002Q6VF78: 'Stacks Protocol',
  SP1P72Z3704V2FEKBWRFM27M8MRWP240J05W6WRE: 'Binance',
  SP2788M6S8Y39NZZS0VTM1S7M9F9D67T5E7B78GNB: 'OKX',
};

export const createWhaleAlertService = ({
  minWhaleAmount = 100000,
  fetchAttempts = DEFAULT_FETCH_ATTEMPTS,
} = {}) => {
  const seenTx = new Set();
  const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  let cachedPrice = null;
  let lastFetched = 0;

  const getStxPrice = async () => {
    try {
      console.log('[price] Fetching STX price from CoinMarketCap');
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
        ? stxData.find((item) => item.slug === 'stacks' && item.symbol === 'STX')
        : stxData;
      const price = priceObj?.quote?.USD?.price || null;
      console.log(`[price] Success: STX price = $${price}`);
      return price;
    } catch (error) {
      console.error('[price] Error fetching STX price:', error.response?.status, error.response?.data || error.message);
      return null;
    }
  };

  const getCachedStxPrice = async () => {
    const now = Date.now();
    if (!cachedPrice || now - lastFetched > 1_800_000) {
      console.log('[price] Cache miss or expired, refreshing price');
      cachedPrice = await getStxPrice();
      lastFetched = now;
    } else {
      console.log('[price] Cache hit, using cached STX price');
    }
    return cachedPrice;
  };

  const cleanupImage = (imagePath) => {
    if (!imagePath || !fs.existsSync(imagePath)) {
      return;
    }

    console.log(`[notify] Cleaning up generated image ${imagePath}`);
    fs.unlinkSync(imagePath);
  };

  const sendToX = async (message, imagePath) => {
    if (imagePath) {
      console.log(`[notify:x] Uploading media to X from ${imagePath}`);
      const mediaId = await twitterClient.v1.uploadMedia(imagePath);
      await twitterClient.v2.tweet({
        text: message,
        media: { media_ids: [mediaId] },
      });
      return;
    }

    console.log('[notify:x] Posting text-only message to X');
    await twitterClient.v2.tweet(message);
  };

  const sendToTelegram = async (message, imagePath) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('[notify:telegram] Skipped: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return false;
    }

    if (imagePath && fs.existsSync(imagePath)) {
      console.log(`[notify:telegram] Sending Telegram photo from ${imagePath}`);
      const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      formData.append('caption', message);
      formData.append('photo', new Blob([fs.readFileSync(imagePath)]), 'whale-alert.png');

      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Telegram sendPhoto failed: ${response.status} ${errorBody}`);
      }

      return true;
    }

    console.log('[notify:telegram] Sending Telegram text-only message');
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(telegramApiUrl, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
    return true;
  };

  const sendTwitterAndTelegram = async (message, imagePath = null) => {
    console.log('[notify] Starting delivery to X and Telegram');
    let xSuccess = false;
    let telegramDelivered = false;

    try {
      await sendToX(message, imagePath);
      xSuccess = true;
      console.log('[notify:x] Success');
    } catch (err) {
      console.error('[notify:x] Error posting tweet:', err.response?.status, err.response?.data || err.message);
    }

    try {
      telegramDelivered = await sendToTelegram(message, imagePath);
      if (telegramDelivered) {
        console.log('[notify:telegram] Success');
      }
    } catch (err) {
      console.error('[notify:telegram] Error posting Telegram message:', err.response?.status, err.response?.data || err.message);
    }

    if (imagePath && xSuccess && (telegramDelivered || (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID))) {
      cleanupImage(imagePath);
    } else if (imagePath) {
      console.log('[notify] Keeping generated image because one or more deliveries did not succeed');
    }

    console.log('[notify] Delivery step finished');
  };

  const resolveBnsName = async (address) => {
    if (knownLabels[address]) {
      console.log(`[bns] Known label hit for ${address}: ${knownLabels[address]}`);
      return knownLabels[address];
    }
    try {
      console.log(`[bns] Resolving BNS for ${address}`);
      const { data } = await axios.get(`https://api.hiro.so/v1/addresses/stacks/${address}/names`);
      if (data.names && data.names.length > 0) {
        console.log(`[bns] Success: ${address} -> ${data.names[0]}`);
        return data.names[0];
      }
    } catch (err) {
      console.error('[bns] Error resolving BNS:', err.response?.status, err.response?.data || err.message);
    }
    console.log(`[bns] No BNS found for ${address}`);
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
    for (const attempt of fetchAttempts) {
      try {
        console.log(`[fetch] Attempt limit=${attempt.limit} unanchored=${attempt.unanchored} type=${attempt.type || 'any'}`);
        const { data } = await axios.get(STACKS_API_URL, {
          params: {
            order: 'desc',
            sort_by: 'block_height',
            exclude_function_args: true,
            limit: attempt.limit,
            unanchored: attempt.unanchored,
            ...(attempt.type ? { type: attempt.type } : {}),
          },
        });

        console.log(`[fetch] Success: received ${data.results?.length || 0} transactions`);
        return data.results || [];
      } catch (err) {
        const status = err.response?.status;
        const code = err.response?.data?.code;
        console.error('[fetch] Error fetching transactions:', status, err.response?.data || err.message);

        if (!(status === 500 && code === '57014')) {
          throw err;
        }

        console.log('[fetch] Retrying after Hiro statement timeout');
      }
    }

    throw new Error('Hiro recent transactions API timed out for all retry attempts');
  };

  const processTransaction = async (tx) => {
    const txId = tx.tx_id;
    if (seenTx.has(txId)) {
      console.log(`[tx:${txId}] Skipped: already seen`);
      return;
    }

    console.log(`[tx:${txId}] Processing transaction`);
    const transfer = tx?.token_transfer;
    const sender = tx?.sender_address || transfer?.sender_address;
    const recipient = transfer?.recipient_address;

    if (!sender || !recipient) {
      console.log(`[tx:${txId}] Skipped: missing sender or recipient`);
      seenTx.add(txId);
      return;
    }

    const amountStx = (transfer.amount || 0) / 1e6;
    console.log(`[tx:${txId}] Parsed amount=${amountStx} sender=${sender} recipient=${recipient}`);

    if (amountStx >= minWhaleAmount) {
      console.log(`[tx:${txId}] Whale threshold met, enriching transfer`);
      const [price, senderName, recipientName] = await Promise.all([
        getCachedStxPrice(),
        resolveBnsName(sender),
        resolveBnsName(recipient),
      ]);

      const usdAmount = price
        ? (amountStx * price).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
        : '-';
      const classification = classifyTransaction(amountStx);
      const senderDisplay = senderName
        ? `${senderName} (${sender.slice(0, 6)}...${sender.slice(-4)})`
        : `${sender.slice(0, 6)}...${sender.slice(-4)}`;
      const recipientDisplay = recipientName
        ? `${recipientName} (${recipient.slice(0, 6)}...${recipient.slice(-4)})`
        : `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
      const message = `${classification} Alert! 🚨\n\n💰 ${amountStx.toLocaleString()} #STX (${usdAmount})\n\n📤 From: ${senderDisplay}\n📥 To: ${recipientDisplay}\n\n🔗 Explorer: https://explorer.stacks.co/txid/${txId}`;

      let imagePath = null;
      try {
        console.log(`[tx:${txId}] Generating whale alert image`);
        imagePath = await generateWhaleAlertImage({
          amount: amountStx,
          classification,
          usdAmount,
          sender: senderName || `${sender.slice(0, 8)}...`,
          recipient: recipientName || `${recipient.slice(0, 8)}...`,
        });
        console.log(`[tx:${txId}] Image generated: ${imagePath}`);
      } catch (err) {
        console.error(`[tx:${txId}] Error generating image:`, err.message);
      }

      if (!imagePath) {
        console.log(`[tx:${txId}] Continuing without image, text-only alert will be sent`);
      }

      console.log(`[tx:${txId}] Sending alert`);
      await sendTwitterAndTelegram(message, imagePath);
      console.log(`[tx:${txId}] Alert send flow finished`);
    } else {
      console.log(`[tx:${txId}] Skipped: below whale threshold (${amountStx} STX)`);
    }

    seenTx.add(txId);
    console.log(`[tx:${txId}] Completed`);
  };

  const fetchTransfers = async () => {
    try {
      console.log('[run] Fetching latest STX transactions');
      const transactions = await fetchRecentTransactions();
      const tokenTransfers = transactions.filter((tx) => tx?.tx_type === 'token_transfer' || tx?.token_transfer);
      console.log(`[run] Filtered ${tokenTransfers.length} token transfers from ${transactions.length} recent transactions`);
      await Promise.all(tokenTransfers.map(processTransaction));
      console.log('[run] Transfer processing finished');
    } catch (err) {
      console.error('[run] Error fetching transactions:', err.response?.status, err.response?.data || err.message);
    }
  };

  return {
    fetchTransfers,
  };
};
