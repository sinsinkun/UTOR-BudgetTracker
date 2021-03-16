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

function JSONResponse(data) {
  return new Response(new Blob([JSON.stringify(data)], {type : 'application/json'}), { status: 302 })
}

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

// Function for adding entries to local DB
function addToLocalDB(obj) {
  const req = indexedDB.open("budget_db", 1);
  req.onsuccess = () => { 
    const transaction = req.result.transaction(["transactions"], "readwrite");
    const res = transaction.objectStore("transactions").put(
      { _id:obj._id, name:obj.name, value:obj.value, date:obj.date });
    res.onsuccess = function() { return this.result }
    res.onerror = function() { return null }
  };
}

// function for retrieving data from DB
async function retrieveLocalDB() {
  console.log("attempting local DB retrieval...");

  let data = await new Promise((resolve,reject) => {
    const req = indexedDB.open("budget_db", 1);
    req.onsuccess = () => {
      // create transaction event with readwrite permissions
      const transaction = req.result.transaction(["transactions"], "readwrite");
      // create request grabbing all values from objectstore
      const allDataReq = transaction.objectStore("transactions").getAll();
      // handle successful request
      allDataReq.onsuccess = function() { 
        console.log("local DB found:", this.result); 
        resolve(this.result);
      }
      allDataReq.onerror = function() { 
        console.log("local DB error:", this.error); 
        reject(this.error) 
      }
    }
  })

  return data.reverse();
}

// handle fetch requests offline
self.addEventListener('fetch', event => {

  // handle API requests
  if (event.request.url.includes("/api/")) {
    // GET transactions data
    if (event.request.url.includes("/api/transaction") && event.request.method === "GET") {
      event.respondWith(fetch(event.request)
        .then(res => { return res })
        .catch(async err => { 
          let returnedData = await retrieveLocalDB();
          return JSONResponse(returnedData);
        })
      )
    }
    // POST transactions data
    else if (event.request.url.includes("/api/transaction") && event.request.method === "POST") {
      console.log("POST transaction data", event.request);
      event.respondWith(fetch(event.request)
        .then(res => { return res })
        .catch(err => { return JSONResponse(null) })
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