// Регистрация Service Worker
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', function() {
//       navigator.serviceWorker.register('/sw.js')
//         .then(function(registration) {
//           console.log('ServiceWorker зарегистрирован:', registration.scope);
//         })
//         .catch(function(err) {
//           console.log('Ошибка регистрации ServiceWorker:', err);
//         });
//     });
//   }

const VAPID_PUBLIC_KEY = 'BANyYVYp6Ne3cULh5y8QE9NWuPXtTpwPUc3DJllSANezWTM-jkKu8Ma29JbMveNJyv_bA_B3u_wSuQi2j1cyUtg'
const VAPID_PRIVATE_KEY='VH6lg8zKldw7AxC6zB1vcUmOXP6DAzItk4LtmeVWCj4'
const VAPID_EMAIL='your@email.com'
const PORT='3000'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
      try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('ServiceWorker зарегистрирован:', registration.scope);
          
          // Получаем текущую подписку пользователя
          const currentSubscription = await registration.pushManager.getSubscription();
          console.log('Уже подписаны:', currentSubscription);
          
          // Отображаем статус подписки в UI
          displaySubscriptionStatus(currentSubscription);
      } catch (err) {
          console.error('Ошибка регистрации ServiceWorker:', err);
      }
  });
}

// Показываем текущий статус подписки в интерфейсе
function displaySubscriptionStatus(subscription) {
  const button = document.getElementById('subscribeButton');
  if (subscription) {
      button.textContent = 'Отписаться';
      button.disabled = false;
  } else {
      button.textContent = 'Подписаться';
      button.disabled = false;
}
}

// Преобразуем строку VAPID ключа в массив байтов
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Подписываем или отписываем пользователя
async function handleSubscriptionChange(button) {
  const swRegistration = await navigator.serviceWorker.ready;
  const existingSubscription = await swRegistration.pushManager.getSubscription();

  if (existingSubscription) {
      await existingSubscription.unsubscribe();
      button.textContent = 'Подписаться';
      console.log('Пользователь успешно отписан.');
      fetch('/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: existingSubscription.endpoint })
      }).then(response => {
        if (!response.ok) {
          console.error('Ошибка удаления подписки на сервере:', response.statusText);
        }
      });
  } else {
      button.textContent = 'Ждите...';
      const convertedPublicKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const newSubscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedPublicKey
      });

      // Отправляем подписчика на сервер
      fetch('/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSubscription),
      }).then(response => {
          if (response.ok) {
              button.textContent = 'Отписаться';
              console.log('Пользователь успешно подписан.');
          } else {
              console.error('Ошибка отправки подписки на сервер.');
          }
      });
  }
}