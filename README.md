# 테스트
## History
| Test Case                        | Status |
| -------------------------------- | ------ |
| createHistory 함수 export          | ✅      |
| 초기 snapshot 상태 설정                | ✅      |
| undo / redo 이동                   | ✅      |
| undo 후 새 snapshot push 시 redo 제거 | ✅      |
| 외부 수정에도 내부 history 불변성 유지        | ✅      |

## 2. DOM → VDOM
| Test Case        | Status |
| ---------------- | ------ |
| domToVdom export | ✅      |
| Text node 변환     | ✅      |
| Element 트리 변환    | ✅      |
| comment node 무시  | ✅      |

## 3. VDOM → DOM
| Test Case                 | Status |
| ------------------------- | ------ |
| vdomToDom export          | ✅      |
| Text vnode → Text DOM     | ✅      |
| props + children 렌더링      | ✅      |
| 중첩 vnode 재귀 처리            | ✅      |
| invalid vnode → TypeError | ✅      |
## 4. Diff
| Test Case                     | Status |
| ----------------------------- | ------ |
| diff export                   | ✅      |
| props / text / children 변경 감지 | ✅      |
| node type 변경 처리               | ✅      |
| invalid vnode → TypeError     | ✅      |
## 5. Patch
| Test Case                     | Status |
| ----------------------------- | ------ |
| diff export                   | ✅      |
| props / text / children 변경 감지 | ✅      |
| node type 변경 처리               | ✅      |
| invalid vnode → TypeError     | ✅      |
## 6. Render
| Test Case         | Status |
| ----------------- | ------ |
| renderTo export   | ✅      |
| 초기 렌더             | ✅      |
| 전체 교체 렌더          | ✅      |
| round-trip 일관성 유지 | ✅      |
## 7. Edge Cases
| Category          | Description                | Status |
| ----------------- | -------------------------- | ------ |
| Partial update    | 변경된 leaf만 patch 생성         | ✅      |
| DOM reuse         | 형제 노드 identity 유지          | ✅      |
| No-op             | 동일 vnode → 빈 patch         | ✅      |
| Subtree removal   | 부모 삭제 시 안전 정리              | ✅      |
| Root ops          | root replace/remove/add 처리 | ✅      |
| Front insertion   | DOM 결과는 맞고 identity 일부 손실  | ✅      |
| Reorder           | move 없이 index 기반 처리        | ✅      |
| Invalid vnode     | 모든 API에서 TypeError         | ✅      |
| Invalid patch     | 잘못된 patch → TypeError      | ✅      |
| Invalid path      | 존재하지 않는 경로 무시              | ✅      |
| Prop removal      | undefined 처리 및 DOM 반영      | ✅      |
| Prop types        | boolean/null/undefined 처리  | ✅      |
| class handling    | className canonicalize     | ✅      |
| Attribute support | data-*, aria-*, style 등    | ✅      |
| Void elements     | 자식 없이 처리                   | ✅      |
| Empty text        | "", null → "" 정규화          | ✅      |
