import config from './package.json';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReferencedList } from './src/ReferencedList';
import { referencedPlugin } from './src/referenced';
import type { Options, Func, ViewOptions } from './types/utils';

declare const growiFacade: {
  markdownRenderer?: {
    optionsGenerators: {
      customGenerateViewOptions: (path: string, options: Options, toc: Func) => ViewOptions;
      generateViewOptions: (path: string, options: Options, toc: Func) => ViewOptions;
      generatePreviewOptions: (path: string, options: Options, toc: Func) => ViewOptions;
      customGeneratePreviewOptions: (path: string, options: Options, toc: Func) => ViewOptions;
    };
  };
};

function mountReferenced(container: HTMLElement, pagePath: string): void {
  if (container.dataset.referencedMounted === 'true') return;
  container.dataset.referencedMounted = 'true';
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(ReferencedList, { pagePath }));
}

const activate = (): void => {
  console.log('[growi-plugin-referenced] activate() called');

  if (growiFacade == null || growiFacade.markdownRenderer == null) {
    console.warn('[growi-plugin-referenced] growiFacade.markdownRenderer not found!');
    return;
  }

  let currentPagePath = '';
  const { optionsGenerators } = growiFacade.markdownRenderer;
  console.log('[growi-plugin-referenced] optionsGenerators:', optionsGenerators);

  const originalCustomViewOptions = optionsGenerators.customGenerateViewOptions;
  optionsGenerators.customGenerateViewOptions = (...args) => {
    currentPagePath = args[0];
    console.log('[growi-plugin-referenced] customGenerateViewOptions called, path:', currentPagePath);
    const options = originalCustomViewOptions
      ? originalCustomViewOptions(...args)
      : optionsGenerators.generateViewOptions(...args);
    options.remarkPlugins.push(referencedPlugin as any);
    return options;
  };

  const originalCustomPreviewOptions = optionsGenerators.customGeneratePreviewOptions;
  optionsGenerators.customGeneratePreviewOptions = (...args) => {
    const preview = originalCustomPreviewOptions
      ? originalCustomPreviewOptions(...args)
      : optionsGenerators.generatePreviewOptions(...args);
    preview.remarkPlugins.push(referencedPlugin as any);
    return preview;
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        if (node.dataset.growiPluginReferenced === 'true') {
          console.log('[growi-plugin-referenced] MutationObserver: target node found (self)', node);
          mountReferenced(node, currentPagePath);
        }

        const children = node.querySelectorAll<HTMLElement>(
          '[data-growi-plugin-referenced="true"]'
        );
        for (const child of children) {
          console.log('[growi-plugin-referenced] MutationObserver: target node found (child)', child);
          mountReferenced(child, currentPagePath);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[growi-plugin-referenced] MutationObserver started');
};

const deactivate = (): void => {};

if ((window as any).pluginActivators == null) {
  (window as any).pluginActivators = {};
}
(window as any).pluginActivators[config.name] = {
  activate,
  deactivate,
};
