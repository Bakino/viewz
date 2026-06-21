# ViewZ Skill: Component-Based Views for AI Agents

## Overview

**ViewZ** is a component-based view system that builds on top of BindZ to create reusable, lifecycle-aware UI components. It's particularly useful for AI agents that need to:
- Create modular, encapsulated UI components
- Manage component state and data loading
- Handle component lifecycle (initialization, refresh, cleanup)
- Combine multiple components into complex applications
- Extend functionality through plugins

ViewZ treats UI as a three-file component (HTML, CSS, JavaScript), making it easy for AI systems to generate and manage self-contained views.

## Core Concepts

### 1. Basic View Structure

A ViewZ component consists of three files:

**HTML file** (`simple-view.html`):
```html
<h1 z-bind="title"></h1>
<p z-bind="description"></p>
<button z-on-click="view.showAlert()">Click me!</button>
```

**CSS file** (`simple-view.css`):
```css
/* CSS is scoped to this view only */
h1 {
    color: blue;
}
```

**JavaScript file** (`simple-view.js`):
```javascript
/* globals view */

// Define how to load data for this view
view.loader = async () => {
    return {
        title: 'Hello, World!',
        description: 'This is a simple example'
    };
}

// Define event handlers for this view
view.showAlert = () => {
    alert('Button clicked!');
}
```

**Host file** (HTML page that uses the view):
```html
<!doctype html>
<head>
    <meta charset="utf-8">
    <title>My App</title>
</head>
<body>
    <div id="container"></div>
    <script type="module">
        import { ViewZ } from 'lib/viewz.mjs';

        const view = new ViewZ({
            html: 'simple-view.html',
            css: 'simple-view.css',
            js: 'simple-view.js',
            id: 'simple-view'
        });

        view.render({ container: document.getElementById('container') });
    </script>
</body>
</html>
```

**Key Benefits**:
- **Encapsulation**: Each component has scoped CSS and isolated JavaScript
- **Separation of Concerns**: HTML, styles, and logic are in separate files
- **Reusability**: The same view can be instantiated multiple times
- **Composability**: Views can be nested within other views

### 2. View Lifecycle

ViewZ provides four lifecycle hooks for managing component state:

```javascript
// Called when the view first loads—prepare initial data
view.loader = async () => {
    console.log("LOADER: Fetch data, initialize state");
    return {
        title: 'Hello',
        items: await fetchDataFromAI()
    };
}

// Called once after data is loaded and DOM is ready
view.displayed = async () => {
    console.log("DISPLAYED: Set up listeners, start timers");
    
    // Safe place to add data listeners
    view.data.addListener("items", () => {
        console.log("Items changed!");
    });
    
    // Start intervals/timers
    view.updateTimer = setInterval(() => {
        view.data.time = new Date().toLocaleTimeString();
    }, 1000);
}

// Called after view.refresh() completes
view.refreshed = async () => {
    console.log("REFRESHED: Handle post-refresh tasks");
    // Note: Don't add listeners here—view.data is reused, so add them in displayed()
}

// Called when the view is destroyed
view.destroyed = async () => {
    console.log("DESTROYED: Clean up resources");
    clearInterval(view.updateTimer);
}
```

**Lifecycle Flow**:
1. `loader()` — Load/initialize data
2. View renders with BindZ
3. `displayed()` — Set up listeners, timers, side effects
4. (optional) `refresh()` called → `loader()` + `refreshed()`
5. `destroyed()` — Cleanup

**AI Agent Use Case**: Use `loader` to fetch AI analysis, `displayed` to set up polling for real-time updates, and `destroyed` for cleanup.

### 3. Data Access and Updates

```javascript
view.loader = async () => {
    return {
        query: '',
        results: [],
        isLoading: false
    };
}

view.displayed = async () => {
    // Access reactive data through view.data
    console.log(view.data.query); // 'initial query'
    
    // Update data—UI automatically updates
    view.data.results.push({ text: 'Result 1' });
    
    // Listen to changes
    view.data.addListener('query', (newValue) => {
        console.log('Query changed to:', newValue);
    });
    
    // Listen to nested changes (with wildcard)
    view.data.addListener('results.*', () => {
        console.log('A result changed');
    });
}

// In HTML, use BindZ directives
// <input z-bind="query" />
// <ul>
//   <li z-bind="result of results">${result.text}</li>
// </ul>
```

### 4. Methods Available on View

```javascript
// Refresh the view data
view.refresh();

// Clone the current view
const clonedView = view.clone();

// Manually set a waiter message
view.waiterMessage = "Processing AI response...";

// Access the DOM container
const container = view.domElement;

// Access view configuration
const viewId = view.viewId;
```

### 5. Event Handling in Views

```html
<!-- Simple function call -->
<button z-on-click="view.handleClick()">Simple</button>

<!-- With event and element context -->
<button z-on-click="view.handleClick(event, this)">With Context</button>

<!-- Prevent double-clicks -->
<button z-on-click="view.handleDoubleClick()" z-prevent-double-click>
  No Double Click
</button>

<!-- Multiple event types -->
<input z-on-input="view.handleInput(event)" z-on-change="view.handleChange()" />
```

