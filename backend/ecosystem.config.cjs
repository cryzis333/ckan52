module.exports = {
  apps: [
    {
      name: "serious-company",
      script: "server.js",
      cwd: "/var/www/serious-company/backend",
      env: {
  NODE_ENV: "production",
  PORT: "3000",

  BOT_TOKEN: "your_bot_token_here",
  CHAT_ID: "your_chat_id_here",

  NOTIFY_EMAIL: "your_email@example.com",

  SMTP_HOST: "smtp.yandex.ru",
  SMTP_PORT: "465",
  SMTP_USER: "your_email@yandex.ru",
  SMTP_PASS: "your_password_here",
  SMTP_SECURE: "true",
  MAIL_FROM: "your_email@yandex.ru"
}

    }
  ]
};
