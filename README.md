# mini-react

기존 Virtual DOM 엔진 위에 루트 전용 mini React runtime을 얹어 component, state, hook 흐름을 학습하는 과제 프로젝트입니다.

## 구성

이 프로젝트는 두 층으로 나뉩니다.

1. Virtual DOM 엔진
- `domToVdom`
- `vdomToDom`
- `diff`
- `applyPatches`
- `renderTo`
- `history`

2. Root-only runtime
- `FunctionComponent`
- `mountRoot`
- `useState`
- `useEffect`
- `useMemo`

## 핵심 포인트

- 기존 VDOM + Diff + Patch 구조 위에 루트 컴포넌트 실행 모델을 추가했습니다.
- 루트 컴포넌트는 `FunctionComponent`로 감싸며 `(props, helpers) => vnode` 형태로 렌더링합니다.
- 상태는 루트 컴포넌트에서 `useState`로 관리하고, 상태가 바뀌면 전체 화면이 다시 계산됩니다.
- `useMemo`로 목록 필터링, 정렬, 통계 같은 파생 데이터를 캐싱합니다.
- `useEffect`는 렌더 이후 실행되며 localStorage 저장, document title 변경 같은 부수 효과를 처리합니다.
- 자식 컴포넌트는 props만 받는 stateless plain function이며 `renderChild`로 조합합니다.

## Runtime API

### `FunctionComponent`

루트 컴포넌트를 감싸는 클래스입니다. 이 인스턴스가 직접 runtime 상태를 가집니다.

- `hooks`
- `hookIndex`
- `pendingEffects`
- `mount(container, initialProps)`
- `update(nextProps)`
- `unmount()`

렌더 함수는 함수형으로 유지되며 `(props, helpers) => vnode` 형태를 지원합니다.

```js
const Root = new FunctionComponent((props, { renderChild }) => {
  const [count, setCount] = useState(0);

  return elementNode("section", {}, [
    renderChild(Row, { label: "count", value: String(count) }),
  ]);
});
```

### `mountRoot`

기존 사용성을 위한 얇은 wrapper입니다.

```js
const app = mountRoot(container, Root, { initialCount: 1 });
app.rerender();
app.setProps({ initialCount: 2 });
app.unmount();
```

### Hooks

- `useState`
  - 값 또는 updater 함수를 받습니다.
  - `Object.is(prev, next)`가 같으면 rerender를 생략합니다.
- `useMemo`
  - `{ value, deps }`를 캐시합니다.
  - deps는 `Object.is` 기반 shallow compare를 사용합니다.
- `useEffect`
  - commit 이후 실행됩니다.
  - deps 변경 시 이전 cleanup을 먼저 실행합니다.
  - `unmount()` 때 cleanup을 정리합니다.

## Browser Entry Points

- `/`
  - 과제 허브 페이지입니다.
  - Week 5 커뮤니티 서비스 데모와 Week 4 Diff / History Demo 링크를 제공합니다.
- `/runtime-demo.html`
  - 이번 주 과제 메인 데모입니다.
  - mini-react로 만든 네이버 카페형 커뮤니티 서비스 화면입니다.
  - 로그인/로그아웃, 글쓰기, 수정, 좋아요, 검색, 카테고리 필터, 정렬을 보여줍니다.
  - 하나의 루트 컴포넌트에서 state를 관리하고, 자식 컴포넌트에는 props를 내려주는 구조를 보여줍니다.
- `/history-demo.html`
  - 기존 Week 4 Diff / History 데모입니다.
  - 편집 가능한 DOM 비교, patch 적용, history 이동을 그대로 확인할 수 있습니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 Vite 주소를 연 뒤 아래 페이지를 확인하면 됩니다.

- `/`
- `/runtime-demo.html`
- `/history-demo.html`

## 테스트

```bash
npm test
```

현재 저장소에는 diff, patch, history, runtime 관련 테스트가 포함되어 있습니다.

## Week 5 서비스 데모 확인 포인트

- 로그아웃 상태에서는 소개 화면과 인기글 미리보기만 보입니다.
- 로그인하면 게시판 레이아웃이 열리고 글쓰기와 수정 버튼이 나타납니다.
- 좋아요 버튼은 로그인 상태에서만 활성화되며, 누를 때마다 좋아요 수가 바로 반영됩니다.
- 글 작성이나 좋아요 이후에는 목록, 상세 패널, 통계가 같은 루트 state를 기준으로 함께 갱신됩니다.
- 게시글과 로그인 상태는 `localStorage`에 저장되어 새로고침 뒤에도 유지됩니다.

## 실제 React와의 차이점

- hooks는 루트 컴포넌트에서만 지원합니다.
- child local state와 child component instance는 없습니다.
- fiber, scheduler, context, reducer, refs, batching을 구현하지 않았습니다.
- 학습용 구현이므로 작고 설명 가능한 구조를 우선했습니다.
