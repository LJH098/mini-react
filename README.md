# DOM-VDOM 프로젝트

## 프로젝트 개요

- DOM과 Virtual DOM 사이의 핵심 흐름을 직접 구현하고, 변경 사항을 안전하게 반영하는 과정을 하나의 결과물로 정리한 프로젝트입니다. 
- `domToVdom`, `vdomToDom`, `diff`, `applyPatches`, `renderTo`, `createHistory`를 기능별로 분리해 구현
- 최종적으로는 `history`와 UI를 연결해 상태 변화와 결과를 직접 확인할 수 있는 데모 화면까지 구성

## 기능 테스트

- 기능 구현은 모듈 단위로 나누어 검증했습니다. 각 기능이 독립적으로 올바르게 동작하는지 확인하는 동시에, 실제 사용 과정에서 발생할 수 있는 경계 조건도 함께 테스트
- 구현 모듈: `domToVdom`, `vdomToDom`, `diff`, `applyPatches`, `renderTo`, `createHistory`
- 테스트 범위: DOM-VDOM 변환, 변경 사항 계산, patch 적용, 렌더링, history 관리
- 검증 포인트: 루트 교체, 잘못된 입력 처리, 엣지 케이스, undo/redo 흐름

![[Pasted image 20260326002841.png|579]]
*기능 테스트 결과 화면*

## 협업 방식

- 기능을 역할별로 분리해 병렬로 진행한 뒤, 브랜치와 PR을 통해 통합하는 방식으로 운영 
- 위승철: `domToVdom`, `vdomToDom`, `renderTo`, 테스트 보강
- 이진혁: `diff`, `applyPatches`
- 양시준: `createHistory`, 데모 UI, 전체 통합

![[Pasted image 20260326003730.png]]
*브랜치와 PR 기반 협업 흐름![[Pasted image 20260326003844.png|523]]*
![[Pasted image 20260326003827.png|516]]

## 데모 및 결과 확인

- 최종 결과물은 기능 구현에서 끝나지 않고, 사용자가 상태 변화와 결과를 직접 확인할 수 있는 데모 화면까지 포함
- `history`와 UI를 연결해 undo/redo 흐름을 시각적으로 확인할 수 있도록 구성했고, snapshot 기반 상태 관리가 실제로 어떻게 동작하는지 한눈에 파악

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


