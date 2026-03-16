const { onRequest } = require("firebase-functions/v2/https");
const app = require("./server");

// Export the Express app as a Cloud Function
exports.api = onRequest({ 
  region: "us-central1", 
  memory: "256MiB",
  maxInstances: 10 
}, app);
