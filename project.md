# 次回プロジェクト: growi-plugin-referenced

## 概要
Growiプラグインとして `$referenced` ディレクティブを実装する。
Markdownに `$referenced` と書くと、**このページを参照している（リンクしている）ページの一覧**を表示する。

## 仕様
- Markdownに `$referenced` と記述すると、被参照ページ一覧が表示される
- Growiの検索API（`/_api/search`）を使い、現在のページパスを含むページを全文検索する
- 検索結果から自分自身を除外して一覧表示する
- 各ページはクリック可能なリンクとして表示する

---

## 実装の前提知識（前回プロジェクトで検証済み）

### Growi外部プラグインのアーキテクチャ（schemaVersion 4）

外部プラグインは以下のパイプラインで動作する：

```
$referenced
  → @growi/remark-growi-directive が leafGrowiPluginDirective ASTノードに変換
  → remarkPlugin が data.hName='div' + data-* 属性 を設定
  → remark-rehype が <div data-xxx> に変換
  → rehype-sanitize を通過（div + data-* は標準で許可）
  → MutationObserver が検知 → ReactDOM.createRoot() でReactコンポーネントをマウント
```

**重要な制約:**
- `<script>` タグ、インライン `style` 属性は rehype-sanitize で除去される
- カスタムHTMLタグ名（`<my-component>` 等）も除去される
- 安全に通過するのは: `<div>`, `<span>` 等の標準タグ + `class` 属性 + `data-*` 属性
- 動的コンテンツは MutationObserver + ReactDOM.createRoot() でマウントする方式が確実

### package.json の必須設定

```json
{
  "name": "growi-plugin-referenced",
  "version": "1.0.0",
  "description": "GROWI plugin to show pages that reference the current page",
  "license": "MIT",
  "keywords": ["growi", "growi-plugin"],
  "type": "module",
  "scripts": {
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "unified": "^11.0.5",
    "unist-util-visit": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.2",
    "vite": "^5.3.2"
  },
  "growiPlugin": {
    "schemaVersion": "4",
    "types": ["script"]
  }
}
```

**チェックリスト（守らないと動かない）:**
- `"type": "module"` が必須
- `react`, `react-dom`, `unified`, `unist-util-visit` は **dependencies**（devDependenciesではない）
- `@growi/pluginkit` は不要（動作プラグインでは使われていない）
- `"growiPlugin": { "schemaVersion": "4", "types": ["script"] }` が必須

### vite.config.ts

```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      input: ['/client-entry.tsx'],
    },
  },
});
```

- `manifest: true` が必須（Growiが dist/.vite/manifest.json を読む）
- input は `'/client-entry.tsx'`（先頭 `/` あり）

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "client-entry.tsx"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### tsconfig.node.json

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### .gitignore

```
node_modules/
*.log
```

**`dist/` は含めないこと！** Growiはリポジトリをcloneするだけでビルドしない。dist/ がリポジトリに無いとプラグインは読み込まれない。

---

## ファイル構成

```
growi-plugin-referenced/
  ├── package.json
  ├── client-entry.tsx
  ├── src/
  │   ├── referenced.ts          ... remarkプラグイン
  │   └── ReferencedList.tsx     ... 被参照ページ一覧Reactコンポーネント
  ├── types/
  │   └── utils.ts
  ├── dist/                      ... ビルド成果物（GitHubにpush必須）
  ├── tsconfig.json
  ├── tsconfig.node.json
  └── vite.config.ts
```

---

## 各ファイルの実装方針

### src/referenced.ts（remarkプラグイン）

```typescript
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

export const referencedPlugin: Plugin = function () {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type !== 'leafGrowiPluginDirective') return;
      if (node.name !== 'referenced') return;

      node.data = {
        hName: 'div',
        hProperties: {
          'data-growi-plugin-referenced': 'true',
        },
      };
    });
  };
};
```

### client-entry.tsx（エントリポイント）

activate() 内で2つのことを行う:

1. remarkPlugins に referencedPlugin を登録
2. MutationObserver で `div[data-growi-plugin-referenced]` を検知し ReactDOM でマウント

**ページパスの取得方法:**
`customGenerateViewOptions` の第1引数 `path` が現在のページパス。
これを `data-page-path` 属性に埋め込むか、グローバル変数経由でReactコンポーネントに渡す。

