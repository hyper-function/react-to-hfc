import {
  useRef,
  useEffect,
  ComponentClass,
  FunctionComponent,
  createElement as h,
} from "react";
import * as ReactDom from "react-dom";

const slotComponent =
  (renderSlot: (container: HTMLElement, args: any) => void) => (ps: any) => {
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
      renderSlot(ref.current!, ps);
    });

    const props = ps.__props || {};
    props.ref = ref;

    return h(ps.__tag || "div", props, null);
  };

export default function reactToHfc(
  Comp: ComponentClass | FunctionComponent,
  opts: {
    tag: string;
    connected: (container: HTMLElement, props: HfcProps) => void;
    disconnected: () => void;
  }
): typeof HyperFunctionComponent {
  class HfcComponent {
    static tag: string;
    state: Record<string, any> = {};
    reactRoot: any;
    container!: HTMLElement;
    RC = Comp;
    constructor(public props: HfcProps) {
      const attrKeys = Object.keys(props.attrs);
      for (let i = 0; i < attrKeys.length; i++) {
        const key = attrKeys[i];
        this.state[key] = props.attrs[key];
      }

      const eventKeys = Object.keys(props.events);
      for (let i = 0; i < eventKeys.length; i++) {
        const key = eventKeys[i];
        this.state[key] = props.events[key];
      }

      const slotKeys = Object.keys(props.slots);
      for (let i = 0; i < slotKeys.length; i++) {
        const key = slotKeys[i];
        this.state[key] = slotComponent(props.slots[key]);
        this.state[key].render = props.slots[key];
      }
    }
    connected(container: HTMLElement) {
      this.container = container;

      if (opts.connected) opts.connected(this.container, this.props);

      const createRoot = (ReactDom as any).createRoot;
      if (createRoot) {
        this.reactRoot = createRoot(container);
        this.reactRoot.render(h(Comp, this.state));
      } else {
        ReactDom.render(h(Comp, this.state), container);
      }
    }
    changed(
      type: "attr" | "event" | "slot",
      name: string,
      oldValue: any,
      newValue: any
    ) {
      if (type === "attr" || type === "event") {
        this.state[name] = newValue;
      }

      if (type === "slot") {
        this.state[name] = slotComponent(newValue);
        this.state[name].render = newValue;
      }

      if (this.reactRoot) {
        this.reactRoot.render(h(Comp, this.state));
      } else {
        ReactDom.render(h(Comp, this.state), this.container);
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
