# BindZ Skill: Reactive Data Binding for AI Agents

## Overview

**BindZ** is a lightweight, reactive data binding system that automatically synchronizes JavaScript data objects with DOM elements. It's particularly useful for AI agents that need to:
- Update UI in real-time as data changes
- Respond to user interactions (two-way binding)
- Manage dynamic lists and conditional rendering
- Handle complex data structures with nested objects and arrays

Unlike frameworks like Vue or React, BindZ works directly with plain HTML and requires no build step—making it ideal for AI-generated interfaces and rapid prototyping.

## Core Concepts

### 1. Simple Data Binding

**Purpose**: Bind a data property directly to an HTML element's text content.

```html
<h1 z-bind="title"></h1>
<p z-bind="description"></p>
```

```javascript
import { bind } from 'lib/bindz.mjs';

const data = {
  title: 'Hello, World!',
  description: 'This is a simple example'
};

const bindz = bind(document.getElementById('container'), data);
```

**How it works**:
- The `z-bind` attribute directly maps to a property name in your data object
- When you update `bindz.getData().title = 'New Title'`, the HTML automatically updates
- Use `bindz.getData()` to access and modify the reactive data object

**AI Agent Use Case**: Display real-time information from your AI (status messages, generated content, extracted data).

### 2. Two-Way Binding

**Purpose**: Synchronize data between DOM elements and JavaScript—changes flow both directions.

```html
<input type="text" z-bind="description" />
<p z-bind="description"></p>
<input type="checkbox" z-bind="showDescription" />
```

```javascript
const data = {
  description: 'Initial value',
  showDescription: true
};

bind(document.getElementById('container'), data);
```

**Supported Elements**:
- `<input type="text">` / `<input type="email">` etc.
- `<textarea>`
- `<select>`
- `<input type="checkbox">`
- `<input type="radio">`

**AI Agent Use Case**: Allow users to refine AI outputs, collect feedback, or adjust parameters—all changes automatically update your data model.

### 3. Template Expressions with `${}`

**Purpose**: Use JavaScript expressions directly in HTML to compute or format values dynamically.

```html
<p>${description}</p>
<p>${description.toUpperCase()}</p>
<p>${items.length > 0 ? 'Items found' : 'No items'}</p>
<p>${item.price * quantity}</p>
```

**Features**:
- Full JavaScript expression support inside `${}`
- Handles method calls, operators, and ternary expressions
- Expressions are re-evaluated whenever dependent data changes

**AI Agent Use Case**: Format AI responses (e.g., `${response.text.trim()}`, display calculated results, apply transformations).

### 4. Conditional Rendering

**Purpose**: Show or hide elements based on data conditions.

```html
<!-- Show element if condition is true -->
<p z-show-if="showDescription">Detailed description visible</p>

<!-- Hide element if condition is true (opposite of z-show-if) -->
<p z-hide-if="showDescription">Brief description hidden</p>
```

**How it works**:
- `z-show-if`: Element has `display: none` when condition is false
- `z-hide-if`: Element has `display: none` when condition is true
- Both use CSS visibility, not DOM removal (fast and smooth)

**AI Agent Use Case**: Show different UI sections based on AI analysis results (e.g., show error warnings only when errors exist, show advanced options based on user expertise level).

### 5. Dynamic Lists and Loops

**Purpose**: Render repeating elements for arrays, with automatic updates when array changes.

```html
<ul>
  <li z-bind="item of items">
    ${item.name} - ${item.price}
  </li>
</ul>
```

```javascript
const data = {
  items: [
    { name: 'Product A', price: 10 },
    { name: 'Product B', price: 20 }
  ]
};

bind(document.getElementById('container'), data);

// Add new item—UI updates automatically
bindz.getData().items.push({ name: 'Product C', price: 30 });
```

**How it works**:
- `z-bind="item of items"` creates a loop over the `items` array
- Each loop variable (`item`) is available within that element and its children
- Modifying the array (push, splice, etc.) automatically updates the DOM

**Nested Loops**:
```html
<ul>
  <li z-bind="item of items">
    ${item.name}
    <ol>
      <li z-bind="subItem of item.subItems">
        ${subItem.name}
      </li>
    </ol>
  </li>
</ul>
```

**AI Agent Use Case**: Display search results, conversation history, generated lists, or multi-step processes that grow as the AI produces results.

### 6. Event Handling

**Purpose**: Call functions when user interactions occur, with access to the event and element context.

```html
<button z-on-click="myFunctions.handleClick()">Click me</button>
<button z-on-dblclick="myFunctions.handleDoubleClick(event, this)">Double click</button>
```

```javascript
const myFunctions = {
  handleClick: () => {
    alert('Button clicked!');
  },
  handleDoubleClick: (event, element) => {
    console.log('Event type:', event.type);
    console.log('Element:', element.textContent);
  }
};

bind(document.getElementById('container'), data, { myFunctions });
```

