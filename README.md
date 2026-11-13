# Salary Analytics App

Клиентский сервис аналитики зарплат по данным вакансий и резюме с HH.ru и Getmatch.

## Функционал

- Загрузка CSV (резюме HH, вакансии HH, вакансии Getmatch)
- Дедупликация по индексу уникальности
- Нормализация зарплат в net RUB (курсы $ = 90, € = 100, ₸ = 0.2; всегда 13% налог)
- Оба конца вилки становятся отдельными точками
- Бины с настраиваемым шагом (10/20/50 тыс. ₽)
- Перцентили внутри бинов
- Грейды (1/3/4/5 уровней) с цифровыми границами
- График распределения (вакансии ярче, резюме менее заметны) + заливка грейдов
- Фильтры: город, компания, источник, поиск по должности
- Дата загрузки/парсинга добавляется автоматически

## Разработка

```bash
npm install
npm run dev
```

## Деплой на GitHub Pages

Соберите и запуште в ветку `gh-pages` или используйте GitHub Actions (см. `.github/workflows/deploy.yml`).

Base path настроен под `/salary-analytics-app/`.

## Версионирование и релизы

- **SemVer** начиная с `0.1.0`. Пока версия `0.x`: `feat` → minor (`0.1.0 → 0.2.0`), `fix` → patch, ломающие изменения (`feat!:` / `BREAKING CHANGE:`) тоже → minor. Выход в `1.0.0` — осознанное решение, когда API/данные стабилизируются.
- **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:` …). Проверяются локально хуком husky + commitlint и в CI на каждом PR.
- **Теги**: `vX.Y.Z` на коммите релиза в `main`, к каждому — GitHub Release.
- **CHANGELOG.md** в формате Keep a Changelog, пишется автоматически.
- **release-please** (`.github/workflows/release-please.yml`): после push в `main` открывает/обновляет Release PR с bump версии и changelog. Мерж Release PR → тег + GitHub Release; деплой на Pages идёт обычным `deploy.yml`.
- Версия показывается в шапке приложения (`__APP_VERSION__` из `package.json` через `define` в `vite.config.ts`), в подсказке — короткий SHA сборки.

```bash
npm run typecheck   # проверка типов
git commit -m "feat: перетаскивание границ грейдов на графике"
```
