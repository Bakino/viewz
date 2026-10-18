import { jest } from "@jest/globals";
import { ViewZElement } from "../lib/componentz.mjs";

class TestElement extends ViewZElement {
  constructor() {
    super('/components', { name: 'test-component' });
  }
}
customElements.define('z-test-component', TestElement);

describe('ViewZElement value', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // Replace the view's render() by a controllable promise: the real one fetches
  // the component files and only then attaches view.setValue.
  function mockRender(el) {
    let finishRender;
    const setValue = jest.fn();
    el.view.render = () => new Promise(resolve => {
      finishRender = () => {
        el.view.setValue = setValue;
        resolve();
      };
    });
    return { finishRender: () => finishRender(), setValue };
  }

  test('should deliver the value to view.setValue once rendered', async () => {
    const el = document.createElement('z-test-component');
    const { finishRender, setValue } = mockRender(el);
    document.body.appendChild(el);

    finishRender();
    await Promise.resolve();
    el.value = { a: 1 };

    expect(setValue).toHaveBeenCalledWith({ a: 1 });
  });

  test('should not lose a value pushed before view.setValue is attached', async () => {
    const el = document.createElement('z-test-component');
    const { finishRender, setValue } = mockRender(el);
    document.body.appendChild(el);

    // z-bind pushes the value while render() is still pending
    const value = { a: 1 };
    el.value = value;
    expect(setValue).not.toHaveBeenCalled();

    finishRender();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith(value);
    expect(el.hasOwnProperty('_pendingValue')).toBe(false);
  });
});
