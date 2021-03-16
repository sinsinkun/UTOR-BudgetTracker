const cachedURLs = [
  '/',
  '/index.html',
  '/index.js',
  '/styles.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@2.8.0'
]

let cachedReqs = [];
let nullResponse = new Response(new ReadableStream( new Uint8Array([])), { status: 404 });

// initialization
self.addEventListener('install', function (event) {
  // store cached files
  event.waitUntil(
    caches.open("budget-app-cache").then(function (cache) {
      console.log('Opened cache');
      return cache.addAll(cachedURLs);
    })
  )
})

// function for retrieving data from DB
async function retrieveLocalDB() {
  console.log("attempting local DB retrieval...");
  const req = indexedDB.open("budget_db", 1);
  req.onsuccess = () => {
    // create transaction event with readwrite permissions
    const transaction = req.result.transaction(["transactions"], "readwrite");
    // create request grabbing all values from objectstore
    const allDataReq = transaction.objectStore("transactions").getAll();
    // handle successful request
    allDataReq.onsuccess = function() { 
      console.log("local DB found:", this.result);
    }
    allDataReq.onerror = function(err) { 
      console.log(err) 
    }
  }
}

// handle fetch requests offline
self.addEventListener('fetch', event => {

  // handle API requests
  if (event.request.url.includes("/api/")) {
    // GET transactions data
    if (event.request.url.includes("/api/transaction") && event.request.method === "GET") {
      event.respondWith(fetch(event.request)
        .then(res => { return res })
        .catch(err => { 
          retrieveLocalDB();
          return nullResponse; 
        })
      )
    }
    // POST transactions data
    else if (event.request.url.includes("/api/transaction") && event.request.method === "POST") {
      console.log("POST transaction data", event.request);
      event.respondWith(fetch(event.request)
        .then(res => { return res })
        .catch(err => { return nullResponse })
      )
    }
  }
  // handle non-API requests
  else {
    event.respondWith(
      // handle loading files from cache
      caches.match(event.request).then(res => {
        if (res) return res;
        // call server if files are not cached
        return fetch(event.request);
      })
    )
  }

})