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

// Open request for indexed DB
const request = indexedDB.open("budget_db", 1);
// Create table if necessary
request.onupgradeneeded = ({ target }) => {
  const db = target.result;
  const objectStore = db.createObjectStore("transactions", {keyPath: "_id"});
  objectStore.createIndex("name", "name");
  objectStore.createIndex("value", "value");
  objectStore.createIndex("date", "date");
  const objStore2 = db.createObjectStore("unsaved", {keyPath: "id", autoIncrement: true});
  objStore2.createIndex("name", "name");
  objStore2.createIndex("value", "value");
  objStore2.createIndex("date", "date");
};

// Function for clearing transactions DB
async function clearLocalDB() {
  // clear transactions db
  let response = await new Promise((resolve,reject) => {
    const req = indexedDB.open("budget_db", 1);
    req.onsuccess = () => {
      const transaction = req.result.transaction(["transactions"], "readwrite");
      const res = transaction.objectStore("transactions").clear();
      res.onsuccess = function() { resolve(this.result) };
      res.onerror = function() { reject(this.error) };
    }
  })

  return response;
}

// Function for clearing unsaved DB
async function clearUnsavedDB() {
  // clear unsaved db
  let response = await new Promise((resolve,reject) => {
    const req = indexedDB.open("budget_db", 1);
    req.onsuccess = () => {
      const transaction = req.result.transaction(["unsaved"], "readwrite");
      const res = transaction.objectStore("unsaved").clear();
      res.onsuccess = function() { resolve(this.result) };
      res.onerror = function() { reject(this.error) };
    }
  })

  return response;
}

// Function for adding entries to transactions DB
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

// Function for adding entries to unsaved db
function addToUnsaved(obj) {
  const req = indexedDB.open("budget_db", 1);
  req.onsuccess = () => { 
    const transaction = req.result.transaction(["unsaved"], "readwrite");
    const res = transaction.objectStore("unsaved").add(
      { name:obj.name, value:obj.value, date:obj.date });
    res.onsuccess = function() { return this.result }
    res.onerror = function() { return null }
  };
}

// function for retrieving data from transactions db
async function retrieveLocalDB() {
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

// function for retrieving data from unsaved db
async function retrieveUnsavedDB() {
  let data = await new Promise((resolve,reject) => {
    const req = indexedDB.open("budget_db", 1);
    req.onsuccess = () => {
      // create transaction event with readwrite permissions
      const transaction = req.result.transaction(["unsaved"], "readwrite");
      // create request grabbing all values from objectstore
      const allDataReq = transaction.objectStore("unsaved").getAll();
      // handle successful request
      allDataReq.onsuccess = function() { 
        console.log("unsaved DB found:", this.result); 
        resolve(this.result);
      }
      allDataReq.onerror = function() { 
        console.log("unsaved DB error:", this.error); 
        reject(this.error) 
      }
    }
  })

  return data.reverse();
}

// on reload
self.addEventListener('activate', event => {
  console.log('activate event triggered');
});

// handle fetch requests offline
self.addEventListener('fetch', async event => {

  // GET transactions data
  if (event.request.url.includes("/api/transaction") && event.request.method === "GET") {
    event.respondWith(fetch(event.request)
      .then(async res => { 
        // clear local db
        await clearLocalDB();
        // copy response body and add it to local db
        const data = await res.clone().json();
        console.log("Adding to local DB:", data);
        data.forEach(entry => addToLocalDB(entry));
        // return original response
        return res; 
      })
      .catch(async err => { 
        console.log("Failed GET request -", err);
        let returnedData = await retrieveLocalDB();
        return JSONResponse(returnedData);
      })
    )
  }
  // POST transactions data
  else if (event.request.url.includes("/api/transaction") && event.request.method === "POST") {
    let reqClone = event.request.clone();
    event.respondWith(fetch(event.request)
      .then(res => { 
        return res 
      })
      .catch(async err => { 
        console.log("POST transaction error:", err);
        const body = await reqClone.json();
        console.log(body);
        // save data to unsaved DB
        addToUnsaved(body);
        return JSONResponse({ errors:"could not connect to DB" }); 
      })
    )
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