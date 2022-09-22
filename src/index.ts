import {
  useRef,
  useEffect,
  createElement,
  ComponentClass,
  FunctionComponent,
} from "react";
import * as ReactDom from "react-dom";

const slotComponent =
  (renderSlot: (container: Element, args: any) => void) =>
  (props: Record<string, any>) => {
    const ref = useRef<Element>(null);

    useEffect(() => {
      renderSlot(ref.current!, { key: props.__key, ...props });
    });

    return createElement(
      props.__tag || "div",
      { ref, key: props.__key, ...props.__props },
      null
    );
  };

function toReactProps(props: HfcProps) {
  const reactProps = { ...props.attrs, ...props.events, ...props.others };

  for (const key in props.slots) {
    reactProps[key] = slotComponent(props.slots[key]);
    reactProps[key].render = props.slots[key];
  }

  return reactProps;
}

export type Options = {
  tag: string;
  hfc: string;
  ver: string;
  names: [string[], string[], string[]];
  connected?: (container: Element) => void;
  disconnected?: () => void;
};

export function toHFC(
  Comp: ComponentClass | FunctionComponent,
  opts: Options
): HyperFunctionComponent {
  const HFC: HyperFunctionComponent = (container: Element, props: HfcProps) => {
    if (opts.connected) opts.connected(container);
    const reactProps = toReactProps(props);

    let root: any;
    const createRoot = (ReactDom as any).createRoot;
    if (createRoot) {
      // monkeypatch createRoot warn log
      const errLog = console.error;
      console.error = (function (log) {
        return function () {
          const msg = arguments[0];
          if (
            typeof msg === "string" &&
            msg.indexOf("You are importing createRoot") != -1
          )
            return;
          log.apply(console, [].slice.call(arguments));
        };
      })(console.error);

      root = createRoot(container);
      console.error = errLog;

      root.render(createElement(Comp, reactProps));
    } else {
      ReactDom.render(createElement(Comp, reactProps), container);
    }

    return {
      changed(props) {
        const reactProps = toReactProps(props);

        if (root) {
          root.render(createElement(Comp, reactProps));
        } else {
          ReactDom.render(createElement(Comp, reactProps), container);
        }
      },

      disconnected() {
        if (root) {
          root.unmount();
        } else {
          ReactDom.unmountComponentAtNode(container);
        }

        if (opts.disconnected) opts.disconnected();
      },
    };
  };

  HFC.tag = opts.tag;
  HFC.hfc = opts.hfc;
  HFC.ver = opts.ver;
  HFC.names = opts.names;

  return HFC;
}

export function toHFCReact(
  Comp: ComponentClass | FunctionComponent,
  opts: Options
): FunctionComponent {
  const slotKeys = new Set(opts.names[2]);
  return function HFCReact(_props: Record<string, any>) {
    const container = useRef(null);

    const props: Record<string, any> = {};
    for (const key in _props) {
      const value = _props[key];
      // slot key
      if (slotKeys.has(key)) {
        props[key] = toHfcSlot(value);
      } else {
        props[key] = value;
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
      createElement(Comp, props)
    );
  };
}

function toHfcSlot(Component: React.FunctionComponent | React.ComponentClass) {
  return (props: any) => {
    return createElement(
      props.__tag || "div",
      props.__props,
      createElement(Component, props)
    );
  };
}
