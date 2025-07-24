# Emma AI Project Context

## Project Overview
Emma AI - Advanced AI Assistant

## Development Guidelines
- AI-first development approach
- Context preservation between sessions
- Iterative development with clear documentation

## Session Context
### Current Status
- Project initialized with package.json
- Basic dependencies configured
- Awaiting project description and optimal function set

### Next Steps
- [ ] Review project description
- [ ] Implement core functionality based on provided functions
- [ ] Set up project structure according to requirements

## Commands
```bash
npm run dev      # Start development server
npm run build    # Build TypeScript
npm run test     # Run tests
npm run lint     # Run ESLint
npm run typecheck # Type checking
```

## Architecture Decisions
- TypeScript for type safety
- Express.js for API server
- Winston for logging
- Anthropic SDK for AI integration

## Notes for Future Sessions

## Recent Changes & Fixes

### 🎤 Voice Recording System - Complete Fix Documentation (2025-01-22)

#### Проблема
**Симптом:** Кнопка записи микрофона полностью не функционировала
- Клики не инициировали запись
- Состояние оставалось `idle` после взаимодействия
- Не запрашивались разрешения микрофона
- Пользователь сообщил: "да все равноо не работает нихуя кнопка записи микрофона"

#### Техническая диагностика
**Корневая причина:** Development hot reload создавал цикл сброса состояния
```tsx
// ДО (баг):
useEffect(() => {
  // development reset logic
}, [onStateChange, state])  // зависимость 'state' вызывала цикл

// ПОСЛЕ (исправлено):  
useEffect(() => {
  // development reset logic
}, [onStateChange])  // убрана зависимость 'state'
```

**Механизм бага:**
1. Клик → состояние меняется на `listening`
2. useEffect срабатывает из-за зависимости `state` 
3. Development логика сбрасывает состояние на `idle`
4. Взаимодействие пользователя отменяется

#### Полное решение

**Основное исправление:**
- **Файл:** `components/voice/VoiceRecorder.tsx:275`
- **Изменение:** Убрана `state` из dependency array useEffect
- **Результат:** Устранен цикл сброса, сохранена cleanup функциональность

**Дополнительные улучшения:**
1. **Система отладки:** Подробное логирование всего pipeline записи
2. **MIME fallback:** Совместимость с разными браузерами
3. **Обработка ошибок:** Улучшенная обратная связь пользователю  
4. **Dev инструменты:** Кнопка экстренного сброса для отладки

#### Измененные файлы

**components/voice/VoiceRecorder.tsx:**
- Строка 275: Исправлен dependency array bug useEffect
- Строки 36-57: Добавлена проверка совместимости с debug output
- Строки 118-127: MIME type fallbacks для браузеров
- Строки 83-237: Подробное логирование процесса записи
- Строки 397-427: Dev режим emergency reset controls

**components/voice/VoiceInterface.tsx:**
- Строка 109: Улучшена интеграция audioLevel prop
- Строки 39-65: Обработка ошибок с очисткой timeout
- Строки 26-29: Debug логирование изменений состояния

#### Техническая реализация

**MediaRecorder интеграция:**
- Проверка совместимости MediaRecorder и getUserMedia API
- Fallback MIME типы: opus → webm → mp4 → wav
- Правильная очистка stream и управление ресурсами

**Мониторинг аудио уровня:**
- Расчет в реальном времени через Web Audio API
- Обновление CSS переменных для анимации visualizer
- Уведомление родительского компонента через callback

**Восстановление после ошибок:**
- Обработка отказа в разрешениях, отсутствия устройства, timeout
- Понятные сообщения с руководством по восстановлению
- Dev режим инструменты для быстрой диагностики

#### Проверка исправления

**Результаты ручного тестирования:**
- ✅ Кнопка реагирует на клики немедленно
- ✅ Запросы разрешений микрофона срабатывают корректно
- ✅ Запись аудио начинается и останавливается как ожидается
- ✅ Переходы состояний работают в dev и production режимах
- ✅ Сценарии ошибок дают полезную обратную связь

**Совместимость браузеров:**
- ✅ Chrome: Полная функциональность с opus codec
- ✅ Firefox: Совместимость с webm форматом  
- ✅ Safari: Fallback к поддерживаемым форматам
- ✅ Edge: Стандартная поддержка webm

### 🔊 Voice Components Integration
**Улучшения:**
- Добавлен проброс audioLevel между VoiceRecorder → VoiceInterface → VoiceVisualizer
- Улучшена обработка ошибок в transcribeAudio функции
- Добавлена поддержка MIME типов с fallback'ами
- Исправлены React Hook dependencies

### 🔧 Технические детали
**MediaRecorder поддержка:**
- MIME типы: audio/webm;codecs=opus → audio/webm → audio/mp4 → audio/wav
- Проверка browser support с isSecureContext
- Улучшенная диагностика с console.log логами

### 📝 MCP Servers Available
**Команды Context7:**
- `mcp__context7__resolve-library-id` - Поиск ID библиотеки
- `mcp__context7__get-library-docs` - Получение документации

**Настроенные серверы:**
- Sequential Thinking (`@modelcontextprotocol/server-sequential-thinking`)
- GitHub MCP (`@andrebuzeli/github-mcp-v2`)
- Magic (`@21st-dev/cli`)
- Upstash Context7 (`@upstash/context7-mcp`)

Add your project-specific notes here...