import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReferencedList } from './src/ReferencedList';
import { referencedPlugin } from './src/referenced';
import type { ViewOptions } from './types/utils';

declare global {
  interface Window {
    optionsGenerators?: {
      customGenerateViewOptions?: (
        path: string,
        ...rest: any[]
      ) => ViewOptions;
    };
  }
}

function mountReferenced(container: HTMLElement, pagePath: string): void {
  if (container.dataset.referencedMounted === 'true') return;
  container.dataset.referencedMounted = 'true';
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(ReferencedList, { pagePath }));
}

export function activate(): void {
  let currentPagePath = '';

  const optionsGenerators = window.optionsGenerators;
  if (optionsGenerators) {
    const original = optionsGenerators.customGenerateViewOptions;
    optionsGenerators.customGenerateViewOptions = (path: string, ...rest: any[]) => {
      currentPagePath = path;
      const options = original
        ? original(path, ...rest)
        : ({} as ViewOptions);
      if (!options.remarkPlugins) {
        options.remarkPlugins = [];
      }
      (options.remarkPlugins as any[]).push(referencedPlugin);
      return options;
    };
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        // 追加されたノード自体がターゲットの場合
        if (node.dataset.growiPluginReferenced === 'true') {
          mountReferenced(node, currentPagePath);
        }

        // 子要素にターゲットが含まれる場合
        const children = node.querySelectorAll<HTMLElement>(
          '[data-growi-plugin-referenced="true"]'
        );
        for (const child of children) {
          mountReferenced(child, currentPagePath);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
