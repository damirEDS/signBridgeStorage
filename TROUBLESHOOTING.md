# Yandex Cloud Object Storage - Troubleshooting Guide

## Частые проблемы и решения

### 1. S3 Connection Failed (403 Forbidden / 404 Not Found)

#### Проверьте endpoint URL
**Правильные endpoints для Yandex Cloud:**
- `https://storage.yandexcloud.kz` (основной)
- `https://s3.yandexcloud.kz` (альтернативный)

**НЕПРАВИЛЬНО:**
- ❌ `https://signbridge-animations.website.yandexcloud.kz` (это URL сайта, не S3 API)
- ❌ `https://storage.yandexcloud.net` (неверный домен)

#### Проверьте credentials
Убедитесь что используете правильные ключи:
- `S3_STORAGE_ACCESS_ID` - это `key_id` из статического ключа
- `S3_STORAGE_ACCESS_KEY` - это `secret` из статического ключа

### 2. Method Not Allowed (405)

Это означает что bucket существует, но нет прав на запись.

**Решение:**
1. Проверьте роли сервисного аккаунта в IAM
2. Убедитесь что есть роль `storage.editor` или `storage.admin`
3. Для зашифрованных бакетов нужны дополнительные роли KMS

### 3. NoSuchBucket (404)

Bucket с таким именем не существует.

**Решение:**
1. Создайте bucket в консоли Yandex Cloud
2. Проверьте правильность имени bucket (регистр важен)

### 4. Диагностика проблем

**Используйте debug endpoints:**

```bash
# Проверьте конфигурацию S3
curl http://localhost:8000/health/s3-config

# Проверьте подключение
curl http://localhost:8000/health/ready
```

**Смотрите логи:**
```bash
docker-compose logs -f api
```

В логах будет подробная информация об ошибке S3.

### 5. Создание статического ключа

Если у вас еще нет статического ключа:

1. Откройте консоль Yandex Cloud
2. Перейдите в раздел "Service accounts"
3. Выберите или создайте сервисный аккаунт
4. Назначьте роль `storage.editor` на каталог или bucket
5. Создайте статический ключ доступа
6. Сохраните `key_id` и `secret`

### 6. Правильная конфигурация .env

```env
# Yandex Cloud Object Storage
S3_STORAGE_ACCESS_ID=YCAJExxxxxxxxx    # key_id из статического ключа
S3_STORAGE_ACCESS_KEY=YCMxxxxxxxxx     # secret из статического ключа
S3_ENDPOINT_URL=https://storage.yandexcloud.kz
S3_BUCKET_NAME=your-bucket-name
S3_REGION=kz1  # ВАЖНО: для Yandex Cloud используйте kz1, а не ru-central1
```

**Важно:** Регион должен быть `kz1` для правильной подписи запросов AWS Signature V4.

### 7. Тестирование с AWS CLI

Проверьте доступ с помощью AWS CLI:

```bash
aws configure set aws_access_key_id YCAJExxxxxxxxx
aws configure set aws_secret_access_key YCMxxxxxxxxx
aws configure set region kz1

# Список бакетов
aws s3 ls --endpoint-url=https://storage.yandexcloud.kz

# Загрузка файла
aws s3 cp test.txt s3://your-bucket/test.txt --endpoint-url=https://storage.yandexcloud.kz
```

Если AWS CLI работает, значит проблема в конфигурации приложения.

---

## Полезные ссылки

- [Yandex Cloud S3 API Documentation](https://yandex.cloud/ru/docs/storage/s3/)
- [Создание статического ключа](https://yandex.cloud/ru/docs/iam/operations/sa/create-access-key)
- [Управление доступом](https://yandex.cloud/ru/docs/storage/security/)
