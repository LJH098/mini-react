# mini-react

기존 Virtual DOM 엔진 위에 key 기반 child reconciliation과 루트 전용 mini React runtime을 얹은 과제 프로젝트입니다.

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

- 기존 VDOM + Diff + Patch 구조를 유지합니다.
- child diff는 `props.key`를 사용하는 keyed reconciliation을 지원합니다.
- keyed reorder에서는 `PatchType.MOVE`로 기존 DOM node identity를 유지합니다.
- `key`는 reconciliation metadata만 담당하고 실제 DOM attribute로 렌더링되지 않습니다.
- hooks와 state는 루트 컴포넌트에서만 지원합니다.
- 자식 컴포넌트는 props만 받는 stateless plain function입니다.

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
  - 게시글 목록은 `post.id` key로 렌더링되고, 인기순 정렬에서 좋아요 변화가 reorder로 이어집니다.
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
- `인기순` 정렬에서 좋아요를 누르면 게시글 순서가 바뀌면서 keyed diff가 자연스럽게 동작합니다.
- 게시글과 로그인 상태는 `localStorage`에 저장되어 새로고침 뒤에도 유지됩니다.

## 실제 React와의 차이점

- hooks는 루트 컴포넌트에서만 지원합니다.
- child local state와 child component instance는 없습니다.
- fiber, scheduler, context, reducer, refs, batching을 구현하지 않았습니다.
- 학습용 구현이므로 작고 설명 가능한 구조를 우선했습니다.