**Supported Events**:
- `z-on-click`
- `z-on-dblclick`
- `z-on-change`
- `z-on-input`
- `z-on-focus`
- `z-on-blur`
- And any standard DOM event

**Special Attributes**:
- `z-prevent-double-click`: Prevents multiple clicks from firing simultaneously

**AI Agent Use Case**: Trigger AI actions (generate content, fetch data, refine results), submit feedback, or navigate between different views.

### 7. Attribute Binding

**Purpose**: Bind data to HTML attributes, not just text content.

```html
<p style="color: ${styling.color}">${description}</p>
<select z-bind="styling.color">
  <option value="black">Black</option>
  <option value="red">Red</option>
</select>
<input type="checkbox" checked="${styling.color === 'blue'}" />
```

**How it works**:
- Use `${expression}` syntax inside any attribute value
- Common use cases: `style`, `class`, `checked`, `disabled`, `href`, `src`

**AI Agent Use Case**: Apply themes based on AI classification, enable/disable inputs based on AI validation, dynamically set URLs or data attributes.

## Advanced Patterns for AI Agents

### Pattern 1: Real-Time Data Updates

```javascript
const bindz = bind(document.getElementById('container'), data);

// Simulate streaming AI response
const updateInterval = setInterval(() => {
  bindz.getData().aiResponse += 'more text...';
}, 100);

setTimeout(() => clearInterval(updateInterval), 5000);
```

### Pattern 2: Nested Data with Complex Structures

```html
<div z-bind="user of users">
  <h3>${user.name}</h3>
  <p>Score: ${user.scores.average}</p>
  <ul>
    <li z-bind="score of user.scores.recent">
      ${score}
    </li>
  </ul>
</div>
```

### Pattern 3: Conditional Lists

```html
<div>
  <p z-show-if="filteredItems.length === 0">No results found</p>
  <ul z-show-if="filteredItems.length > 0">
    <li z-bind="item of filteredItems">
      ${item}
    </li>
  </ul>
</div>
```

```javascript
// Update filtering in response to AI analysis
bindz.getData().filteredItems = data.items.filter(item => 
  item.relevance > 0.7 // AI relevance score
);
```

### Pattern 4: Multi-Step AI Workflows

```html
<div id="workflow">
  <section z-show-if="step === 1">
    <h2>Input Data</h2>
    <input type="text" z-bind="userInput" />
    <button z-on-click="actions.analyzeInput()">Analyze</button>
  </section>
  
  <section z-show-if="step === 2">
    <h2>AI Processing</h2>
    <p>Status: ${processingStatus}</p>
    <progress value="${progressPercent}" max="100"></progress>
  </section>
  
  <section z-show-if="step === 3">
    <h2>Results</h2>
    <ul>
      <li z-bind="result of results">
        ${result}
      </li>
    </ul>
  </section>
</div>
```

```javascript
const data = {
  step: 1,
  userInput: '',
  processingStatus: '',
  progressPercent: 0,
  results: []
};

const actions = {
  analyzeInput: async () => {
    data.step = 2;
    // Call AI and update progress
    for (let i = 0; i <= 100; i += 10) {
      data.progressPercent = i;
      await new Promise(r => setTimeout(r, 100));
    }
    // Populate results from AI
    data.results = ['Result 1', 'Result 2'];
    data.step = 3;
  }
};

bind(document.getElementById('workflow'), data, { actions });
```

## Getting Data and Accessing Bound Context

```javascript
// Initialize binding
const bindz = bind(containerElement, data, optionalContext);

// Get reactive data object
const reactiveData = bindz.getData();

// Update data (triggers UI updates)
reactiveData.title = 'New Title';
reactiveData.items.push(newItem);

// Listen to data changes (if needed for external updates)
// The binding system automatically updates UI, but you can subscribe to changes
```

## Performance Considerations for AI Agents

1. **Large Lists**: For lists with 1000+ items, update in batches or use virtual scrolling patterns
2. **Frequent Updates**: BindZ uses efficient DOM diffing—only changed elements re-render
3. **Complex Expressions**: Keep `${}` expressions simple; compute complex logic in JavaScript
4. **Memory**: Arrays and objects are deeply observed for reactivity; for very large datasets, consider resetting rather than appending infinitely

## Common Gotchas

- **Array vs Object Changes**: Modifying array elements directly works (`items[0].name = 'new'`), but add/remove requires using array methods (`push`, `splice`)
- **Undefined Paths**: BindZ safely handles undefined nested paths—they simply won't render
- **Escape Syntax**: Use `\${expression}` to render literal `${expression}` without evaluation

## Summary for AI Integration

BindZ is minimal, reactive, and requires no build tools. For AI agents generating UIs:
1. Define your AI response/state as a JavaScript object
2. Mark HTML with `z-bind`, `z-on-*`, `${}` directives
3. Update your data object; UI updates automatically
4. Combine with AI APIs for responsive, intelligent interfaces

Perfect for: chatbots, content generators, real-time dashboards, interactive forms, result explorers, and any UI driven by dynamic AI-generated content.
