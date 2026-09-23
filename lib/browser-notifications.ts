const DISMISS_KEY = "chance-invite-notif-dismissed"

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window
}

export function inviteNotificationPermission(): NotificationPermission | "unsupported" {
  if (!canUseBrowserNotifications()) return "unsupported"
  return Notification.permission
}

export function inviteNotificationsDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

export function dismissInviteNotificationPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, "1")
  } catch {
    /* ignore */
  }
}

export async function requestInviteNotifications() {
  if (!canUseBrowserNotifications()) return "unsupported" as const
  if (Notification.permission === "granted") return "granted" as const
  if (Notification.permission === "denied") return "denied" as const
  const result = await Notification.requestPermission()
  return result
}

export function showInviteNotification(title: string, body: string, href: string) {
  if (!canUseBrowserNotifications() || Notification.permission !== "granted") return
  const notification = new Notification(title, {
    body,
    icon: "/chanceus-eagle.png",
    badge: "/chanceus-eagle.png",
    tag: href,
  })
  notification.onclick = () => {
    window.focus()
    window.location.assign(href)
    notification.close()
  }
}
