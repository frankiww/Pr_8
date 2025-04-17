require('dotenv').config();
const express = require('express');
const webPush = require('web-push');
const path = require('path');

const VAPID_PUBLIC_KEY = 'BANyYVYp6Ne3cULh5y8QE9NWuPXtTpwPUc3DJllSANezWTM-jkKu8Ma29JbMveNJyv_bA_B3u_wSuQi2j1cyUtg';
const VAPID_PRIVATE_KEY ='VH6lg8zKldw7AxC6zB1vcUmOXP6DAzItk4LtmeVWCj4';
const VAPID_EMAIL='your@email.com';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/frontend')));
app.use(express.static(path.join(__dirname, '/')));
app.use(express.static(path.join(__dirname, '/icons')));




// Инициализация VAPID
webPush.setVapidDetails(
  `mailto:${VAPID_EMAIL}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Хранилище подписок
let subscriptions = [];

app.get("/", (req,res) => {
  res.sendFile(path.join(__dirname, "/frontend/index.html"));
});

// API для подписки
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscriptions.some(s => s.endpoint === subscription.endpoint)) {
    subscriptions.push(subscription);
    console.log('Добавлена подписка:', subscription.endpoint);
  }
  res.status(201).json({});
});

// API для отписки
app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
  console.log('Удалена подписка:', endpoint);
  res.status(200).json({});
});

// Отправка уведомлений
app.post('/send-notification', (req, res) => {
  const { title, body } = req.body;
  
  const payload = JSON.stringify({
    title: title,
    body: body,
    icon: '/icons/web-app-manifest-192x192.png',
    url: '/'
  });

  const results = [];
  const promises = subscriptions.map(sub => 
    webPush.sendNotification(sub, payload)
      .then(() => results.push({ status: 'success', endpoint: sub.endpoint }))
      .catch(err => {
        console.error('Ошибка отправки:', err);
        results.push({ status: 'error', endpoint: sub.endpoint, error: err.message });
      })
  );

  Promise.all(promises)
    .then(() => res.json({ results }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/subscribers-count', (req, res) => {
  const count = subscriptions.length;
  res.json({count});

});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log('VAPID Public Key:', VAPID_PUBLIC_KEY);
});