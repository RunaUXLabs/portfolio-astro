# 교안 편집

화면은 Astro가 만들고, 날짜별 원고는 JSON으로 관리합니다. 배포 결과가 HTML인 것은 정상입니다.

## 파일 위치

- `각 챕터/chapter.json`: 챕터 제목, 날짜 목록, 이미지 경로
- `각 챕터/day숫자.json`: 하루의 제목, 4개 파트, 장표와 예시·연습
- `src/components/courses/`: 강의 선택, 장표, 내용 블록, 예시·연습
- `src/layouts/CourseLesson.astro`: 공통 화면
- `src/scripts/courses/`: 장표 이동, 모바일 스크롤, 날짜 선택
- `src/styles/courses/`: 공통 스타일

## 날짜·챕터 추가

1. 날짜 원고 파일을 만들고 `day`, 제목, 시간, 파트, 장표를 작성합니다.
2. `chapter.json`의 `days`에 날짜를 추가합니다. 선택 메뉴와 주소가 자동 생성됩니다.
3. 새 챕터는 새 폴더에 `chapter.json`과 날짜 파일을 만듭니다. 전체 과정 탐색 메뉴는 별도 필요에 따라 추가합니다.
4. `npm run build`와 `node --test tests/*.test.mjs`로 확인합니다.

파트의 `start`는 0부터 시작하는 장표 위치입니다. 장표 `id`는 전체 챕터에서 중복되지 않아야 합니다. `role`은 `core`, `reference`, `task` 중 하나이며 다음 핵심 이동에 사용됩니다. `notes`는 학생에게 공개되는 예시와 연습입니다. 강사 시간표·제작 메모는 `local-work/`에서 관리합니다.

## 내용 블록

41일차는 `steps`(순서), `panel`(설명), `table`(비교표), `columns`(열), `placeholder`(이미지 자리)를 조합합니다. 세부 형식은 `day41.json`을 참고하세요. `titleHtml`과 본문 필드에서는 줄바꿈·강조 등 HTML을 사용할 수 있습니다. 작성자가 관리하는 원고만 넣으며 학생 입력을 주입하지 않습니다.

38~40일차의 복잡한 기존 구성은 `html` 블록으로 보존했습니다. 공통 화면은 이미 Astro로 분리되어 있으므로 날짜별 HTML 파일을 따로 고칠 필요가 없습니다. 앞으로 반복되는 구성이 생기면 `LessonBlocks.astro`의 블록으로 분리합니다.

이미지는 `public/courses/챕터/assets/`에 둡니다. 원고의 `assets/...` 경로는 페이지가 생성될 때 챕터의 전체 경로로 변환됩니다. 새 챕터의 `assetPath`도 맞춰 주세요.

## 주소와 로컬 확인

Part 3-3의 원고와 이미지는 각각 `src/content/courses/oz-ai-bx-3-ai-benchmark-brand/`, `public/courses/oz-ai-bx-3-ai-benchmark-brand/`에서 관리합니다. 기존 `/courses/oz-ai-bx-3/` 및 날짜별 주소는 새 주소로 이동하며 장표 번호도 유지합니다.

새 주소는 `/portfolio-astro/courses/oz-ai-bx-3-ai-benchmark-brand/day/41/` 형식입니다. 기존 `index.html`, `day39.html`, `day40.html` 주소도 열 수 있도록 유지했습니다. 날짜별 `.html` 주소는 새 주소로 이동하며 장표 번호도 이어집니다.

`npm run dev -- --host 127.0.0.1`로 로컬 확인합니다. 생성된 `dist/`나 예전 로컬 HTML 생성 스크립트를 원고처럼 편집하지 마세요. 예전 스크립트는 이관 기록으로만 보관합니다.

사용자 요청 전에는 배포하지 않습니다. 기본 브랜치로 푸시하면 자동 배포될 수 있으므로 로컬 작업만 요청된 경우 푸시하지 않습니다.
