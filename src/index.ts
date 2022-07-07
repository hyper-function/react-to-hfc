import {
  useRef,
  createElement,
  ComponentClass,
  useLayoutEffect,
  FunctionComponent,
  createElement as h,
} from "react";
import * as ReactDom from "react-dom";

const slotComponent =
  (renderSlot: (container: HTMLElement, args: any) => void) =>
  (ps: Record<string, any>) => {
    const ref = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
      renderSlot(ref.current!, ps);
    });

    const props = ps.__props || {};
    props.ref = ref;

    return h(ps.__tag || "div", props, null);
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

export default function reactToHfc(
  Comp: ComponentClass | FunctionComponent,
  opts: {
    tag: string;
    connected?: (container: HTMLElement, props: HfcProps) => void;
    disconnected?: () => void;
  }
): typeof HyperFunctionComponent {
  class HfcComponent {
    static tag: string;
    reactRoot: any;
    RC = Comp;
    constructor(public container: HTMLElement, props: HfcProps) {
      if (opts.connected) opts.connected(container, props);
      const reactProps = toReactProps(props);

      const createRoot = (ReactDom as any).createRoot;
      if (createRoot) {
        this.reactRoot = createRoot(container);
        this.reactRoot.render(h(Comp, reactProps));
      } else {
        ReactDom.render(h(Comp, reactProps), container);
      }
    }
    changed(props: HfcProps) {
      const reactProps = toReactProps(props);

      if (this.reactRoot) {
        this.reactRoot.render(h(Comp, reactProps));
      } else {
        ReactDom.render(h(Comp, reactProps), this.container);
      }
    }
    disconnected() {
      if (this.reactRoot) {
        this.reactRoot.unmount();
      } else {
        ReactDom.unmountComponentAtNode(this.container);
      }

      if (opts.disconnected) opts.disconnected();
    }
  }

  HfcComponent.tag = opts.tag;

  return HfcComponent;
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
