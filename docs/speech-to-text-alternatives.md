# 🎤 Speech-to-Text API Альтернативы для Emma AI

Сравнение сервисов транскрипции аудио с ценами и особенностями.

## 📊 **Сравнительная таблица**

| Сервис | Цена | Бесплатный тир | Качество | Языки | Особенности |
|--------|------|----------------|----------|-------|-------------|
| **OpenAI Whisper** | $0.006/мин | ❌ | ⭐⭐⭐⭐⭐ | 97 | Лучшее качество, без streaming |
| **Deepgram** | $0.0125/мин | 12,000 мин/год | ⭐⭐⭐⭐⭐ | 36 | Real-time streaming, быстрый |
| **AssemblyAI** | $0.015/мин | 3 часа/месяц | ⭐⭐⭐⭐⭐ | 30+ | Sentiment анализ включен |
| **Azure Speech** | $0.016/мин | 5 часов/месяц | ⭐⭐⭐⭐ | 120+ | Хорошо с акцентами |
| **AWS Transcribe** | $0.024/мин | 60 мин/месяц | ⭐⭐⭐⭐ | 37 | Интеграция с AWS |
| **Speechmatics** | $0.018/мин | 2 часа/месяц | ⭐⭐⭐⭐ | 45 | Точность с акцентами |
| **Rev.ai** | $0.035/мин | 5 мин бесплатно | ⭐⭐⭐⭐⭐ | 36 | Human-level точность |
| **Whisper Self-hosted** | $0 | ✅ Unlimited | ⭐⭐⭐⭐ | 97 | Требует GPU сервер |

---

## 🚀 **Топ-3 для Emma AI (Хакатон)**

### 1. **Deepgram** 🏆
```javascript
// Простая интеграция
const deepgram = new Deepgram(DEEPGRAM_API_KEY);
const { results } = await deepgram.transcription.preRecorded(
  { buffer: audioBuffer, mimetype: 'audio/webm' },
  { punctuate: true, language: 'en-US' }
);
```

**Плюсы:**
- ✅ 12,000 минут бесплатно в год (200 часов!)
- ✅ Real-time streaming поддержка
- ✅ Очень быстрый (100ms latency)
- ✅ Emotion detection бета

**Минусы:**
- ❌ Меньше языков чем Whisper
- ❌ Требует регистрацию компании

**Получить ключ:** https://console.deepgram.com/

---

### 2. **AssemblyAI** ⭐
```javascript
// С sentiment анализом
const assembly = axios.create({
  baseURL: "https://api.assemblyai.com/v2",
  headers: { authorization: ASSEMBLYAI_API_KEY }
});

const transcript = await assembly.post("/transcript", {
  audio_url: audioUrl,
  sentiment_analysis: true,
  entity_detection: true
});
```

**Плюсы:**
- ✅ 3 часа бесплатно каждый месяц
- ✅ Встроенный sentiment анализ
- ✅ Entity detection (имена, места)
- ✅ Простое API

**Минусы:**
- ❌ Дороже чем Whisper
- ❌ Нет streaming

**Получить ключ:** https://www.assemblyai.com/

---

### 3. **Whisper Self-Hosted** 💻
```bash
# Локальная установка
pip install openai-whisper

# Docker вариант
docker run -p 9000:9000 onerahmet/openai-whisper-asr-webservice
```

**Плюсы:**
- ✅ Полностью бесплатно
- ✅ Приватность данных
- ✅ Нет лимитов
- ✅ Работает офлайн

**Минусы:**
- ❌ Нужен GPU (или медленно на CPU)
- ❌ Сложность развертывания
- ❌ 1-2 ГБ модель

**Сервисы для хостинга:**
- Replicate.com - $0.00025/сек
- Banana.dev - $0.0001/сек
- Hugging Face Inference - $0.06/час

---

## 🎯 **Специальные решения**

### **Для эмоций и sentiment:**
- **Hume AI** - $0.02/мин - Специализируется на emotion detection
- **Symbl.ai** - $0.03/мин - Conversation intelligence

### **Для множества языков:**
- **Azure Speech** - 120+ языков
- **Google Cloud** - 125+ языков  
- **Amazon Transcribe** - 37 языков

### **Для real-time:**
- **Deepgram** - 100ms latency
- **Azure Speech** - Streaming поддержка
- **Google Cloud** - Streaming API

---

## 💡 **Рекомендации для Emma AI**

### **Для хакатона (11 дней):**
```env
# Основной
OPENAI_API_KEY=sk-...  # Уже есть, работает

# Резервный (выбрать один)
DEEPGRAM_API_KEY=...   # 200 часов бесплатно!
# или
ASSEMBLYAI_API_KEY=... # 3 часа/месяц + sentiment
```

### **Для production:**
1. **Primary**: OpenAI Whisper (качество)
2. **Fallback**: Deepgram (скорость + бесплатный тир)
3. **Analytics**: AssemblyAI (sentiment для crisis detection)

### **Код с fallback:**
```typescript
async function transcribeWithFallback(audio: Blob): Promise<TranscriptionResult> {
  try {
    // Попробовать OpenAI Whisper
    return await transcribeWithWhisper(audio);
  } catch (error) {
    console.warn('Whisper failed, trying Deepgram...', error);
    
    try {
      // Fallback на Deepgram
      return await transcribeWithDeepgram(audio);
    } catch (deepgramError) {
      console.error('All transcription services failed', deepgramError);
      throw new Error('Transcription unavailable');
    }
  }
}
```

---

## 🔗 **Быстрые ссылки для регистрации**

1. **Deepgram**: https://console.deepgram.com/signup
2. **AssemblyAI**: https://www.assemblyai.com/dashboard/signup
3. **Azure Speech**: https://azure.microsoft.com/en-us/services/cognitive-services/speech-to-text/
4. **AWS Transcribe**: https://aws.amazon.com/transcribe/
5. **Hume AI**: https://beta.hume.ai/sign-up

---

## ⚡ **Экстренный вариант**

Если все API недоступны, можно использовать браузерный Web Speech API:

```javascript
// Бесплатно, но ограниченная поддержка
const recognition = new webkitSpeechRecognition();
recognition.lang = 'en-US';
recognition.continuous = true;

recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  console.log('Transcript:', transcript);
};

recognition.start();
```

**Ограничения:**
- Только Chrome/Edge
- Требует интернет
- Менее точный
- Нет контроля над моделью