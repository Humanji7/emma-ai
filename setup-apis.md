# 🔑 API Setup Guide - Emma AI

Пошаговая настройка всех API ключей для Emma AI проекта.

## 📋 **Checklist API ключей**

### ✅ **Обязательные для Voice AI:**
- [ ] OpenAI API Key (для Whisper transcription)
- [ ] Supabase Project URL + Anon Key
- [ ] ElevenLabs API Key (для voice synthesis)

### 🔧 **Опциональные для Production:**
- [ ] Google Cloud API (резервный для transcription)
- [ ] Upstash Redis (для rate limiting)
- [ ] Sentry DSN (для error tracking)

---

## 🚀 **1. OpenAI API Setup**

**Получение ключа:**
1. Перейти на https://platform.openai.com/api-keys
2. Войти в аккаунт / зарегистрироваться
3. Создать новый API key: "Emma AI Development"
4. Скопировать ключ (показывается только один раз!)

**Стоимость:**
- Whisper API: $0.006 за минуту аудио
- GPT-4o для Emma responses: ~$0.01-0.03 за сообщение

---

## 🗄️ **2. Supabase Database Setup**

**Создание проекта:**
1. Перейти на https://supabase.com/dashboard
2. "New Project" → название: "emma-ai-dev"
3. Выбрать регион (ближайший к пользователям)
4. Сгенерировать пароль для БД

**Получение ключей:**
- Project URL: `https://xxxxxx.supabase.co`
- Anon Key: в Settings → API → Project API keys
- Service Key: там же (для server-side операций)

---

## 🎤 **3. ElevenLabs Voice AI Setup**

**Получение ключа:**
1. Перейти на https://elevenlabs.io/
2. Зарегистрироваться / войти
3. Profile → API Keys → "Create API Key"
4. Выбрать голос в Voice Library

**Рекомендуемые голоса для Emma:**
- **Rachel** (warm, empathetic female voice)
- **Bella** (young, friendly female voice)  
- **Sarah** (professional, caring female voice)

**Стоимость:**
- Free tier: 10,000 characters/month
- Starter: $5/month для 30,000 characters

---

## ⚡ **4. Быстрая настройка .env.local**

Скопируйте команды и вставьте свои ключи:

\`\`\`bash
# Копируем template
cp .env.example .env.local

# Редактируем файл
nano .env.local
\`\`\`

**Минимальная конфигурация для тестирования:**
\`\`\`env
# === AI Services ===
OPENAI_API_KEY=sk-ваш-openai-ключ-здесь
ELEVENLABS_API_KEY=ваш-elevenlabs-ключ
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel voice

# === Database ===
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-key
SUPABASE_SERVICE_KEY=ваш-service-key

# === Security ===
NEXTAUTH_SECRET=k7GmV4yXpL0zTqA1N9wBu2JsE8HdCfYX
NEXTAUTH_URL=http://localhost:3000

# === Development ===
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
\`\`\`

---

## ☁️ **4. Google Cloud API Setup (Опционально)**

Google Cloud используется как резервный вариант для транскрипции аудио.

**Получение ключа:**

1. **Создать проект:**
   - Перейти на https://console.cloud.google.com/
   - Войти с Google аккаунтом
   - "Select a project" → "New Project"
   - Название: "emma-ai-dev"
   - Создать

2. **Включить Speech-to-Text API:**
   - В поиске найти "Speech-to-Text API"
   - Нажать "Enable"
   - Подождать активации (~30 сек)

3. **Создать Service Account:**
   - Меню → IAM & Admin → Service Accounts
   - "Create Service Account"
   - Название: "emma-ai-transcription"
   - Role: "Cloud Speech Client"
   - Done

4. **Получить API Key:**
   - APIs & Services → Credentials
   - "Create Credentials" → "API Key"
   - Ограничить ключ:
     - Application restrictions: "HTTP referrers"
     - Website restrictions: "localhost:3000/*"
     - API restrictions: "Speech-to-Text API"

**Альтернатива - JSON ключ:**
```bash
# Для production лучше использовать Service Account JSON
# 1. Service Accounts → ваш аккаунт → Keys
# 2. Add Key → Create new key → JSON
# 3. Сохранить как google-credentials.json
```

**Стоимость:**
- First 60 минут/месяц: Бесплатно
- После: $0.006 за 15 секунд
- Сравнение с OpenAI Whisper: одинаковая цена

**Когда использовать:**
- Резервный вариант если OpenAI недоступен
- Для определенных языков (лучше с азиатскими)
- Требуется streaming транскрипция

---

## 🔒 **5. Генерация NEXTAUTH_SECRET**

\`\`\`bash
# Способ 1: OpenSSL
openssl rand -base64 32

# Способ 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Способ 3: Online
# https://generate-secret.vercel.app/32
\`\`\`

---

## ✅ **6. Проверка настройки**

**Тест подключения:**
\`\`\`bash
# Запуск dev сервера
npm run dev

# Откройте в браузере:
# http://localhost:3000/test
\`\`\`

**Что должно работать:**
- ✅ Страница загружается без ошибок
- ✅ Voice visualizer отображается
- ✅ Кнопка микрофона активна
- ✅ При клике запрашивает разрешение на микрофон

**Ошибки и решения:**
- `Invalid API key` → проверить OPENAI_API_KEY
- `Supabase connection failed` → проверить URL и keys
- `Module not found` → запустить `npm install`

---

## 🚨 **7. Безопасность**

**ВАЖНО:**
- ✅ `.env.local` добавлен в `.gitignore`
- ✅ Никогда не коммитить API ключи
- ✅ Использовать разные ключи для dev/production
- ✅ Ротировать ключи каждые 90 дней

**Проверка git:**
\`\`\`bash
# Убедиться что .env.local не в git
git status
# .env.local НЕ должен быть в списке
\`\`\`

---

## 🎯 **Next Steps**

После настройки API ключей:
1. Тест voice interface → transcription
2. Настройка Supabase schema  
3. Интеграция Emma AI logic
4. Crisis detection система

**Нужна помощь?** Скопируйте любые ошибки из консоли браузера или терминала.