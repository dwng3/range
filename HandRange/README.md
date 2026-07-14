# MTT 핸드레인지

GitHub Pages에 정적 배포할 수 있는 모바일 중심의 MTT 프리플랍 핸드레인지 조회 페이지입니다. 별도 빌드 과정이나 서버 기능 없이 HTML, CSS, JavaScript만 사용합니다.

## 파일 구조

```text
/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  └─ app.js
├─ data/
│  └─ mtt_first_in_ranges_v0.1.json
└─ README.md
```

`data/mtt_first_in_ranges_v0.1.json` 파일은 레인지 데이터를 넣는 위치입니다. 현재 작업에서는 데이터 파일을 생성하지 않았습니다.

## 실행 방법

GitHub Pages에서는 저장소 루트에 배포하면 바로 실행됩니다.

로컬에서는 `fetch()` 제약 때문에 HTML 파일을 직접 열지 말고 간단한 정적 서버를 사용하세요.

```bash
python -m http.server 8080
```

접속 주소:

```text
http://localhost:8080
```

## JSON 파일 경로

앱은 다음 상대 경로에서 데이터를 불러옵니다.

```javascript
./data/mtt_first_in_ranges_v0.1.json
```

파일이 없거나 JSON 문법 오류가 있으면 화면에 안내 문구를 표시하고, 기본 13x13 핸드 그리드는 폴드 상태로 유지됩니다.

## JSON 데이터 구조

예상 구조는 다음과 같습니다.

```json
{
  "meta": {
    "version": "0.1.0",
    "game": "NLHE_MTT",
    "tableSize": 9,
    "strategyModel": "simplified-training"
  },
  "positionAliases": {
    "UTG": "UTG",
    "UTG+1": "MP",
    "UTG+2": "MP",
    "LJ": "MP",
    "HJ": "HJ",
    "CO": "CO",
    "BTN": "BTN",
    "SB": "SB",
    "BB": "BB"
  },
  "stackGroups": {
    "10bb": {
      "label": "7~10BB",
      "min": 7,
      "max": 10
    }
  },
  "scenario": "FIRST_IN",
  "ranges": {
    "10bb": {
      "UTG": {
        "SHOVE": ["AA", "KK", "QQ", "AKs"],
        "RAISE": ["JJ", "TT", "AQs"]
      }
    }
  }
}
```

## 지원 액션

- `RAISE`: 레이즈
- `SHOVE`: 올인
- `CALL`: 콜
- `THREE_BET`: 3벳
- `THREE_BET_SHOVE`: 3벳 올인
- `FOUR_BET`: 4벳
- 미포함 핸드 또는 `FOLD`: 폴드

같은 핸드가 여러 액션에 중복 등록되면 먼저 발견된 액션을 표시하고 개발자 콘솔에 경고를 출력합니다.

## GitHub Pages 배포

1. GitHub 저장소에 파일을 업로드합니다.
2. 저장소 `Settings`로 이동합니다.
3. `Pages` 메뉴를 엽니다.
4. `Deploy from a branch`를 선택합니다.
5. `main / root`를 선택하고 저장합니다.

## 모바일 대응

- 320px, 360px, 390px, 430px 폭에서 가로 스크롤 없이 보이도록 모바일 우선으로 구성했습니다.
- 13x13 핸드 그리드는 `aspect-ratio: 1 / 1`로 정사각형 셀을 유지합니다.
- 버튼 터치 영역은 최소 40px 이상을 기준으로 잡았습니다.
- PC에서는 콘텐츠 최대 폭을 제한하고 핸드 그리드가 과도하게 커지지 않도록 했습니다.
