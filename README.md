# Stacks Whale Alert

Сервіс для моніторингу великих переказів STX у мережі Stacks. Проєкт складається з двох основних частин:

1. **Node.js бот** — перевіряє останні транзакції, відбирає великі перекази, збагачує їх даними та відправляє алерти у X і Telegram.
2. **Dashboard на React/Vite** — окремий фронтенд для перегляду останніх транзакцій і ціни STX.

## Як це працює

### 1. Бот моніторингу
Основна логіка знаходиться у `index.js`.

Поточний сценарій роботи:
- бот отримує останні транзакції з Hiro API;
- обробляє token transfer транзакції;
- переводить amount із micro-STX у STX;
- фільтрує транзакції від налаштованого whale-порогу, який за замовчуванням дорівнює **100,000 STX**;
- застосовує відомі мітки адрес і виконує legacy BNS lookup через Hiro тільки при явному увімкненні;
- отримує актуальну ціну STX з CoinMarketCap з кешем на 30 хвилин;
- класифікує переказ як `Mega Whale`, `Humpback Whale`, `Shark`, `Dolphin` або `Fish`;
- генерує PNG-картинку алерту через `canvas`;
- публікує повідомлення у X і Telegram;
- зберігає seen-транзакції, історію алертів, підписки та wallet labels у локальному data store;
- може розсилати matching-алерти в webhook і Discord канали на рівні підписок;
- видаляє тимчасове зображення після відправки.

Корисні точки входу:
- `index.js` — довгоживучий процес для локального запуску;
- `api/check-transfers.js` — serverless-обробник для запуску через Vercel Cron.

### 2. Serverless / Vercel сценарій
У `vercel.json` налаштований cron:
- `GET /api/check-transfers`
- розклад: `0 10 * * *` (щодня о 10:00 UTC)

Цей handler викликає ту саму логіку перевірки великих переказів, що і локальний бот.

### 3. Dashboard
Папка `dashboard/` містить окремий React-додаток на Vite.

Dashboard:
- запитує останні token transfer транзакції з Hiro API;
- отримує поточну ціну STX з Binance API;
- показує останні 15 транзакцій;
- оновлює стрічку приблизно кожні 30 секунд;
- відображає мокові дані для графіка 24h trend.

## Структура проєкту

```text
.
├── api/
│   └── check-transfers.js
├── dashboard/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       └── main.jsx
├── lib/
│   └── image-generator.js
├── index.html
├── index.js
├── package.json
└── vercel.json
```

### Що за що відповідає
- `index.js` — локальний бот, який стартує одразу і перевіряє транзакції кожні 60 секунд.
- `api/check-transfers.js` — API endpoint для serverless-запуску.
- `lib/image-generator.js` — генерація PNG-картки для соцмереж.
- `dashboard/src/App.jsx` — основний інтерфейс dashboard.
- `index.html` — простий статичний HTML-файл у корені, не є React dashboard.
- `vercel.json` — Vercel cron-конфігурація.

## Вимоги

- Node.js 18+
- npm
- доступ до інтернету для:
  - Hiro API
  - CoinMarketCap API
  - X API
  - Telegram Bot API
  - Binance API (для dashboard)

## Встановлення

### Кореневий застосунок
```bash
npm install
```

### Dashboard
```bash
cd dashboard
npm install
```

## Змінні середовища

Створіть `.env` у корені проєкту:

```env
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_secret
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
COINMARKETCAP_API_KEY=your_cmc_key
STX_WHALE_THRESHOLD=100000
ENABLE_LEGACY_BNS_LOOKUP=false
DATA_DIR=./data
KNOWN_WALLET_LABELS_JSON={"SP123":"Treasury"}
STRIPE_PAYMENT_LINK_PRO=https://buy.stripe.com/...
STRIPE_PAYMENT_LINK_TEAM=https://buy.stripe.com/...
```

