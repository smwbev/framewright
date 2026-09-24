<h1 align="center">framewright</h1>

<p align="center">
  <a href="https://github.com/smwbev/framewright/releases"><img src="https://img.shields.io/badge/version-1.2.0-08C?style=flat" alt="Версия 1.2.0" /></a>
  <a href="https://agentskills.io"><img src="https://img.shields.io/badge/agent%20skill-agentskills.io-08C?style=flat" alt="Соответствует спецификации Agent Skills" /></a>
  <a href="https://agents.md"><img src="https://img.shields.io/badge/AGENTS.md-ready-08C?style=flat" alt="В комплекте AGENTS.md" /></a>
  <img src="https://img.shields.io/badge/agents-Claude%20Code%20%C2%B7%20Codex%20%C2%B7%20Gemini%20CLI%20%C2%B7%20Cursor-4493F8?style=flat" alt="Работает с Claude Code, Codex, Gemini CLI, Cursor и другими" />
  <img src="https://img.shields.io/badge/node-%E2%89%A5%2020-4493F8?style=flat" alt="Нужен Node 20 или новее" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-08C?style=flat" alt="Лицензия MIT" /></a>
</p>

<p align="center">
  <sub><a href="README.md">English</a></sub>
</p>

<p align="center">
  <strong>Скилл для агента и шаблон проекта: короткие ролики целиком из кода.</strong><br/>
  Один html-файл. Каждый кадр это чистая функция от <em>(номер кадра, сид, ширина)</em>.<br/>
  Рендер в headless Chrome, сборка ffmpeg, звук синтезируется скриптом. Без футажей, картинок и cdn.
</p>

---

<p align="center">
  <img src="examples/ris-tv/preview.webp" alt="Превью примера RIS TV: телевизор включается, настроечная таблица, отсчёт, телетекст, осциллограф" width="720" />
</p>

<p align="center">
  <img src="examples/ris-tv/contact-sheet.jpg" alt="Контрольный лист всех восьми сцен примера" width="960" />
</p>

<p align="center"><sub>Пример RIS TV: 40 секунд, 8 сцен, 1200 кадров, один html на 45 КБ. В публичной версии примера в сцене с портретом стоит синтетическая заглушка. Полный mp4 со звуком: <a href="https://github.com/smwbev/framewright/releases/download/v1.0.0/ris-tv-sample.mp4">ris-tv-sample.mp4</a> (27 МБ).</sub></p>

## Что это делает

Вы описываете ролик. Агент проводит короткий интерактивный бриф, предлагает три концепции
(буквальную, метафору и пародию на жанр), согласует сториборд на музыкальной сетке, потом
строит ролик сцена за сценой и после каждого шага смотрит на отрендеренные кадры. Дальше
рендер кадров, синтез звука под зафиксированные длины сцен, сборка mp4 и проверка файла.
Фотографии превращаются в постеризованные полигоны, а не в пиксели. У каждого шага есть
визуальная контрольная точка и запрет на «и так понятно».

