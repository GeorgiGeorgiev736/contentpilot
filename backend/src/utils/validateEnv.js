// Runs before the server starts to catch missing config early
// Called automatically from server.js

function validateEnv() {
  const errors = [];

  const required = [
    ["ANTHROPIC_API_KEY", "Get yours at console.anthropic.com → API Keys"],
    ["JWT_SECRET",        "Any long random string — go to randomkeygen.com"],
  ];

  for (const [key, hint] of required) {
    if (!process.env[key] || process.env[key].includes("REPLACE_THIS")) {
      errors.push(`  ✗ ${key} is missing\n    → ${hint}`);
    }
  }

  if (errors.length > 0) {
    console.error("\n❌ Missing required environment variables:\n");
    console.error(errors.join("\n\n"));
    console.error("\n→ Copy .env.example to .env and fill in the values.\n");
    process.exit(1);
  }

  // Warn if JWT_SECRET looks too short
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️  JWT_SECRET is short — use at least 32 random characters in production.");
  }
}

module.exports = { validateEnv };
