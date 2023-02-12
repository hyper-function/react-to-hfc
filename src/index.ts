import { useRef, useState, useEffect, Fragment, createElement } from "react";
import * as ReactDom from "react-dom";

import type { ReactNode } from "react";

import type {
  HfcProps,
  HfcMethods,
  HyperFunctionComponent,
  HfcSlotCallback,
  HfcSlotOptions,
} from "hyper-function-component";

const slotToReactComponent =
  (slotRenderFn: HfcSlotCallback) =>
  (props: { tag?: string; args: Record<string, any>; [k: string]: any }) => {
    const ref = useRef<Element>(null);
    const hfcSlot = useRef<HfcSlotOptions | null>(null);

    useEffect(() => {
      if (hfcSlot.current !== null) {
        hfcSlot.current.args = props.args;
        hfcSlot.current.changed?.();
      }
    });

    useEffect(() => {
      hfcSlot.current = {
        args: props.args,
        target: ref.current!,
      };

      slotRenderFn(hfcSlot.current);
      return () => {
        // unmount slot
        hfcSlot.current!.removed?.();
      };
    }, []);

    return createElement(
      props.tag || "div",
      { ...props, ref, tag: undefined, args: undefined },
      null
    );
  };

function toReactProps(props: HfcProps) {
  const reactProps = { ...props.attrs, ...props.events, ...props._ };

  if (props.slots) {
    for (const key in props.slots) {
      const slotRenderFn = props.slots[key];
      if (!slotRenderFn) continue;

      reactProps[key] = slotToReactComponent(slotRenderFn);
      (reactProps[key] as any)._render = slotRenderFn;
    }
  }

  return reactProps;
}

export type Options = {
  tag: string;
  hfc: string;
  ver: string;
  names: [string[], string[], string[], string[]];
  connected?: (container: Element) => void;
  changed?: (props: HfcProps, partial?: boolean) => void;
  disconnected?: () => void;
};

const portals = new Map<
  string,
  {
    node: ReactNode;
    container: Element;
  }
>();

let uuid = 0;
let forceUpdateRoot = () => {};
export const rootElement = document.createElement("div");

function HFCReactRoot() {
  const [, update] = useState(0);
  forceUpdateRoot = () => update((n) => n + 1);

  return createElement(
    Fragment,
    null,
    Array.from(portals).map(([key, { container, node }]) =>
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
  const HFC: HyperFunctionComponent<T, P, M> = (initProps: P) => {
    const key = "k" + uuid++;

    const currentProps = {
      attrs: initProps.attrs || {},
      events: initProps.events || {},
      slots: initProps.slots || {},
      _: initProps._ || {},
    };

    let forceUpdateWrapper: () => void;
    function Wrapper() {
      const [, update] = useState(0);
      forceUpdateWrapper = () => update((n) => n + 1);
      const props = toReactProps(currentProps);

      return createElement(Comp, props);
    }

    return {
      connected(container: Element) {
        if (opts.connected) opts.connected(container);

        portals.set(key, {
          container,
          node: createElement(Wrapper),
        });

        forceUpdateRoot();
      },

      changed(props: P, partial?: boolean) {
        if (opts.changed) opts.changed(props, partial);
        if (props.attrs) {
          currentProps.attrs = partial
            ? { ...currentProps.attrs, ...props.attrs }
            : props.attrs;
        }

        if (props.events) {
          currentProps.events = partial
            ? { ...currentProps.events, ...props.events }
            : props.events;
        }

        if (props.slots) {
          currentProps.slots = partial
            ? { ...currentProps.slots, ...props.slots }
            : props.slots;
        }

        if (props._) {
          currentProps._ = partial
            ? { ...currentProps._, ...props._ }
            : props._;
        }

        forceUpdateWrapper();
      },

      disconnected() {
        if (opts.disconnected) opts.disconnected();

        portals.delete(key);
        forceUpdateRoot();
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
    tag?: string;
    args: Record<string, any>;
    [k: string]: any;
  }) => {
    return createElement(
      props.tag || "div",
      props,
      createElement(Comp, props.args)
    );
  };
}