Для фильма без склеек агент строит не отдельные сцены, а один непрерывный мир (см.
[ниже](#один-мир-вместо-отдельных-сцен)).

| Шаг | Что делает агент | Что видите вы |
|---|---|---|
| 0 | проверяет node, ffmpeg, Chrome, python и предлагает доустановить недостающее | короткий отчёт |
| 1 | бриф: сообщение, формат, длина, тон, стиль, материалы, звук, что сдавать | 8–11 вопросов с вариантами по умолчанию |
| 2 | три концепции с палитрой, ключевыми сценами, финалом, звуком и риском | таблица и рекомендация |
| 3 | сториборд в тактах, проект из скелета, первый кадр | одно «поехали» |
| 4 | по одной сцене, три кадра на сцену, контрольный лист каждые 2–3 сцены | контрольные листы |
| 5 | фото трассируется в полигоны, до появления файла стоит заглушка | превью портрета |
| 6 | лист целиком, проверка воспроизводимости, рендер в несколько вкладок, кодирование, проверка по mp4 | превью mp4 |
| 7 | звук по карте реплик, пересборка mp4 | финальный mp4 |
| 8 | варианты по запросу: другой сид, вертикальная версия, gif, кадр-постер | файлы |

Перед полным рендером проверка рисует пробные кадры каждой сцены в семи разных порядках и
требует совпадения пикселей, ищет в коде часы и `Math.random` и падает, если страница грузит
хоть один файл. Mp4 кодируется с матрицей BT.709 и цветовыми тегами, поэтому плееры показывают
те же цвета, что были на проверке.

## Один мир вместо отдельных сцен

Когда история это одно путешествие без склеек, сцены перестают быть отдельными картинками.
Каждая становится строителем и добавляет свою часть в общий мир: линию, которая помнит, когда
нарисована каждая её точка, ключи камеры с ровными наездами и мягким следованием, свет с
ореолом, титры. Любой кадр рисуется из этого мира и по-прежнему зависит только от (кадр, сид,
ширина). Звук берёт из фильма скорость и положение линии на экране. Такой проект начинается с
`init.sh --world`, метод описан в `references/world.md`.

<p align="center">
  <img src="examples/world-demo/preview.webp" alt="Демо-мир: линия рисует круг и квадрат, крышка закрывает квадрат, линия уходит через три растущие петли, камера отъезжает" width="400" />
  <img src="examples/honeybee/preview.webp" alt="Одна линия: золотая линия рисует жизнь пчелы от яйца в ячейке до сот, улья, луга и последнего полёта на закате" width="400" />
</p>

<p align="center"><sub>Слева: <a href="examples/world-demo">демо-мир</a>, который создаёт <code>init.sh --world</code>, 8 секунд. Справа: <a href="examples/honeybee">«Одна линия»</a>, жизнь рабочей пчелы одним кадром, 56 секунд, 1680 кадров, один html на 57 КБ, здесь в пятикратном ускорении. Полный mp4 со звуком: <a href="https://github.com/smwbev/framewright/releases/download/v1.2.0/honeybee-sample.mp4">honeybee-sample.mp4</a> (13 МБ).</sub></p>

<p align="center">
  <img src="examples/honeybee/contact-sheet.jpg" alt="Контрольный лист «Одной линии»: яйцо, личинка, крышечка, соты, вылет, луг, танец, последний полёт, капля мёда" width="960" />
</p>

## Быстрый старт

### Вариант 1: склонировать и запустить агента внутри

```bash
git clone https://github.com/smwbev/framewright my-video
cd my-video
npm install
claude        # или: codex, gemini, cursor, opencode ...
```

Дальше скажите, что нужно, например: *«ролик на 20 секунд, невозмутимый тон, спросить у Ани,
когда релиз, в стиле старого телевизора»*. Агент подхватит `AGENTS.md`, загрузит скилл и
начнёт с брифа.

### Вариант 2: добавить скилл в свой проект

```bash
npx skills add smwbev/framewright          # установка в выбранных агентов
gemini skills install https://github.com/smwbev/framewright --path .agents/skills/framewright --consent   # Gemini CLI
```

Или скопируйте `.agents/skills/framewright` в свой проект. Claude Code читает
`.claude/skills/`, туда нужен симлинк или копия.

## Поддерживаемые агенты

| Агент | Как подхватывает скилл |
|---|---|
| Claude Code | `.claude/skills/framewright` (симлинк на скилл); `CLAUDE.md` импортирует `AGENTS.md`; вызов `/framewright` |
| OpenAI Codex | читает `AGENTS.md` и `.agents/skills/` сам; `$framewright` |
| Gemini CLI | `.gemini/settings.json` указывает на `AGENTS.md`; скиллы из `.agents/skills/` |
| Cursor | `AGENTS.md` и `.agents/skills/` сам |
| GitHub Copilot coding agent | `AGENTS.md` и `.agents/skills/` сам |
| OpenCode, Amp, Zed, Warp, Factory, Cline, Roo, Windsurf | `AGENTS.md`; большинство читают и `.agents/skills/` |
| любой другой | укажите ему на `.agents/skills/framewright/SKILL.md` |

Скилл следует спецификации [Agent Skills](https://agentskills.io): `SKILL.md` с фронтматтером,
`references/` подгружаются по мере надобности, `scripts/` и `assets/`.

## Требования

Node 20+, npm, ffmpeg с libx264, Chrome через Puppeteer (ставится командой `npm install`).
Python 3 с numpy, scipy и Pillow только если будет трассироваться фото. macOS и Linux;
Windows через WSL.

```bash
bash .agents/skills/framewright/scripts/doctor.sh            # отчёт
bash .agents/skills/framewright/scripts/doctor.sh --install  # доустановить недостающее, спрашивает перед каждым шагом
```

## Структура репозитория

```
AGENTS.md                      точка входа для агентов
CLAUDE.md, GEMINI.md           однострочные импорты AGENTS.md
.gemini/settings.json          Gemini CLI читает AGENTS.md
.agents/skills/framewright/
  SKILL.md                     сам рабочий процесс
  references/                  опросник и генератор концепций, стили, движок, фильмы одним миром, звук, фото, починки
  scripts/                     doctor, init, look, check, render, build, make, export-curves, trace, inject, portrait
  assets/                      skeleton.html, world.html, audio-template.mjs, storyboard.md
.claude/skills/framewright     симлинк для Claude Code
examples/ris-tv/               готовый ролик из сцен: index.html, audio.mjs, превью
examples/honeybee/             готовый фильм одним миром без склеек: index.html, audio.mjs, превью
examples/world-demo/           превью демо, которое создаёт init.sh --world
```

## Примеры

`examples/ris-tv` это законченный ролик на 40 секунд в стиле старого телевизора, собранный из
сцен со склейками: включение,
снег и «НЕТ СИГНАЛА», настроечная таблица со счётчиком дней, отсчёт, который ломается, две
страницы телетекста с вопросом, осциллограф, вычерчивающий скрепку, портрет, на который
захватывается сигнал, и выключение кинескопа. Контрольный лист примера:

```bash
npm install
npm run example        # запишет shots/example-sheet.png
```

Полный рендер: `HTML=examples/ris-tv/index.html node .agents/skills/framewright/scripts/render.mjs frames 7 1920 5`,
затем `cd examples/ris-tv && node audio.mjs ../../track.wav`, затем `bash .agents/skills/framewright/scripts/build.sh out.mp4`.

`examples/honeybee` это «Одна линия», законченный фильм на 56 секунд одним кадром: золотая линия
рисует жизнь рабочей пчелы от яйца в ячейке до сот, улья, луга, танца-восьмёрки и последнего
полёта на закате, а её последняя точка падает обратно в соты каплей мёда. Это метод одного мира
в полном масштабе, со звуком, который ведёт сама линия. `npm run example:honeybee` запишет его
контрольный лист, полный рендер описан в README примера.

`examples/world-demo` показывает восьмисекундное демо, которое `init.sh --world` создаёт как
отправную точку для своего фильма.

## Ролики руками

Скилл заодно и учебник. `references/guide.md` описывает движок, хелперы, музыкальную сетку и
протокол просмотра; `references/styles.md` это каталог двенадцати визуальных систем с рецептами
пост-обработки; `references/world.md` про фильмы одним непрерывным миром; `references/audio.md`
и `references/photo.md` про звук и портреты. `assets/skeleton.html` и `assets/world.html`
рабочие отправные точки: откройте любой в браузере для живого предпросмотра, добавьте
`?f=30&w=1200` для одного кадра или `?grid=24` для контрольного листа.

## Лицензия

MIT. Ролики, сделанные с помощью framewright, принадлежат вам.
