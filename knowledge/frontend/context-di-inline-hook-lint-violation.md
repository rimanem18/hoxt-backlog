---
description: Context-based DIパターン（例 TaskServicesProvider の services prop）に、あるパラメータで束縛したhookをインラインのアロー関数で渡そうとして、biomeの`lint/correctness/useHookAtTopLevel`（React Hooksルール）に引っかかるときに参照する。「フィルタ・絞り込み用の引数を持つ既存hookを、別featureのcontainerコンポーネントから注入したい」というシーンで起こりやすい。
---

## 見出し

Context DIの`services`propに`() => useXxx(arg)`のようなインライン関数を渡すとhooksルール違反になる

## 背景

このプロジェクトはCustom HooksをContext経由で注入するDIパターン（`.claude/rules/frontend.md`の「Context-based DIパターン」）を採用している。`TaskServicesProvider`は`useTasks`/`useTaskMutations`を`services` propとして受け取り、コンポーネント側は`useTaskServices()`経由でそれらを呼び出す。

project詳細画面で「そのprojectIdに絞り込んだtask一覧」を表示するために、既存の`useTasks(projectId?: string)`を特定のprojectIdで固定した状態でDI注入したいというケースが発生した。

## 生じた問題

以下のように、呼び出し元のコンポーネント内でprojectIdをクロージャに閉じ込めたインライン関数を`services`に渡したところ、`make fmt`（biome）が失敗した。

```tsx
// NG: ページ側でprojectIdに束縛したhookをインラインで渡す
<TaskServicesProvider
  services={{
    useTasks: () => useTasks(projectId), // ← ここでエラー
    useTaskMutations,
  }}
>
```

```
lint/correctness/useHookAtTopLevel
  × This hook is being called from a nested function, but all hooks must be
    called unconditionally from the top-level component.
```

`const useProjectScopedTasks = () => useTasks(projectId);`のように名前を`use`で始めた変数へ切り出せば、biomeはこれをカスタムhookの定義として認識し、lintエラー自体は解消できる。しかし、この対応はコンポーネントの複雑さを増やすだけの「lint回避のためだけの間接層」であり、レビューでsimplification観点の指摘を受けた。

## 対処法

本質的な問題は「DIで注入するhookのシグネチャを、呼び出し側の文脈（projectId）に応じて変えたい」という要求そのものにある。この場合、**hookのラップではなく、hookを使う側のコンポーネントにpropsを追加する**方が筋が良い。

```tsx
// TaskList.tsx側: projectIdをoptional propsとして受け取り、Context経由のuseTasksへそのまま渡す
interface TaskListProps {
  onEdit?: (task: Task) => void;
  projectId?: string;
}

function TaskList(props: TaskListProps = {}): React.ReactNode {
  const { useTasks, useTaskMutations } = useTaskServices();
  const { data: tasks, isLoading, error } = useTasks(props.projectId);
  // ...
}
```

```tsx
// 呼び出し側: デフォルトのServicesProviderのままで、propsだけで絞り込みを表現する
<TaskServicesProvider>
  <TaskList projectId={projectId} />
</TaskServicesProvider>
```

この形にすると、`services`のカスタム注入・独自ラップhookの定義・`useTaskMutations`の再import等が一切不要になり、コード量も減り、hooksルールにも自然に従える。

## 学び

- Context DIの`services`にhookを渡す際、**呼び出し側の文脈（引数）でhookの挙動を変えたい**という要求が出たら、まず「hook側のシグネチャは変えずに、それを使うコンポーネントにpropsを追加できないか」を検討する。DI層で無理にクロージャを作ると、lintルール違反や不要な間接層を生みやすい
- biomeの`useHookAtTopLevel`は、オブジェクトプロパティの値として渡されたインラインのアロー関数内でのhook呼び出しを「hookの定義」として認識しない。`use`接頭辞の名前付き関数（`function` or `const useXxx = () => {}`）として独立させれば、そのhookの呼び出しが自身のtop levelにあるとみなされ、lintエラーは消える。ただし、これは「lintを通す」ための最小手段であり、根本的な設計改善（propsでの表現）が可能な場合はそちらを優先する