```javascript
view.handleClick = (event, element) => {
    if (event) {
        console.log('Event type:', event.type);
        console.log('Element clicked:', element.textContent);
    }
}

view.handleInput = (event) => {
    const inputValue = event.target.value;
    console.log('Input:', inputValue);
}

view.handleChange = () => {
    // Process the change
}
```

## Advanced Patterns for AI Agents

### Pattern 1: AI-Driven Data Refresh

```javascript
view.loader = async () => {
    const aiResponse = await callAIAPI({
        prompt: 'Analyze this data...'
    });
    
    return {
        analysis: aiResponse.analysis,
        confidence: aiResponse.confidence,
        timestamp: new Date().toLocaleTimeString()
    };
}

view.displayed = async () => {
    // User can trigger a refresh to get new analysis
    view.refreshData = async () => {
        view.waiterMessage = "Re-analyzing...";
        await view.refresh();
    }
}
```

HTML:
```html
<div>
    <h2>Analysis: ${analysis}</h2>
    <p>Confidence: ${confidence}%</p>
    <button z-on-click="view.refreshData()">Re-analyze</button>
    <p>Updated: ${timestamp}</p>
</div>
```

### Pattern 2: Multi-Step AI Workflow with Views

```javascript
// Parent view orchestrates multiple views
view.loader = async () => {
    return {
        currentStep: 'input',
        userInput: '',
        aiAnalysis: null,
        results: []
    };
}

view.displayed = async () => {
    view.data.addListener('currentStep', (newStep) => {
        if (newStep === 'processing') {
            performAIAnalysis();
        }
    });
}

view.handleSubmit = async () => {
    view.data.currentStep = 'processing';
    try {
        const analysis = await analyzeWithAI(view.data.userInput);
        view.data.aiAnalysis = analysis;
        view.data.results = analysis.results;
        view.data.currentStep = 'results';
    } catch (error) {
        view.data.currentStep = 'error';
    }
}
```

HTML:
```html
<section z-show-if="currentStep === 'input'">
    <input z-bind="userInput" type="text" />
    <button z-on-click="view.handleSubmit()">Analyze</button>
</section>

<section z-show-if="currentStep === 'processing'">
    <p>AI is analyzing your input...</p>
    <div class="spinner"></div>
</section>

<section z-show-if="currentStep === 'results'">
    <h2>Results</h2>
    <ul>
        <li z-bind="result of results">
            ${result}
        </li>
    </ul>
</section>

<section z-show-if="currentStep === 'error'">
    <p style="color: red;">An error occurred. Please try again.</p>
</section>
```

### Pattern 3: Real-Time Streaming AI Response

```javascript
view.loader = async () => {
    return {
        prompt: 'Generate a story...',
        response: '',
        isStreaming: false
    };
}

view.displayed = async () => {
    view.streamAI = async () => {
        view.data.isStreaming = true;
        view.data.response = '';
        
        try {
            const stream = await fetch('/api/ai-stream', {
                method: 'POST',
                body: JSON.stringify({ prompt: view.data.prompt })
            });
            
            const reader = stream.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                view.data.response += chunk; // Reactive—updates in real-time
            }
        } finally {
            view.data.isStreaming = false;
        }
    }
}
```

HTML:
```html
<textarea z-bind="prompt" rows="4"></textarea>
<button z-on-click="view.streamAI()" z-hide-if="isStreaming">
    Generate
</button>

<div z-show-if="isStreaming">
    <p>Generating...</p>
    <div class="spinner"></div>
</div>

<section z-show-if="response">
    <h3>Response:</h3>
    <p>${response}</p>
</section>
```

### Pattern 4: View Extensions for Shared Functionality

Create reusable plugins for common AI patterns:

```javascript
// ai-extension.js
const aiExtension = {
    plugin: "ai-extension",
    
    globals: {
        // Available in all views
        callAI: async function(prompt) {
            const response = await fetch('/api/ai', {
                method: 'POST',
                body: JSON.stringify({ prompt })
            });
            return response.json();
        },
        
        formatDate: function(date) {
            return new Date(date).toLocaleString();
        }
    },
    
    extends: {
        // Available as view.trackAICall(), view.aiStats, etc.
        aiStats: { calls: 0, tokens: 0 },
        
        trackAICall(tokens) {
            this.aiStats.calls++;
            this.aiStats.tokens += tokens;
        },
        
        destroy() {
            console.log(`View made ${this.aiStats.calls} AI calls`);
        }
    }
};

ViewZ.loadExtension(aiExtension);
```

Then in any view:

```javascript
view.loader = async () => {
    const response = await callAI("What is 2+2?");
    view.trackAICall(response.tokens);
    
    return {
        question: "What is 2+2?",
        answer: response.text
    };
}
```

## CSS Scoping

ViewZ automatically scopes CSS to prevent style conflicts:

