// NOTE: https://stackoverflow.com/questions/41009167/what-is-the-use-of-self-clients-claim
self.addEventListener('install', async (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', async (event) => {
  event.waitUntil(self.clients.claim())
})
