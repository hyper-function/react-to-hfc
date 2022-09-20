import {
  useRef,
  useEffect,
  createElement,
  ComponentClass,
  FunctionComponent,
  createElement as h,
} from "react";
import * as ReactDom from "react-dom";

const slotComponent =
  (renderSlot: (container: Element, args: any) => void) =>
  (props: Record<string, any>) => {
    const ps = { ...props };
    const key = ps.__key;
    const ref = useRef<Element>(null);
    useEffect(() => {
      if (key) ps.key = key;
      renderSlot(ref.current!, ps);
    });

    const __props = ps.__props || {};
    __props.ref = ref;
    if (key) __props.key = key;

    return h(ps.__tag || "div", __props, null);
  };

function toReactProps(props: HfcProps) {
  const reactProps = { ...props.attrs, ...props.events, ...props.others };

  const slotKeys = Object.keys(props.slots);
  for (let i = 0; i < slotKeys.length; i++) {
    const key = slotKeys[i];
    reactProps[key] = slotComponent(props.slots[key]);
    reactProps[key].render = props.slots[key];
  }

  return reactProps;
}

export function reactToHfc(
  Comp: ComponentClass | FunctionComponent,
  opts: {
    tag: string;
    hfc: string;
    ver: string;
    names: [string[], string[], string[]];
    connected?: (container: Element, props: HfcProps) => void;
    disconnected?: () => void;
  }
): HyperFunctionComponent {
  const HFC: HyperFunctionComponent = (container: Element, props: HfcProps) => {
    if (opts.connected) opts.connected(container, props);
    const reactProps = toReactProps(props);

    let root: any;
    const createRoot = (ReactDom as any).createRoot;
    if (createRoot) {
      root = createRoot(container);
      root.render(h(Comp, reactProps));
    } else {
      ReactDom.render(h(Comp, reactProps), container);
    }

    return {
      changed(props) {
        const reactProps = toReactProps(props);

        if (root) {
          root.render(h(Comp, reactProps));
        } else {
          ReactDom.render(h(Comp, reactProps), container);
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

export function toHfcSlot(
  Component: React.FunctionComponent | React.ComponentClass
) {
  return (props: any) => {
    return createElement(
      props.__tag || "div",
      props.__props,
      createElement(Component, props)
    );
  };
}
