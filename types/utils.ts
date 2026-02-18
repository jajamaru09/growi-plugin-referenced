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
