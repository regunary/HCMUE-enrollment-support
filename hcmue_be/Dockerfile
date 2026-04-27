FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System packages are kept minimal; psycopg2-binary still needs libpq at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run migrations before serving so a fresh Postgres volume can boot without manual steps.
CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn core.wsgi:application --bind 0.0.0.0:8000"]
