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
