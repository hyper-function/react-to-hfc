import { useRef, useState, useEffect, Fragment, createElement } from "react";
import * as ReactDom from "react-dom";

import type { ReactNode } from "react";

import type {
  HfcProps,
  HfcMethods,
  HyperFunctionComponent,
} from "hyper-function-component";

const slotToReactComponent =
  (renderSlot: (container: Element, args: any) => void) =>
  (props: {
    _tag?: string;
    _key?: string;
    _props: Record<string, unknown>;
    [k: string]: unknown;
  }) => {
    const ref = useRef<Element>(null);

    useEffect(() => {
      renderSlot(ref.current!, { key: props._key, ...props });
    });

    return createElement(
      props._tag || "div",
      { ref, key: props._key, ...props._props },
      null
    );
  };

function toReactProps(props: HfcProps) {
  const reactProps = { ...props.attrs, ...props.events, ...props._ };

  for (const key in props.slots) {
    const slotRenderFn = props.slots[key];
    if (!slotRenderFn) continue;

    reactProps[key] = slotToReactComponent(slotRenderFn);
    (reactProps[key] as any)._render = slotRenderFn;
  }

  return reactProps;
}

export type Options = {
  tag: string;
  hfc: string;
  ver: string;
  names: [string[], string[], string[], string[]];
  connected?: (container: Element) => void;
  disconnected?: () => void;
};

let uid = 0;
let forceUpdate: () => void;
export const rootElement = document.createElement("div");

const protals = new Map<
  string,
  {
    node: ReactNode;
    container: Element;
  }
>();

function HFCReactRoot() {
  const [, update] = useState(0);
  forceUpdate = () => update((n) => n + 1);

  return createElement(
    Fragment,
    null,
    Array.from(protals).map(([key, { container, node }]) =>
      ReactDom.createPortal(node, container, key)
    )
  );
}

const createRoot = (ReactDom as any).createRoot;
if (createRoot) {
  // hijack createRoot error log
  const log = console.error;
  console.error = () => {};
  const root = createRoot(rootElement);
  console.error = log;

  root.render(createElement(HFCReactRoot));
} else {
  ReactDom.render(createElement(HFCReactRoot), rootElement);
}

export function toHFC<
  T extends Element = Element,
  P extends HfcProps = HfcProps,
  M extends HfcMethods = HfcMethods
>(Comp: any, opts: Options) {
  const HFC: HyperFunctionComponent<T, P, M> = (
    container: Element,
    initProps: P
  ) => {
    if (opts.connected) opts.connected(container);

    const key = "k" + uid++;

    let changeReactProps: (props: HfcProps) => void;
    function Wrapper() {
      const [props, setProps] = useState(toReactProps(initProps));

      changeReactProps = (hfcProps: HfcProps) =>
        setProps(toReactProps(hfcProps));

      return createElement(Comp, props);
    }

    protals.set(key, {
      container,
      node: createElement(Wrapper),
    });

    forceUpdate();
    return {
      changed(props: P) {
        changeReactProps(props);
      },

      disconnected() {
        if (opts.disconnected) opts.disconnected();

        protals.delete(key);
        forceUpdate();
      },
    };
  };

  HFC.tag = opts.tag;
  HFC.hfc = opts.hfc;
  HFC.ver = opts.ver;
  HFC.names = opts.names;

  return HFC;
}

export function toHFCReact(Comp: any, opts: Options): any {
  const slotKeys = new Set(opts.names[2]);
  return function HFCReact(props: Record<string, any>) {
    const container = useRef(null);

    const _props: Record<string, any> = {};
    for (const key in props) {
      const value = props[key];
      // slot key
      if (slotKeys.has(key)) {
        _props[key] = toHfcSlot(value);
      } else {
        _props[key] = value;
      }
    }

    useEffect(() => {
      if (opts.connected) opts.connected(container.current!);
      return () => {
        if (opts.disconnected) opts.disconnected();
      };
    }, []);

    return createElement(
      opts.tag,
      { ref: container },
      createElement(Comp, _props)
    );
  };
}

function toHfcSlot(Comp: any) {
  return (props: {
    _tag?: string;
    _key?: string;
    _props: Record<string, unknown>;
    [k: string]: unknown;
  }) => {
    return createElement(
      props._tag || "div",
      { key: props._key, ...props._props },
      createElement(Comp, props as any)
    );
  };
}
