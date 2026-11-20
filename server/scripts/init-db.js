const { connectDatabase, disconnectDatabase } = require("../src/config/db");

connectDatabase()
  .then(() => console.log("SQLite database initialized."))
  .catch((error) => {
    console.error("Could not initialize SQLite database:", error.message);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
