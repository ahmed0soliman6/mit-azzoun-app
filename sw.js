const CACHE_NAME = "mit-azzoun-clinic-v4-9-18";
const SHELL_FILES = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// عند التثبيت: نخزّن ملفات التطبيق الأساسية (App Shell) عشان تفتح فورًا حتى بدون إنترنت
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

// عند التفعيل: نمسح أي نسخة قديمة من الكاش لإصدار سابق
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// استراتيجية الجلب:
// - لملف التطبيق نفسه (index.html): "الشبكة أولًا" لو متصل (عشان تاخد آخر تحديث)، وكاش لو الشبكة فشلت.
// - لأي حاجة تانية (مكتبات خارجية زي Chart.js/Supabase): كاش أولًا، وتحديث فى الخلفية.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const isShellPage = req.mode === "navigate" || req.url.endsWith("index.html") || req.url.endsWith("/");

  if (isShellPage) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
