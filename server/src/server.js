const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/db");

async function start() {
  await connectDatabase();
  app.listen(env.port, () => {
    console.log(`Student Portal API listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API:", error.message);
  process.exit(1);
});
