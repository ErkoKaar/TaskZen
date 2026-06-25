self.addEventListener("push", function (event) {
  if (!event.data) return
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    data: { url: data.url || "/" },
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", function (event) {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    }),
  )
})
