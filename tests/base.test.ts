import { expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { toHFC } from "../src";
import { createElement, useEffect } from "react";

async function nextTick() {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

it("should render hello", async () => {
  const dom = new JSDOM();
  const HFC = toHFC(
    function Comp() {
      return createElement("h1", null, "hello hfc!");
    },
    {
      tag: "span",
      hfc: "demo-hfc",
      ver: "1.0.0",
      names: [[], [], [], []],
    }
  );

  const hfc = HFC(dom.window.document.body, {
    attrs: {},
    events: {},
    slots: {},
    _: {},
  });

  await nextTick();

  expect(dom.window.document.body.innerHTML).toBe("<h1>hello hfc!</h1>");
});

it("should accept attrs and _", async () => {
  const dom = new JSDOM();
  const HFC = toHFC(
    function Comp(props) {
      return createElement(
        "h1",
        null,
        `a: ${props.a} b: ${props.b} c: ${props.c} d: ${props.d} e: ${props.e}`
      );
    },
    {
      tag: "span",
      hfc: "demo-hfc",
      ver: "1.0.0",
      names: [[], [], [], []],
    }
  );

  const hfc = HFC(dom.window.document.body, {
    attrs: {
      a: 1,
      b: "bb",
      c: false,
      d: [1, 2],
    },
    events: {},
    slots: {},
    _: {
      e: 3,
    },
  });

  await nextTick();
  expect(dom.window.document.body.innerHTML).toBe(
    "<h1>a: 1 b: bb c: false d: 1,2 e: 3</h1>"
  );

  hfc.changed({
    attrs: {
      a: 2,
      b: "cc",
      c: true,
      d: [2, 3],
    },
    events: {},
    slots: {},
    _: {
      e: 4,
    },
  });

  await nextTick();
  expect(dom.window.document.body.innerHTML).toBe(
    "<h1>a: 2 b: cc c: true d: 2,3 e: 4</h1>"
  );
});

it("should accept event", async () => {
  const dom = new JSDOM();

  const onHello = vi.fn();
  const HFC = toHFC(
    function Comp(props) {
      useEffect(() => {
        props.onHello();
      }, []);
      return createElement("h1", null, "hello");
    },
    {
      tag: "span",
      hfc: "demo-hfc",
      ver: "1.0.0",
      names: [[], [], [], []],
    }
  );

  const hfc = HFC(dom.window.document.body, {
    attrs: {},
    events: {
      onHello,
    },
    slots: {},
    _: {},
  });

  await nextTick();

  expect(onHello).toHaveBeenCalledTimes(1);
});

it("should accept slot", async () => {
  const dom = new JSDOM();

  const onHello = vi.fn();
  const HFC = toHFC(
    function Comp(props) {
      return createElement("h1", null, [
        createElement(props.default, {
          key: "deft",
          _tag: "span",
          _key: "deft",
          _props: {
            id: "123",
          },
          a: 1,
        }),
      ]);
    },
    {
      tag: "span",
      hfc: "demo-hfc",
      ver: "1.0.0",
      names: [[], [], [], []],
    }
  );

  const defaultSlot = vi.fn((container, args) => {
    container.innerHTML = "hello slot!";
  });

  const hfc = HFC(dom.window.document.body, {
    attrs: {},
    events: {
      onHello,
    },
    slots: {
      default: defaultSlot,
    },
    _: {},
  });

  await nextTick();

  expect(defaultSlot.mock.lastCall![1]).toEqual({
    key: "deft",
    _tag: "span",
    _key: "deft",
    _props: { id: "123" },
    a: 1,
  });

  expect(dom.window.document.body.innerHTML).include(
    `<span id="123">hello slot!</span>`
  );

  const defaultSlot1 = vi.fn((container, args) => {
    container.innerHTML = "hello slot again";
  });

  hfc.changed({
    attrs: {},
    events: {
      onHello,
    },
    slots: {
      default: defaultSlot1,
    },
    _: {},
  });

  await nextTick();

  expect(dom.window.document.body.innerHTML).include(
    `<span id="123">hello slot again</span>`
  );
});

it("should render multiple hfc", async () => {
  const dom = new JSDOM(`
<div id="c1"></div><div id="c2"></div><div id="c3"></div>
  `);

  const c1 = dom.window.document.getElementById("c1")!;
  const c2 = dom.window.document.getElementById("c2")!;
  const c3 = dom.window.document.getElementById("c3")!;

  const onC1Mount = vi.fn();
  const onC2Mount = vi.fn();
  const onC3Mount = vi.fn();

  const onC1UnMount = vi.fn();
  const onC2UnMount = vi.fn();
  const onC3UnMount = vi.fn();

  const HFC = toHFC(
    function Comp(props) {
      useEffect(() => {
        props.onMount();
        return () => props.onUnmount();
      }, []);
      return createElement("h1", null, props.name);
    },
    {
      tag: "span",
      hfc: "demo-hfc",
      ver: "1.0.0",
      names: [[], [], [], []],
    }
  );

  const hfc1 = HFC(c1, {
    attrs: {
      name: "c1",
    },
    events: {
      onMount: onC1Mount,
      onUnmount: onC1UnMount,
    },
    slots: {},
    _: {},
  });

  const hfc2 = HFC(c2, {
    attrs: {
      name: "c2",
    },
    events: {
      onMount: onC2Mount,
      onUnmount: onC2UnMount,
    },
    slots: {},
    _: {},
  });

  const hfc3 = HFC(c3, {
    attrs: {
      name: "c3",
    },
    events: {
      onMount: onC3Mount,
      onUnmount: onC3UnMount,
    },
    slots: {},
    _: {},
  });

  await nextTick();

  expect(dom.window.document.body.innerHTML).include(
    `<div id="c1"><h1>c1</h1></div><div id="c2"><h1>c2</h1></div><div id="c3"><h1>c3</h1></div>`
  );

  expect(onC1Mount).toHaveBeenCalledTimes(1);
  expect(onC2Mount).toHaveBeenCalledTimes(1);
  expect(onC3Mount).toHaveBeenCalledTimes(1);

  hfc2.disconnected();
  c2.remove();
  await nextTick();

  expect(onC1UnMount).toHaveBeenCalledTimes(0);
  expect(onC2UnMount).toHaveBeenCalledTimes(1);
  expect(onC3UnMount).toHaveBeenCalledTimes(0);
});