```typescript
// activate() 内
let currentPagePath = '';

optionsGenerators.customGenerateViewOptions = (path, ...rest) => {
  currentPagePath = path;  // ← ここで取得
  const options = original(path, ...rest);
  options.remarkPlugins.push(referencedPlugin as any);
  return options;
};

// MutationObserver のコールバック内
function mountReferenced(container: HTMLElement): void {
  if (container.dataset.referencedMounted === 'true') return;
  container.dataset.referencedMounted = 'true';
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(ReferencedList, { pagePath: currentPagePath }));
}
```

### src/ReferencedList.tsx（Reactコンポーネント）

```
マウント時:
  1. fetch('/_api/search?q="現在のページパス"') を実行
     - credentials: 'same-origin'（セッションCookie送信のため）
  2. レスポンスの data 配列から自分自身を path で除外
  3. ページ一覧を <ul><li><a href="/path"> 形式で表示
  4. ローディング中・エラー・結果0件のハンドリング
```

---

## Growi Search API 仕様

### エンドポイント

```
GET /_api/search
```

### パラメータ

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `q` | Yes | 検索キーワード。`"ダブルクォート"` で完全一致検索 |
| `limit` | No | 取得件数（デフォルト10） |
| `offset` | No | ページネーション用オフセット |

### 認証
- プラグインは Growi と同一ドメインで動作するため、ブラウザのセッションCookieが自動送信される
- `fetch` で `credentials: 'same-origin'` を指定すれば認証は不要（access_token 不要）

### レスポンス例

```json
{
  "ok": true,
  "meta": {
    "took": 34,
    "total": 5,
    "hitsCount": 5
  },
  "data": [
    {
      "_id": "5a8b15576cf1e900242e0f43",
      "path": "/user/john/memo",
      "updatedAt": "2024-01-02T00:00:00.000Z",
      "creator": { "username": "john" },
      "revision": {
        "body": "ページ本文..."
      }
    }
  ]
}
```

### 検索クエリの設計

Growiの内部リンク形式:
- Markdownリンク: `[リンク](/path/to/page)`
- Pukiwiki記法: `[[/path/to/page]]`

検索クエリ: `"/path/to/current-page"` とダブルクォートで囲めば、ページパスを含むページがヒットする。

```typescript
const query = encodeURIComponent(`"${pagePath}"`);
const res = await fetch(`/_api/search?q=${query}&limit=50`, {
  credentials: 'same-origin',
});
const json = await res.json();
// json.data にヒットしたページの配列
// json.data.filter(p => p.path !== pagePath) で自分自身を除外
```

---

## 動作確認済み参考プラグイン

| プラグイン | URL | 特徴 |
|-----------|-----|------|
| youtube | https://github.com/goofmint/growi-plugin-remark-youtube | 最もシンプルな外部プラグイン |
| datatables | https://github.com/growilabs/growi-plugin-datatables | components ラップの例 |
| script-template | https://github.com/goofmint/growi-plugin-script-template | テンプレート |
| 今回のtimer | このリポジトリ | MutationObserver + ReactDOM 方式の実例 |

### types/utils.ts（Growiが提供する型）

前回プロジェクトで検証済みの型定義をそのまま使う:

```typescript
import type React from 'react';

export interface Options {
  adminPreferredIndentSize: number;
  attrWhitelist: object;
  drawioUri: string;
  highlightJsStyleBorder: boolean;
  isEnabledLinebreaks: boolean;
  isEnabledLinebreaksInComments: boolean;
  isEnabledMarp: boolean;
  isEnabledXssPrevention: boolean;
  isIndentSizeForced: boolean;
  plantumlUri: string;
  tagWhitelist: string[];
  xssOption: string;
}

export type Func = (props: any) => void;

export interface ViewOptions {
  components: {
    [key: string]: React.FunctionComponent<any>;
  },
  remarkPlugins: [func: Func, options: any][] | Func[],
  rehypePlugins: [func: Func, options: any][] | Func[],
  remarkRehypeOptions: {
    allowDangerousHtml: boolean,
    clobberPrefix: string,
  }
}
```

---

## 実装時の注意点

1. **dist/ を .gitignore に入れない** - Growiはcloneするだけでビルドしない
2. **`"type": "module"`** を package.json に必ず入れる
3. **fetch の credentials** - `'same-origin'` でセッションCookie送信
4. **検索結果から自分自身を除外** - path で比較してフィルタ
5. **Elasticsearch 未設定の場合** - エラーハンドリングで「検索サービス未設定」を表示
6. **ビルド後に git push** - `npm run build` → `git add .` → `git push`
