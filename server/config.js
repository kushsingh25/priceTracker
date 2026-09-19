require('dotenv').config();

module.exports = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  cronSecret: process.env.CRON_SECRET,
  port: process.env.PORT || 4000,
};
