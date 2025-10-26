import { BindZ, DataZ, Hider, Repeater } from "../html/lib/bindz.mjs";
import { structuredClone } from 'structured-clone-polyfill';

global.structuredClone = structuredClone;
// Mock File and FileList for Node.js environment
class MockFile {
  constructor(fileBits, fileName, options) {
    this.name = fileName;
    this.lastModified = options?.lastModified || Date.now();
  }
}

class MockFileList {
  constructor(files) {
    this.files = files;
    this.length = files.length;
    for (let i = 0; i < files.length; i++) {
      this[i] = files[i];
    }
  }
}

global.File = MockFile;
global.FileList = MockFileList;


describe('BindZ', () => {
  beforeEach(() => {
    // mockHelperFunctions();
    document.body.innerHTML = '';
  });

  describe('Constructor', () => {
    test('should create instance with DOM node', () => {
      const div = document.createElement('div');
      const bindZ = new BindZ(div);
      
      expect(bindZ.node).toBe(div);
      expect(div.bindz).toBe(bindZ);
      expect(bindZ.data).toBeInstanceOf(DataZ);
      expect(bindZ.bindings).toEqual([]);
      expect(bindZ.repeaters).toEqual([]);
    });

    test('should accept DataZ instance', () => {
      const div = document.createElement('div');
      const dataZ = new DataZ({ name: 'John' });
      const bindZ = new BindZ(div, dataZ);
      
      expect(bindZ.data).toBe(dataZ);
    });

    test('should create DataZ from plain object', () => {
      const div = document.createElement('div');
      const data = { name: 'John' };
      const bindZ = new BindZ(div, data);
      
      expect(bindZ.data).toBeInstanceOf(DataZ);
      expect(bindZ.data.originalData).toBe(data);
    });
  });

  test('should prepare and start binding', () => {
    const data = new DataZ({ user: { name: 'John', age: 30 } });
    const node = document.createElement('div');
    const bindZ = new BindZ(node, data);
    bindZ.prepare();
    bindZ.startBinding();
    expect(bindZ.prepared).toBe(true);
    expect(bindZ.started).toBe(true);
  });
  
  test('should stop binding', () => {
    const data = new DataZ({ user: { name: 'John', age: 30 } });
    const node = document.createElement('div');
    const bindZ = new BindZ(node, data);
    bindZ.prepare();
    bindZ.startBinding();
    bindZ.stopBinding();
    expect(bindZ.started).toBe(false);
  });


  describe('DOM Analysis', () => {
    test('should analyze z-bind attribute', () => {
      const input = document.createElement('input');
      input.setAttribute('z-bind', 'name');
      const bindZ = new BindZ(input);
      
      bindZ.prepare();
      
      expect(bindZ.bindings).toHaveLength(1);
      expect(bindZ.bindings[0].bindAtt).toBe('name');
      expect(bindZ.bindings[0].bindProp).toBe('_value');
    });

    test('should analyze attribute binding', () => {
      const div = document.createElement('div');
      div.setAttribute('placeholder', '${name}');
      const bindZ = new BindZ(div);
      
      bindZ.prepare();
      
      expect(bindZ.bindings).toHaveLength(1);
      expect(bindZ.bindings[0].bindAtt).toBe('${name}');
      expect(bindZ.bindings[0].bindProp).toBe('placeholder');
    });

    test('should analyze event handlers', () => {
      const button = document.createElement('button');
      button.setAttribute('z-on-click', 'handleClick()');
      const bindZ = new BindZ(button);
      
      bindZ.prepare();
      
      expect(bindZ.eventListeners).toHaveLength(1);
      expect(bindZ.eventListeners[0].event).toBe('click');
      expect(bindZ.eventListeners[0].expression).toBe('handleClick()');
    });

    test('should skip literal expressions', () => {
      const div = document.createElement('div');
      div.setAttribute('placeholder', 'literal(Static text)');
      const bindZ = new BindZ(div);
      
      bindZ.prepare();
      
      expect(bindZ.bindings).toHaveLength(0);
      expect(div.getAttribute('placeholder')).toBe('Static text');
    });

    test('should handle text node expressions', () => {
      const div = document.createElement('div');
      div.innerHTML = 'Hello ${name}!';
      const bindZ = new BindZ(div);
      
      bindZ.prepare();
      
      // Should replace text node with elements
      expect(div.childNodes.length).toBeGreaterThan(1);
    });
  });

  describe('Data Binding', () => {
    test('should render select after options', () => {
      const div = document.createElement("div") ;
      div.innerHTML = `    <select z-bind="selectValue">
        <option></option>
        <option z-bind="opt of options" value="\${opt.value}">\${opt.name}</option>
      </select>`
      const data = { selectValue: "two", options : [
        { value: "one", name: "One" },
        { value: "two", name: "Two" },
      ] };
      const bindZ = new BindZ(div, data);
      
      bindZ.startBinding();
      
      expect(div.querySelector("select").value).toBe('two');
    });

    test('should bind input value to data', () => {
      const input = document.createElement('input');
      input.setAttribute('z-bind', 'name');
      const data = { name: 'John' };
      const bindZ = new BindZ(input, data);
      
      bindZ.startBinding();
      
      expect(input.value).toBe('John');
    });

    test('should bind checkbox to boolean data', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('z-bind', 'isActive');
      const data = { isActive: true };
      const bindZ = new BindZ(checkbox, data);
      
      bindZ.startBinding();
      
      expect(checkbox.checked).toBe(true);
    });

    test('should bind radio button selection', () => {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.value = 'option1';
      radio.setAttribute('z-bind', 'selectedOption');
      const data = { selectedOption: 'option1' };
      const bindZ = new BindZ(radio, data);
      
      bindZ.startBinding();
      
      expect(radio.checked).toBe(true);
    });

    test('should bind attribute with expression', () => {
      const div = document.createElement('div');
      div.setAttribute('title', '${greeting} ${name}!');
      const data = { greeting: 'Hello', name: 'John' };
      const bindZ = new BindZ(div, data);
      
      bindZ.startBinding();
      
      expect(div.getAttribute('title')).toBe('Hello John!');
    });

    test('should update DOM when data changes', () => {
      const input = document.createElement('input');
      input.setAttribute('z-bind', 'name');
      const bindZ = new BindZ(input, { name: 'John' });
      
      bindZ.startBinding();
      expect(input.value).toBe('John');
      
      bindZ.data.data.name = 'Jane';
      expect(input.value).toBe('Jane');
    });
  });

  describe('Two-way Binding', () => {
    test('should update data when input changes', () => {
      const div = document.createElement('div');
      const input = document.createElement('input');
      div.appendChild(input)
      input.setAttribute('z-bind', 'name');
      const bindZ = new BindZ(div, { name: 'John' });
      
      bindZ.startBinding();
      
      input.value = 'Jane';
      input.dispatchEvent(new Event('change'));
      
      expect(bindZ.data.data.name).toBe('Jane');
    });

    test('should update data when checkbox changes', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('z-bind', 'isActive');
      const bindZ = new BindZ(checkbox, { isActive: false });
      
      bindZ.startBinding();
      
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      
      expect(bindZ.data.data.isActive).toBe(true);
    });
  });

  describe('Event Handling', () => {
    test('should register click event', () => {
      const button = document.createElement('button');
      button.setAttribute('z-on-click', 'data.clicked = true');
      const bindZ = new BindZ(button, { clicked: false });
      
      bindZ.startBinding();
      
      button.click();
      setTimeout(()=>{
          expect(bindZ.data.data.clicked).toBe(true);
      }, 10)
    });

    test('should handle enter key event', () => {
      const input = document.createElement('input');
      input.setAttribute('z-on-enter', 'data.enterPressed = true');
      const bindZ = new BindZ(input, { enterPressed: false });
      
      bindZ.startBinding();
      
      const keyEvent = new KeyboardEvent('keyup', { keyCode: 13 });
      input.dispatchEvent(keyEvent);
      
      expect(bindZ.data.data.enterPressed).toBe(true);
    });
  });

  describe('Expression Execution', () => {
    test('should execute simple expression', () => {
      const bindZ = new BindZ(document.createElement('div'), { x: 5, y: 3 });
      const result = bindZ.runExpression('x + y');
      expect(result).toBe(8);
    });

    test('should execute string template expression', () => {
      const bindZ = new BindZ(document.createElement('div'), { name: 'John' });
      const result = bindZ.runExpression('Hello ${name}!', null, true);
      expect(result).toBe('Hello John!');
    });

    test('should handle context variables', () => {
      const bindZ = new BindZ(document.createElement('div'), {}, { contextVar: 'test' });
      const result = bindZ.runExpression('contextVar');
      expect(result).toBe('test');
    });
  });

  describe('State Management', () => {
    test('should get serializable state', () => {
      const input = document.createElement('input');
      input.setAttribute('z-bind', 'name');
      input.id = 'test-input';
      const bindZ = new BindZ(input);
      
      bindZ.prepare();
      const state = bindZ.getState();
      
      expect(state.bindings).toHaveLength(1);
      expect(state.bindings[0].nodeId).toBe('test-input');
      expect(state.bindings[0].node).toBeUndefined();
    });

    test('should restore from state', () => {
      const container = document.createElement('div');
      const input = document.createElement('input');
      input.id = 'test-input';
      input.setAttribute('z-bind', 'name');
      container.appendChild(input);
      
      const bindZ1 = new BindZ(container);
      bindZ1.prepare();
      const state = bindZ1.getState();
      
      const bindZ2 = new BindZ(container);
      bindZ2.prepareFromState(state);
      
      expect(bindZ2.bindings).toHaveLength(1);
      expect(bindZ2.bindings[0].node).toBe(input);
    });
  });

  describe('Conditional Rendering (Hider)', () => {
    test('should create hider for z-hide-if', () => {
      const div = document.createElement('div');
      div.setAttribute('z-hide-if', 'shouldHide');
      const container = document.createElement('div');
      container.appendChild(div);
      
      const bindZ = new BindZ(container, { shouldHide: false });
      bindZ.prepare();
      
      expect(bindZ.hidings).toHaveLength(1);
    });

    test('should create hider for z-show-if', () => {
      const div = document.createElement('div');
      div.setAttribute('z-show-if', 'shouldShow');
      const container = document.createElement('div');
      container.appendChild(div);
      
      const bindZ = new BindZ(container, { shouldShow: true });
      bindZ.prepare();
      
      expect(bindZ.hidings).toHaveLength(1);
    });
  });

  describe('List Rendering (Repeater)', () => {
    test('should create repeater for loop syntax', () => {
      const div = document.createElement('div');
      div.setAttribute('z-bind', 'item of items');
      const container = document.createElement('div');
      container.appendChild(div);
      
      const bindZ = new BindZ(container, { items: ['a', 'b', 'c'] });
      bindZ.prepare();
      
      expect(bindZ.repeaters).toHaveLength(1);
    });


    test('should render repeater for loop syntax', () => {
      const div = document.createElement('div');
      div.setAttribute('z-bind', 'item of items');
      div.innerHTML = `<span z-bind="item.name"></span>`
      const container = document.createElement('div');
      container.appendChild(div);
      
      const bindZ = new BindZ(container, { items: [{name: 'a'}, {name: 'b'}, {name: 'c'}] });
      bindZ.startBinding() ;

      expect(container.querySelectorAll("span")).toHaveLength(3);
      expect(container.querySelectorAll("span")[0].innerHTML).toEqual("a");
      expect(container.querySelectorAll("span")[1].innerHTML).toEqual("b");
      expect(container.querySelectorAll("span")[2].innerHTML).toEqual("c");
      
    });

    test('should render repeater for loop syntax with index', () => {
      const div = document.createElement('div');
      div.setAttribute('z-bind', '(item,index) of items');
      div.innerHTML = `<b z-bind="index"></b><span z-bind="item.name"></span>`
      const container = document.createElement('div');
      container.appendChild(div);
      
      const bindZ = new BindZ(container, { items: [{name: 'a'}, {name: 'b'}, {name: 'c'}] });
      bindZ.startBinding() ;

      expect(container.querySelectorAll("b")).toHaveLength(3);
      expect(container.querySelectorAll("b")[0].innerHTML).toEqual("0");
      expect(container.querySelectorAll("b")[1].innerHTML).toEqual("1");
      expect(container.querySelectorAll("b")[2].innerHTML).toEqual("2");
      
    });

    test('should render repeater for loop syntax with sub loop', () => {
      const div = document.createElement('div');
      div.setAttribute('z-bind', 'item of items');
      div.innerHTML = `<span z-bind="item.name"></span>
      <b z-bind="sub of item.subs"><i z-bind="sub.name"></i></b>`
      const container = document.createElement('div');
      container.appendChild(div);
      
      const bindZ = new BindZ(container, { items: [{name: 'a', subs: [{name: "sub"}, {name: "sub2"}]}, 
        {name: 'b'}, {name: 'c'}] });
      bindZ.startBinding() ;

      expect(container.querySelectorAll("div")).toHaveLength(3);
      expect(container.querySelectorAll("div")[0].querySelectorAll("b")).toHaveLength(2);
      expect(container.querySelectorAll("div")[0].querySelectorAll("b")[0].querySelector("i").innerHTML).toEqual("sub");
      expect(container.querySelectorAll("div")[0].querySelectorAll("b")[1].querySelector("i").innerHTML).toEqual("sub2");
      
    });
  });

  describe('Utility Methods', () => {
    test('should find element by ID', () => {
      const container = document.createElement('div');
      const child = document.createElement('span');
      child.id = 'test-element';
      container.appendChild(child);
      
      const bindZ = new BindZ(container);
      const found = bindZ.getElementById('test-element');
      
      expect(found).toBe(child);
    });

    test('should substitute variables', () => {
      const bindZ = new BindZ(document.createElement('div'), {}, {}, { item: 'users.0' });
      const result = bindZ.substituteVariables('item.name');
      expect(result).toBe('users.0.name');
    });

    test('should get value from path with substitution', () => {
      const bindZ = new BindZ(
        document.createElement('div'), 
        { users: [{ name: 'John' }] }, 
        {}, 
        { user: 'users.0' }
      );
      const result = bindZ.getValueFromPath('user.name');
      expect(result).toBe('John');
    });
  });

  describe('Lifecycle', () => {
    test('should start and stop binding', () => {
      const input = document.createElement('input');
      input.setAttribute('z-bind', 'name');
      const bindZ = new BindZ(input, { name: 'John' });
      
      expect(bindZ.started).toBe(false);
      
      bindZ.startBinding();
      expect(bindZ.started).toBe(true);
      expect(input.value).toBe('John');
      
      bindZ.stopBinding();
      expect(bindZ.started).toBe(false);
    });

    test('should destroy cleanly', () => {
      const div = document.createElement('div');
      const bindZ = new BindZ(div);
      
      bindZ.destroy();
      
      expect(div.zzBindAnalyzed).toBeUndefined();
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    // mockHelperFunctions();
    document.body.innerHTML = '';
  });

  test('should handle complex form binding', () => {
    document.body.innerHTML = `
      <div id="form-container">
        <input id="name-input" z-bind="user.name" />
        <input id="email-input" z-bind="user.email" />
        <span id="greeting">\${greeting} \${user.name}!</span>
        <button z-on-click="user.active = !user.active">Toggle</button>
      </div>
    `;
    
    const container = document.getElementById('form-container');
    const data = {
      greeting: 'Hello',
      user: { name: 'John', email: 'john@example.com', active: false }
    };
    
    const bindZ = new BindZ(container, data);
    bindZ.startBinding();
    
    const nameInput = document.getElementById('name-input');
    const emailInput = document.getElementById('email-input');
    
    expect(nameInput.value).toBe('John');
    expect(emailInput.value).toBe('john@example.com');
    
    // Test data to DOM binding
    bindZ.data.data.user.name = 'Jane';
    expect(nameInput.value).toBe('Jane');
    
    // Test DOM to data binding
    emailInput.value = 'jane@example.com';
    emailInput.dispatchEvent(new Event('change'));
    expect(bindZ.data.data.user.email).toBe('jane@example.com');
  });

  test('should handle nested object updates', () => {
    document.body.innerHTML = `
      <div id="nested-container">
        <span id="address">\${user.profile.address.street}</span>
      </div>
    `;
    
    const container = document.getElementById('nested-container');
    const data = {
      user: {
        profile: {
          address: { street: '123 Main St' }
        }
      }
    };
    
    const bindZ = new BindZ(container, data);
    bindZ.startBinding();
    
    // Update nested property
    bindZ.data.data.user.profile.address.street = '456 Oak Ave';
    
    // The span should be updated through text node replacement
    const addressSpan = document.getElementById('address');
    expect(addressSpan.textContent).toBe('456 Oak Ave');
  });
});