```css
/* This CSS only applies inside this specific view */
h1 { color: blue; }
button { padding: 10px; }
```

**Benefits**:
- No global namespace pollution
- Safe to use generic selectors (`.heading`, `.button`)
- Styles don't leak between components

## Accessing External Data and APIs

```javascript
view.loader = async () => {
    try {
        // Fetch from AI API
        const aiData = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'user input' })
        }).then(r => r.json());
        
        // Fetch from database
        const dbData = await fetch('/api/database/records').then(r => r.json());
        
        return {
            aiResult: aiData.result,
            dbRecords: dbData.records,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Failed to load data:', error);
        return {
            aiResult: null,
            dbRecords: [],
            error: error.message
        };
    }
}
```

## View Context and Dependency Injection

Pass context when creating a view:

```javascript
const appContext = {
    apiBaseUrl: 'https://api.example.com',
    userId: 'user123',
    token: 'auth-token'
};

const view = new ViewZ({
    html: 'view.html',
    css: 'view.css',
    js: 'view.js',
    id: 'my-view',
    context: appContext
});

// Access in the view's JavaScript:
view.loader = async () => {
    const response = await fetch(`${view.context.apiBaseUrl}/data`, {
        headers: {
            'Authorization': `Bearer ${view.context.token}`
        }
    });
    return response.json();
}
```

## Performance Tips for AI Applications

1. **Lazy Load Data**: Only fetch data when needed
   ```javascript
   view.loader = async () => {
       // Return minimal data first
       return { loadingState: 'ready' };
   }
   
   view.displayed = async () => {
       // Fetch heavy data after display
       const heavyData = await loadAIAnalysis();
       view.data.analysis = heavyData;
   }
   ```

2. **Debounce AI Calls**: Prevent rapid successive API calls
   ```javascript
   view.displayed = async () => {
       let debounceTimer;
       view.data.addListener('query', () => {
           clearTimeout(debounceTimer);
           debounceTimer = setTimeout(async () => {
               const result = await callAI(view.data.query);
               view.data.result = result;
           }, 500);
       });
   }
   ```

3. **Streaming Responses**: Update UI as data arrives
   ```javascript
   // Use streaming API instead of waiting for full response
   view.streamData = async () => {
       const response = await fetch('/api/stream');
       for await (const chunk of response.body) {
           view.data.content += decodeChunk(chunk);
       }
   }
   ```

4. **Unsubscribe from Listeners**: Prevent memory leaks
   ```javascript
   view.displayed = async () => {
       const listener = () => { /* ... */ };
       view.data.addListener('items', listener);
       
       // Cleanup in destroyed()
   }
   
   view.destroyed = async () => {
       view.data.removeListener('items', listener);
   }
   ```

## Common Patterns

### Form with AI Validation

```javascript
view.loader = async () => {
    return {
        email: '',
        validationError: '',
        isValidating: false
    };
}

view.validateEmail = async (email) => {
    view.data.isValidating = true;
    view.data.validationError = '';
    try {
        const result = await callAI(`Is this a valid email? ${email}`);
        if (!result.isValid) {
            view.data.validationError = result.reason;
        }
    } catch (error) {
        view.data.validationError = 'Validation failed';
    } finally {
        view.data.isValidating = false;
    }
}
```

### Progress Tracking

```javascript
view.loader = async () => {
    return {
        progress: 0,
        status: 'Initializing...',
        isRunning: false
    };
}

view.runProcess = async () => {
    view.data.isRunning = true;
    const steps = 10;
    for (let i = 0; i < steps; i++) {
        view.data.progress = (i / steps) * 100;
        view.data.status = `Processing step ${i + 1}/${steps}...`;
        await performStep(i);
    }
    view.data.status = 'Complete!';
    view.data.isRunning = false;
}
```

## Integration with RouterZ

ViewZ works with RouterZ for building multi-page AI applications (see RouterZ skill).

## Summary

ViewZ provides:
- **Encapsulation**: Self-contained components with scoped CSS
- **Lifecycle Management**: Clear hooks for initialization, update, and cleanup
- **Reactive Data**: Automatic UI updates via BindZ
- **Composability**: Build complex UIs from simple components
- **Extensibility**: Share functionality across views via plugins

Perfect for AI agents building: dashboards, analysis tools, chat interfaces, data exploration apps, form-driven workflows, and any dynamic UI driven by AI-generated content.

## Quick Reference

| Lifecycle | Purpose |
|-----------|---------|
| `loader()` | Fetch initial data, setup |
| `displayed()` | Post-render setup, listeners, timers |
| `refreshed()` | After data refresh completes |
| `destroyed()` | Cleanup before removal |

| Method | Purpose |
|--------|---------|
| `view.render({container})` | Render view into DOM |
| `view.refresh()` | Re-run loader and display |
| `view.clone()` | Create a copy of the view |
| `view.data.addListener(path, fn)` | Listen to data changes |
| `view.data.removeListener(path, fn)` | Stop listening |
