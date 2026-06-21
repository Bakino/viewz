# ComponentZ Skill: Reusable Web Components for AI Agents

## Overview

**ComponentZ** is a Web Components abstraction layer built on top of ViewZ that enables creating reusable, encapsulated UI components. It's particularly useful for AI agents that need to:
- Create reusable UI widgets (clocks, gauges, charts, etc.)
- Build component libraries for common patterns
- Encapsulate complex functionality into simple tags
- Compose UIs from self-contained building blocks
- Manage component state independently
- Emit events from components to parent views
- Support dynamic attribute updates

ComponentZ makes it easy to build modular AI applications by treating each functional piece as an independent component.

## Core Concepts

### 1. Component Structure

A ComponentZ component consists of three files organized in a directory:

**Directory structure**:
```
components/
  my-component/
    my-component.html
    my-component.css
    my-component.js
```

**HTML** (`components/my-component/my-component.html`):
```html
<div class="my-component">
    <h3>${title}</h3>
    <p>${description}</p>
    <z-slot></z-slot>
</div>
```

**CSS** (`components/my-component/my-component.css`):
```css
/* Scoped CSS - only applies within this component */
.my-component {
    border: 1px solid #ccc;
    padding: 10px;
    background: white;
}

h3 {
    color: #333;
    margin: 0;
}
```

**JavaScript** (`components/my-component/my-component.js`):
```javascript
/* globals view */

// Load initial data
view.loader = async () => {
    return {
        title: view.route.params.title || 'Default Title',
        description: view.route.params.description || 'Default description'
    };
}

// Setup and side effects
view.displayed = async () => {
    console.log('Component mounted');
}

// Cleanup
view.destroyed = async () => {
    console.log('Component destroyed');
}
```

### 2. Creating and Registering Components

**Register components** in your host HTML file:

```html
<!doctype html>
<head>
    <meta charset="utf-8">
    <title>My App with Components</title>
</head>
<body>
    <div id="container"></div>
    
    <script type="module">
        import { ViewZ } from 'lib/viewz.mjs';
        import { createComponent } from 'lib/componentz.mjs';

        // Register components
        createComponent('components', { name: 'my-component' });
        createComponent('components', { name: 'clock' });
        createComponent('components', { name: 'chart' });

        // Use components as custom HTML elements
        const view = new ViewZ({
            html: `main.html`,
            css: `main.css`,
            js: `main.js`,
            id: 'main'
        });

        view.render({ container: document.getElementById('container') });
    </script>
</body>
</html>
```

**Use components** in HTML:

```html
<!-- Simple usage -->
<z-my-component></z-my-component>

<!-- With attributes -->
<z-my-component title="AI Analysis" description="Results from analysis"></z-my-component>

<!-- With content (slot) -->
<z-my-component>
    <p>This content goes into the &lt;z-slot&gt;</p>
</z-my-component>
```

### 3. Component Parameters (Props)

Components receive parameters through HTML attributes. These are accessible in the component's JavaScript via `view.route.params`.

**Passing attributes**:
```html
<z-clock 
    clock-color="blue" 
    clock-format="24h"
    id="my-clock">
</z-clock>
```

**Accessing in component** (`clock.js`):
```javascript
view.loader = async () => {
    const clockColor = view.route.params.clockColor || 'green';  // 'blue'
    const clockFormat = view.route.params.clockFormat || '12h';  // '24h'
    const clockName = view.route.params.clock || '';
    
    return { clockColor, clockFormat, clockName };
}
```

**Important**: Attribute names are converted from kebab-case to camelCase:
- `clock-color` → `clockColor`
- `my-property` → `myProperty`
- `data-value` → `dataValue`

### 4. Slots and Content Projection

Slots allow components to accept HTML content from the parent:

**Component HTML** (`my-card/my-card.html`):
```html
<div class="card">
    <div class="card-header">
        <h3>${title}</h3>
    </div>
    <div class="card-body">
        <!-- Content from parent goes here -->
        <z-slot></z-slot>
    </div>
    <div class="card-footer">
        <button z-on-click="view.close()">Close</button>
    </div>
</div>
```

**Parent HTML** (using the component):
```html
<z-my-card title="User Profile">
    <img src="avatar.jpg" alt="Avatar" />
    <p>Name: John Doe</p>
    <p>Email: john@example.com</p>
</z-my-card>
```

**Result**: The `<p>` and `<img>` tags replace the `<z-slot>` element.

### 5. Events and Communication

**Emitting events from component**:

```javascript
// In component JS (clock.js)
view.displayed = async () => {
    setInterval(() => {
        view.data.time = new Date().toLocaleTimeString();
    }, 1000);
    
    // Listen to data changes
    view.data.addListener("time", () => {
        // Emit custom event to parent
        view.dispatchEvent("time", view.data.time);
    });
}
```

