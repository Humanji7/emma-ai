# 🔑 API Setup Checklist - Emma AI

## 📊 **Текущий статус конфигурации**

```
✅ Critical: 4/4 configured
⚠️  Recommended: 2/3 configured  
ℹ️  Optional: 3/5 configured

Status: Ready to start
```

## 🚨 **ТРЕБУЕТ ИСПРАВЛЕНИЯ**

### ❌ ElevenLabs API Key (НЕПРАВИЛЬНЫЙ ФОРМАТ)
**Текущий ключ:** `sk_d0d1cbbc009bfc09f742296882bb84c4dfddc5853a9ceed8`
**Проблема:** Не соответствует формату ElevenLabs API ключей

**Как исправить:**
1. Перейти на https://elevenlabs.io/
2. Sign In → Profile → API Keys
3. Create API Key
4. Скопировать ключ (формат: `sk_...` но длиннее)
5. Заменить в `.env.local`:
```bash
ELEVENLABS_API_KEY=ваш_новый_ключ
```

---

## ✅ **УЖЕ НАСТРОЕНО**

### ✅ OpenAI API
- **Статус:** Настроен корректно
- **Использование:** Whisper для транскрипции голоса, GPT для Emma AI
- **Стоимость:** ~$0.006/минута аудио + $0.01-0.03/сообщение

### ✅ Supabase Database  
- **Статус:** Полностью настроен
- **URL:** `https://emyheyjjgbeifpofzcrq.supabase.co`
- **Использование:** Хранение профилей, сессий, метрик

### ✅ Upstash Redis
- **Статус:** Настроен
- **Использование:** Rate limiting, кеширование
- **URL:** `https://wealthy-vervet-33183.upstash.io`

---

## 🔧 **ОПЦИОНАЛЬНЫЕ СЕРВИСЫ**

### 🔍 Google Cloud Speech-to-Text (РЕЗЕРВНЫЙ)
**Текущий:** `your_google_cloud_api_key_here` (placeholder)

**Нужно ли:** НЕТ для тестирования, ДА для production resilience

**Как настроить:**
1. https://console.cloud.google.com/
2. New Project → "emma-ai-prod"
3. Enable Speech-to-Text API
4. APIs & Services → Credentials → Create API Key
5. Restrict to Speech-to-Text API
6. Добавить в .env.local:
```bash
GOOGLE_CLOUD_API_KEY=AIza...ваш_ключ
```

### 📊 Sentry Error Tracking
**Текущий:** `your_sentry_dsn_for_error_tracking` (placeholder)

**Нужно ли:** ДА для production monitoring

**Как настроить:**
1. https://sentry.io/signup/
2. Create Organization → Create Project (Next.js)
3. Copy DSN
4. Добавить:
```bash
SENTRY_DSN=https://ваш@dsn.ingest.sentry.io/проект
```

### 🚨 Crisis Response Webhook
**Текущий:** `https://your-crisis-response-service.com/webhook` (placeholder)

**Нужно ли:** ДА для production safety

**Опции:**
1. **Twilio/SMS:** webhook для SMS алертов
2. **Slack/Discord:** webhook для уведомлений команды  
3. **Custom service:** ваш endpoint для crisis handling

---

## 🎤 **VOICE ID КОНФИГУРАЦИЯ**

### ElevenLabs Voice ID
**Текущий:** `IsEXLHzSvLH9UMB6SLHj` (неизвестный голос)

**Рекомендуемые голоса для Emma:**
```bash
# Rachel (warm, empathetic) - РЕКОМЕНДУЕТСЯ
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Bella (young, friendly)
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# Sarah (professional, caring)  
ELEVENLABS_VOICE_ID=EK0a2A0g4K7wX8w6j7X8
```

**Как выбрать:**
1. https://elevenlabs.io/voice-library
2. Прослушать образцы
3. Copy Voice ID из URL или API

---

## 💳 **СТОИМОСТЬ СЕРВИСОВ**

### 🔴 Обязательные расходы:
- **OpenAI:** ~$10-30/месяц (в зависимости от использования)
- **ElevenLabs:** $5/месяц (Starter план, 30K символов)
- **Supabase:** $0 (Free tier) → $25/месяц (Pro при росте)

### 🟡 Опциональные:
- **Google Cloud:** $0-10/месяц (резерв)
- **Upstash Redis:** $0 (Free tier) → $8/месяц
- **Sentry:** $0 (Free tier) → $26/месяц

### 💰 **Итого:** $15-45/месяц (мин) → $60-90/месяц (при активном использовании)

---

## 🚀 **СЛЕДУЮЩИЕ ШАГИ**

### 1. Исправить ElevenLabs API Key
```bash
# 1. Получить правильный ключ на elevenlabs.io
# 2. Обновить .env.local
# 3. Перезапустить сервер
npm run dev
```

### 2. Тест Voice Recording
```bash
# Открыть тестовую страницу
open test-voice-recording.html
# ИЛИ в приложении
open http://localhost:3002/couple
```

### 3. Выбрать голос Emma
```bash
# Перейти на elevenlabs.io/voice-library
# Выбрать подходящий женский голос
# Обновить ELEVENLABS_VOICE_ID в .env.local
```

### 4. Production Setup (когда готов деплоить)
- [ ] Настроить Google Cloud как резерв
- [ ] Добавить Sentry для мониторинга
- [ ] Настроить Crisis Response webhook
- [ ] Обновить домен в NEXTAUTH_URL

---

## 🔒 **БЕЗОПАСНОСТЬ**

### ✅ Правильно настроено:
- `.env.local` в `.gitignore`
- Разные ключи для dev/prod
- Service keys только на backend

### ⚠️ Проверить:
```bash
# Убедиться что не коммитим ключи
git status
# .env.local НЕ должен быть в списке для коммита

# Если случайно добавлен:
git rm --cached .env.local
echo ".env.local" >> .gitignore
```

---

## 🆘 **TROUBLESHOOTING**

### "ElevenLabs API Error"
```bash
# Проверить формат ключа
echo $ELEVENLABS_API_KEY
# Должен начинаться с sk_ и быть ~50+ символов

# Проверить баланс
curl -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/user
```

### "OpenAI API Error"  
```bash
# Проверить ключ
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

### "Supabase Connection Failed"
```bash
# Проверить URL
echo $NEXT_PUBLIC_SUPABASE_URL
# Должен быть: https://xxxxxx.supabase.co

# Проверить ключи в Supabase Dashboard → Settings → API
```

---

## 📞 **Поддержка**

Если проблемы с настройкой API:
1. Скопируйте ошибку из консоли браузера (F12)
2. Скопируйте ошибку из терминала
3. Укажите какой именно API не работает