### Для чого вони потрібні
- `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET` — публікація у X.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — відправка повідомлень у Telegram.
- `COINMARKETCAP_API_KEY` — отримання ціни STX для обчислення USD-еквівалента.
- `STX_WHALE_THRESHOLD` — мінімальна сума переказу в STX, яка запускає алерт.
- `ENABLE_LEGACY_BNS_LOOKUP` — opt-in перемикач для старого Hiro BNS endpoint. За замовчуванням вимкнений, бо endpoint зараз повертає `404`.
- `DATA_DIR` — шлях для локального JSON-сховища.
- `KNOWN_WALLET_LABELS_JSON` — необовʼязкова JSON-мапа для перевизначення labels адрес.
- `STRIPE_PAYMENT_LINK_PRO`, `STRIPE_PAYMENT_LINK_TEAM` — необовʼязкові Stripe payment links, які віддає checkout API.

> Якщо Telegram-змінні не задані, Telegram-відправка просто не спрацює. Hiro API використовується напряму і окремої змінної для нього зараз немає.

## Команди

### У корені проєкту
З `package.json` доступні такі скрипти:

```bash
npm start
```
Запускає `node index.js` і стартує бот моніторингу.

```bash
npm test
```
Запускає базові `node:test` smoke-тести для конфігурації та генерації PNG.

### У `dashboard/`

```bash
npm run dev
```
Запускає Vite dev server.

```bash
npm run build
```
Збирає production-білд dashboard.

```bash
npm run preview
```
Локально переглядає production-збірку.

```bash
npm run lint
```
Запускає ESLint для dashboard.

## Локальний запуск

### Запуск бота
```bash
npm start
```

Після старту бот:
- одразу виконує одну перевірку;
- далі повторює перевірку кожні 60 секунд через `setInterval`.

### Запуск dashboard
```bash
cd dashboard
npm run dev
```

## Зовнішні сервіси та API

Проєкт використовує:
- **Hiro API** — отримання транзакцій і, за потреби, legacy BNS-імен;
- **CoinMarketCap API** — поточна ціна STX для алертів;
- **X API** через `twitter-api-v2` — публікація постів;
- **Telegram Bot API** — надсилання повідомлень у Telegram;
- **Binance API** — ціна STX у dashboard.

## Management API

- `GET /api/alerts` — список останніх збережених алертів.
- `GET /api/health` — health check і статус storage mode.
- `GET|POST|PUT|DELETE /api/subscriptions` — керування alert-підписками.
- `GET|POST|DELETE /api/wallet-labels` — керування локальними wallet labels.
- `GET /api/plans` — каталог планів і лімітів.
- `GET /api/checkout-link?plan=pro` — видає налаштоване Stripe payment link.

## Поточні особливості реалізації

- Поріг whale-транзакції задається через `STX_WHALE_THRESHOLD` і за замовчуванням дорівнює **100,000 STX**.
- У памʼяті зберігається `seenTx`, тому дублікати відсікаються лише в межах поточного процесу.
- Локальний data store зберігає seen-транзакції та історію алертів між локальними рестартами.
- Якщо задано `DATABASE_URL`, застосунок автоматично переключається на Neon Postgres і створює потрібні таблиці та індекси при першому використанні.
- Без `DATABASE_URL` на Vercel/serverless data directory за замовчуванням переключається на `/tmp`, який можна записувати, але він не є довговічним.
- Demo image script пише PNG у системну тимчасову директорію, а не в корінь репозиторію.
- У dashboard частина статистики і графік зараз заповнені моковими значеннями.
- Кореневий `index.html` — це окрема проста HTML-сторінка, а не production-вхід у React dashboard.

## Швидкі посилання по коду

- Локальний бот: `index.js:1-190`
- Serverless endpoint: `api/check-transfers.js:1-184`
- Генератор зображень: `lib/image-generator.js:1-94`
- Dashboard app: `dashboard/src/App.jsx:1-199`
- Dashboard entry: `dashboard/src/main.jsx:1-10`
- Кореневі скрипти: `package.json:1-20`
- Dashboard scripts: `dashboard/package.json:1-32`
- Vercel cron: `vercel.json:1-6`
