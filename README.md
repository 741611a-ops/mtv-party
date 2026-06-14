# 🎤 MTV 2000s Party — Бронирование образов

## Быстрый старт (Railway — бесплатно)

1. Зайди на https://railway.app → Sign up with GitHub
2. New Project → Deploy from GitHub repo
3. Загрузи эти файлы в GitHub-репозиторий
4. В Railway → Variables добавь:
   - `BOT_TOKEN` = токен от @BotFather
   - `ADMIN_CHAT` = твой chat_id от @userinfobot
5. Railway автоматически выдаст ссылку вида https://xxx.railway.app

## Или запусти локально

```bash
node server.js
```
Открой http://localhost:3000

## Файлы

- `index.html` — фронтенд сайта
- `server.js`  — бэкенд (API + Telegram уведомления)
- `bookings.json` — база данных (создаётся автоматически)

## Пароль организатора

По умолчанию: `mtv2025admin`  
Поменять в `server.js` → `ADMIN_PWD`
