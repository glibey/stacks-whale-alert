export const demoAlert = {
  txId: '0xdemo7f3b3c1a9e5d4c2b8a6f0e1d9c7b5a3f1e8d6c4b2a091827364554637281',
  amount: 284_750,
  price: 2.31,
  usdAmount: '$657,772.50',
  classification: '🐋 Humpback Whale',
  sender: 'binance.btc',
  recipient: 'mega-vault.stx',
  senderAddress: 'SP1P72Z3704V2FEKBWRFM27M8MRWP240J05W6WRE',
  recipientAddress: 'SP2J8EVYHPQ2X3D3J9R1M5QKZ8R6T4GZC4E1J7M9Q',
  timestamp: 1715002200,
};

export const demoTransactions = [
  {
    id: '0xdemo001',
    amount: 284_750,
    sender: 'SP1P72...WRE',
    recipient: 'SP2J8E...M9Q',
    timestamp: 1715002200,
    classification: { label: 'Humpback Whale', icon: '🐋' },
  },
  {
    id: '0xdemo002',
    amount: 612_000,
    sender: 'SP0000...VF78',
    recipient: 'SP3K8W...0MF',
    timestamp: 1714998600,
    classification: { label: 'Mega Whale', icon: '🐳' },
  },
  {
    id: '0xdemo003',
    amount: 143_500,
    sender: 'SP2788...GNB',
    recipient: 'SP12QP...ZJ5',
    timestamp: 1714995000,
    classification: { label: 'Whale', icon: '🦈' },
  },
  {
    id: '0xdemo004',
    amount: 88_400,
    sender: 'SP3F4A...R72',
    recipient: 'SP2C1D...Q10',
    timestamp: 1714991400,
    classification: { label: 'Shark', icon: '🦈' },
  },
  {
    id: '0xdemo005',
    amount: 21_900,
    sender: 'SP1R5N...V6M',
    recipient: 'SP2Y3T...A1X',
    timestamp: 1714987800,
    classification: { label: 'Dolphin', icon: '🐬' },
  },
];

export const demoMetrics = {
  price: 2.31,
  change: 6.42,
  dailyVolumeUsd: 91_400_000,
  activeWhales: 37,
  networkBlock: '143,208',
};

export const demoChartData = [
  { label: '00:00', price: 2.08 },
  { label: '04:00', price: 2.11 },
  { label: '08:00', price: 2.16 },
  { label: '12:00', price: 2.19 },
  { label: '16:00', price: 2.24 },
  { label: '20:00', price: 2.29 },
  { label: 'Now', price: 2.31 },
];

export const buildDemoMessage = (alert = demoAlert) =>
  `${alert.classification} Alert! 🚨\n\n💰 ${alert.amount.toLocaleString()} #STX (${alert.usdAmount})\n\n📤 From: ${alert.sender} (${alert.senderAddress.slice(0, 6)}...${alert.senderAddress.slice(-4)})\n📥 To: ${alert.recipient} (${alert.recipientAddress.slice(0, 6)}...${alert.recipientAddress.slice(-4)})\n\n🔗 Explorer: https://explorer.stacks.co/txid/${alert.txId}`;