**Listening to component events in parent**:

```html
<!-- In parent view HTML -->
<z-clock z-on-time="view.handleTimeUpdate(event)"></z-clock>

<!-- In parent view JS -->
view.handleTimeUpdate = (event) => {
    const newTime = event.detail;
    console.log('Clock time:', newTime);
    view.data.currentTime = newTime;
}
```

### 6. Dynamic Attribute Updates

**Update component attributes from parent**:

```javascript
// In parent view
view.updateClockColor = () => {
    const clockElement = view.getElementById('my-clock');
    
    // Method 1: Update attribute (triggers refresh)
    clockElement.setAttribute('clock-color', 'red');
    
    // Method 2: Update component data directly
    clockElement.view.data.clockColor = 'yellow';
}
```

**Component responds to attribute changes**:
- When an attribute changes, the component automatically calls `loader()` and `refreshed()`
- The MutationObserver watches for attribute changes

### 7. Component Value Property

Components can expose a `value` property for easy integration with forms:

**Component JS**:
```javascript
view.getValue = () => {
    return view.data.selectedOption;
}

view.setValue = (value) => {
    view.data.selectedOption = value;
}
```

**Parent usage**:
```javascript
view.getValue = () => {
    const myComponent = view.getElementById('my-select');
    return myComponent.value;  // Calls view.getValue()
}

view.setValue = (newValue) => {
    const myComponent = view.getElementById('my-select');
    myComponent.value = newValue;  // Calls view.setValue()
}
```

### 8. Accessing Component Instance

**Get component reference from parent**:

```javascript
// Option 1: Via getElementById
const clockComponent = view.getElementById('my-clock');
const currentTime = clockComponent.view.data.time;

// Option 2: Via querySelector
const components = document.querySelectorAll('z-clock');
components.forEach(comp => {
    console.log('Clock params:', comp.view.route.params);
});
```

**Component properties and methods**:
- `element.view` — The ViewZ instance inside
- `element.view.data` — Reactive data object
- `element.view.route.params` — Component parameters
- `element.value` — Get/set value (if implemented)
- `element.params` — Current parameters object

## Advanced Patterns for AI Agents

### Pattern 1: Sensor/Data Display Component

```javascript
// sensor.js
view.loader = async () => {
    const sensorId = view.route.params.sensorId;
    const sensorType = view.route.params.type || 'temperature';
    
    const data = await fetchSensorData(sensorId);
    
    return {
        sensorId,
        sensorType,
        value: data.current_value,
        unit: data.unit,
        status: data.status,
        history: data.recent_readings
    };
}

view.displayed = async () => {
    // Poll for updates
    this.sensorTimer = setInterval(async () => {
        const newData = await fetchSensorData(view.route.params.sensorId);
        view.data.value = newData.current_value;
        view.data.status = newData.status;
    }, 5000);
}

view.destroyed = async () => {
    clearInterval(this.sensorTimer);
}
```

HTML:
```html
<div class="sensor">
    <h4>${sensorType}: ${value}${unit}</h4>
    <p class="status" z-bind="status">${status}</p>
    <svg class="chart"><!-- mini chart from history --></svg>
</div>
```

**Parent usage**:
```html
<div class="sensor-grid">
    <z-sensor sensor-id="temp-01" type="Temperature"></z-sensor>
    <z-sensor sensor-id="humid-01" type="Humidity"></z-sensor>
    <z-sensor sensor-id="co2-01" type="CO2"></z-sensor>
</div>
```

### Pattern 2: AI Response Widget

```javascript
// ai-response.js
view.loader = async () => {
    const prompt = view.route.params.prompt;
    
    return {
        prompt,
        response: '',
        isLoading: false,
        error: null
    };
}

view.displayed = async () => {
    view.generateResponse = async () => {
        view.data.isLoading = true;
        view.data.response = '';
        view.data.error = null;
        
        try {
            const stream = await callAIStream(view.data.prompt);
            
            for await (const chunk of stream) {
                view.data.response += chunk;
                // Emit event with current response
                view.dispatchEvent('response-update', view.data.response);
            }
            
            // Emit final response
            view.dispatchEvent('response-complete', view.data.response);
        } catch (error) {
            view.data.error = error.message;
            view.dispatchEvent('response-error', error);
        } finally {
            view.data.isLoading = false;
        }
    }
    
    // Auto-generate if prompt is provided
    if (view.data.prompt) {
        await view.generateResponse();
    }
}
```

