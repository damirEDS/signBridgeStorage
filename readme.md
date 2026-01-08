# signBridgeStorage

FastAPI S3 Storage Service для загрузки, скачивания и управления файлами в S3-совместимом хранилище (Yandex Cloud Object Storage).

## 🚀 Возможности

- ✅ **Web GUI для управления файлами** - Современный интерфейс с drag-and-drop
- ✅ Загрузка файлов в S3 с валидацией размера и типа
- ✅ Скачивание файлов из S3
- ✅ Удаление файлов
- ✅ Список файлов с пагинацией и превью
- ✅ Получение метаданных файлов
- ✅ Генерация presigned URLs для прямого доступа
- ✅ Health checks для Kubernetes/Docker
- ✅ Production-ready с Docker и docker-compose
- ✅ Structured logging (JSON support)
- ✅ CORS поддержка

## 📋 Требования

- Python 3.13+
- S3-совместимое хранилище (Yandex Cloud Object Storage, MinIO, AWS S3)
- Docker & Docker Compose (для контейнеризации)

## 🛠 Установка и Запуск

### Локальная разработка

1. **Клонируйте репозиторий и перейдите в директорию:**
```bash
cd signBridgeStorage
```

2. **Создайте виртуальное окружение и установите зависимости:**
```bash
# Используя uv (рекомендуется)
uv venv
source .venv/bin/activate  # Linux/Mac
# или .venv\Scripts\activate  # Windows
uv pip install -e .

# Или используя pip
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

3. **Настройте переменные окружения:**
```bash
cp .env.example .env
# Отредактируйте .env файл с вашими credentials
```

4. **Запустите приложение:**
```bash
# Development mode с hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Или с использованием gunicorn (production)
gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --workers 4
```

5. **Откройте документацию API:**
```
http://localhost:8000/docs
```

6. **Откройте Web GUI для управления файлами:**
```
http://localhost:8000/frontend/
```

Веб-интерфейс позволяет:
- Загружать файлы через drag-and-drop или выбор
- Просматривать список загруженных файлов
- Скачивать и удалять файлы
- Видеть статус подключения к S3

### Docker

1. **Сборка и запуск с Docker Compose:**
```bash
docker-compose up -d
```

2. **Просмотр логов:**
```bash
docker-compose logs -f api
```

3. **Остановка:**
```bash
docker-compose down
```

### Production Deployment

1. **Сборка production образа:**
```bash
docker build -t signbridge-storage:latest .
```

2. **Запуск контейнера:**
```bash
docker run -d \
  --name signbridge-storage \
  -p 8000:8000 \
  --env-file .env \
  signbridge-storage:latest
```

## 🔧 Конфигурация

Все настройки управляются через переменные окружения. См. `.env.example` для полного списка доступных опций.

### Основные переменные:

| Переменная | Описание | Значение по умолчанию |
|-----------|----------|---------------------|
| `S3_STORAGE_ACCESS_ID` | S3 Access Key ID | - |
| `S3_STORAGE_ACCESS_KEY` | S3 Secret Access Key | - |
| `S3_ENDPOINT_URL` | S3 Endpoint URL | `https://storage.yandexcloud.net` |
| `S3_BUCKET_NAME` | Название S3 bucket | `signbridge-storage` |
| `S3_REGION` | S3 Region | `ru-central1` |
| `MAX_FILE_SIZE_MB` | Максимальный размер файла (MB) | `100` |
| `ALLOWED_FILE_EXTENSIONS` | Разрешенные расширения файлов | `.jpg,.jpeg,.png,.pdf,...` |
| `DEBUG` | Debug режим | `False` |

## 📚 API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe с проверкой S3 подключения

### File Operations

- `POST /api/v1/files/upload` - Загрузить файл
- `GET /api/v1/files/{file_key}` - Скачать файл
- `DELETE /api/v1/files/{file_key}` - Удалить файл
- `GET /api/v1/files` - Список файлов (с пагинацией)
- `GET /api/v1/files/metadata/{file_key}` - Получить метаданные файла
- `POST /api/v1/files/presigned-url` - Сгенерировать presigned URL

### Примеры использования

**Загрузка файла:**
```bash
curl -X POST "http://localhost:8000/api/v1/files/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@example.jpg"
```

**Список файлов:**
```bash
curl -X GET "http://localhost:8000/api/v1/files?prefix=uploads/&max_keys=10"
```

**Скачать файл:**
```bash
curl -X GET "http://localhost:8000/api/v1/files/uploads/2024/01/08/example.jpg" \
  --output downloaded.jpg
```

**Удалить файл:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/files/uploads/2024/01/08/example.jpg"
```

**Генерация presigned URL:**
```bash
curl -X POST "http://localhost:8000/api/v1/files/presigned-url" \
  -H "Content-Type: application/json" \
  -d '{"file_key": "uploads/example.jpg", "expiration": 3600, "http_method": "GET"}'
```

## 🧪 Тестирование

```bash
# Установите dev зависимости
uv pip install -e ".[dev]"

# Запустите тесты
pytest

# С coverage
pytest --cov=app --cov-report=html
```

## 📁 Структура проекта

```
signBridgeStorage/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI приложение
│   ├── config.py            # Конфигурация
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/
│   │           ├── files.py  # File endpoints
│   │           └── health.py # Health endpoints
│   ├── core/
│   │   ├── s3.py            # S3 клиент
│   │   └── logging.py       # Logging setup
│   ├── models/
│   │   └── schemas.py       # Pydantic модели
│   └── utils/
│       └── validators.py    # Валидаторы
├── frontend/
│   ├── index.html           # Web GUI
│   ├── styles.css           # Стили
│   └── app.js               # JavaScript
├── main.py                  # Entry point
├── .env                     # Environment variables
├── .env.example             # Environment template
├── Dockerfile               # Docker image
├── docker-compose.yml       # Docker Compose config
├── pyproject.toml           # Dependencies
└── README.md
```

## 🔒 Безопасность

- Валидация типов и размеров файлов
- Non-root user в Docker контейнере
- Secrets через environment variables
- CORS настройки
- Request validation с Pydantic

## 📝 Лицензия

MIT

## 👨‍💻 Разработка

Для разработки:

1. Установите dev зависимости: `uv pip install -e ".[dev]"`
2. Используйте `black` для форматирования: `black app/`
3. Проверка с `ruff`: `ruff check app/`
4. Type checking с `mypy`: `mypy app/`