HTML:
```html
<div class="ai-response">
    <div z-show-if="isLoading" class="spinner">
        Generating...
    </div>
    
    <div z-show-if="!isLoading && response">
        ${response}
    </div>
    
    <div z-show-if="error" class="error">
        Error: ${error}
    </div>
</div>
```

**Parent usage**:
```html
<z-ai-response 
    prompt="Explain machine learning" 
    z-on-response-complete="view.handleResponse(event)">
</z-ai-response>
```

### Pattern 3: Form Input Component

```javascript
// text-input.js
view.loader = async () => {
    return {
        value: view.route.params.value || '',
        placeholder: view.route.params.placeholder || '',
        validation: view.route.params.validation || null,
        error: ''
    };
}

view.displayed = async () => {
    view.getValue = () => view.data.value;
    
    view.setValue = (newValue) => {
        view.data.value = newValue;
    }
    
    view.handleInput = (event) => {
        view.data.value = event.target.value;
        view.dispatchEvent('input', view.data.value);
    }
    
    view.validate = () => {
        if (view.data.validation === 'email') {
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(view.data.value);
            view.data.error = isValid ? '' : 'Invalid email';
            return isValid;
        }
        return true;
    }
    
    view.handleChange = () => {
        const isValid = view.validate();
        view.dispatchEvent('change', {
            value: view.data.value,
            valid: isValid
        });
    }
}
```

HTML:
```html
<div class="input-wrapper">
    <input 
        type="text"
        z-bind="value"
        z-on-input="view.handleInput(event)"
        z-on-change="view.handleChange()"
        placeholder="${placeholder}"
    />
    <span z-show-if="error" class="error">${error}</span>
</div>
```

### Pattern 4: Dashboard Widget with Refresh

```javascript
// dashboard-widget.js
view.loader = async () => {
    const widgetType = view.route.params.type;
    const refreshInterval = view.route.params.refreshInterval || 30000;
    
    const data = await fetchWidgetData(widgetType);
    
    return {
        widgetType,
        refreshInterval,
        title: data.title,
        content: data.content,
        lastRefresh: new Date().toLocaleTimeString()
    };
}

view.displayed = async () => {
    // Auto-refresh
    this.refreshTimer = setInterval(() => {
        view.refresh();
    }, view.data.refreshInterval);
    
    view.manualRefresh = async () => {
        view.data.lastRefresh = 'Refreshing...';
        await view.refresh();
    }
}

view.destroyed = async () => {
    clearInterval(this.refreshTimer);
}
```

### Pattern 5: Data Table Component with Sorting/Filtering

```javascript
// data-table.js
view.loader = async () => {
    const dataSource = view.route.params.dataSource;
    
    const data = await fetchTableData(dataSource);
    
    return {
        dataSource,
        columns: data.columns,
        rows: data.rows,
        sortBy: null,
        sortOrder: 'asc',
        filterText: ''
    };
}

view.displayed = async () => {
    view.sort = (columnName) => {
        if (view.data.sortBy === columnName) {
            view.data.sortOrder = view.data.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            view.data.sortBy = columnName;
            view.data.sortOrder = 'asc';
        }
        view.updateFilteredRows();
    }
    
    view.filter = (text) => {
        view.data.filterText = text;
        view.updateFilteredRows();
    }
    
    view.updateFilteredRows = () => {
        let filtered = view.data.rows;
        
        // Apply filter
        if (view.data.filterText) {
            filtered = filtered.filter(row =>
                JSON.stringify(row).toLowerCase().includes(view.data.filterText.toLowerCase())
            );
        }
        
        // Apply sort
        if (view.data.sortBy) {
            filtered.sort((a, b) => {
                const aVal = a[view.data.sortBy];
                const bVal = b[view.data.sortBy];
                const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return view.data.sortOrder === 'asc' ? cmp : -cmp;
            });
        }
        
        view.data.filteredRows = filtered;
    }
    
    view.updateFilteredRows();
}
```

## Parent View Access

**In parent view**, access components via helper methods:

```javascript
// In parent view JS
view.getElementById(id);          // Get element by ID
view.getAllComponents();           // Get all components
view.getComponentByTag(tagName);   // Get by custom element tag
```

## Component Context

Components can access their parent view through `view.context.parentView`:

```javascript
// In component JS
view.displayed = async () => {
    const parentView = view.context.parentView;
    
    if (parentView) {
        // Can access parent data
        console.log('Parent data:', parentView.data);
        
        // Can call parent methods
        parentView.notifyComponentEvent(view.id);
    }
}
```

## CSS Scoping

Component CSS is automatically scoped and doesn't affect other components:

```css
/* This only applies within this component */
.button {
    background: blue;
}

h3 {
    color: purple;
}
```

**Benefits**:
- No class name conflicts
- Safe to use generic selectors
- Styles never leak to other components

## Lifecycle Hooks

Components follow the same ViewZ lifecycle:

```javascript
// Called when component is created
view.loader = async () => {
    return initialData;
}

// Called when component is rendered
view.displayed = async () => {
    // Setup listeners, timers
}

// Called when attributes change
view.refreshed = async () => {
    // Handle refresh
}

// Called when component is removed from DOM
view.destroyed = async () => {
    // Cleanup timers, listeners
}
```

## Performance Tips for AI Applications

1. **Lazy Initialize Heavy Operations**: Don't do expensive work in `loader()`
   ```javascript
   view.displayed = async () => {
       // Load AI model async after component renders
       const model = await loadAIModel();
   }
   ```

2. **Debounce Frequent Updates**: Prevent excessive re-renders
   ```javascript
   view.displayed = async () => {
       let timer;
       view.data.addListener('query', () => {
           clearTimeout(timer);
           timer = setTimeout(() => {
               callAI(view.data.query);
           }, 500);
       });
   }
   ```

3. **Reuse Component Instances**: Clone instead of creating new
   ```javascript
   const templateComponent = new ViewZ({ /* ... */ });
   const component2 = templateComponent.clone();
   ```

4. **Use Proper Cleanup**: Prevent memory leaks
   ```javascript
   view.displayed = async () => {
       this.timer = setInterval(() => { /* ... */ }, 1000);
   }
   
   view.destroyed = async () => {
       clearInterval(this.timer);
   }
   ```

## Integration with ViewZ and RouterZ

### Using Components in Views

```html
<!-- In a ViewZ view HTML -->
<div class="container">
    <z-header title="My Analysis"></z-header>
    <z-sensor-display id="sensor1"></z-sensor-display>
    <z-ai-response prompt="Analyze this"></z-ai-response>
    <z-footer></z-footer>
</div>
```

### Using Components in Routes

```javascript
// RouterZ with component-based views
router.addRoute({
    url: '/dashboard',
    view: dashboardView,  // Contains <z-chart>, <z-stat-card>, etc.
    routes: [
        {
            url: '/details/:id',
            view: detailsView  // Contains <z-details-panel>
        }
    ]
});
```

## Common Patterns

### Button Component

```javascript
// button.js
view.loader = async () => {
    return {
        label: view.route.params.label || 'Button',
        type: view.route.params.type || 'primary',  // primary|secondary|danger
        disabled: view.route.params.disabled === 'true'
    };
}

view.displayed = async () => {
    view.handleClick = () => {
        view.dispatchEvent('click', { type: view.data.type });
    }
}
```

### Badge Component

```javascript
// badge.js
view.loader = async () => {
    return {
        text: view.route.params.text || '',
        color: view.route.params.color || 'blue',
        size: view.route.params.size || 'medium'
    };
}
```

### Modal Component

```javascript
// modal.js
view.loader = async () => {
    return {
        title: view.route.params.title || 'Modal',
        isOpen: false
    };
}

view.displayed = async () => {
    view.open = () => {
        view.data.isOpen = true;
        view.dispatchEvent('open');
    }
    
    view.close = () => {
        view.data.isOpen = false;
        view.dispatchEvent('close');
    }
}
```

## Summary

ComponentZ provides:
- **Encapsulation**: Self-contained components with scoped CSS
- **Reusability**: Use components multiple times throughout your app
- **Web Standards**: Built on native Web Components
- **Easy Composition**: Build complex UIs from simple building blocks
- **Two-Way Communication**: Props in, events out
- **Dynamic Updates**: Respond to attribute and property changes
- **Content Projection**: Support for slots

Perfect for AI agents building: widget libraries, reusable UI patterns, modular dashboards, component-driven applications, and scalable UI architecture.

## Quick Reference

| Element | Purpose |
|---------|---------|
| `<z-component-name>` | Use custom component |
| `<z-slot></z-slot>` | Content placeholder in component |

| File | Purpose |
|------|---------|
| `component.html` | Template with BindZ directives |
| `component.css` | Scoped component styles |
| `component.js` | Logic and lifecycle hooks |

| Method | Purpose |
|--------|---------|
| `createComponent(dir, {name})` | Register component |
| `view.dispatchEvent(name, detail)` | Emit event to parent |
| `view.route.params` | Get component parameters |
| `element.value` | Get/set component value |
| `element.setAttribute()` | Update component attribute |

| Event Hook | When |
|-----------|------|
| `view.loader()` | Initialize component |
| `view.displayed()` | After rendering |
| `view.refreshed()` | After parameter update |
| `view.destroyed()` | Before removal |
