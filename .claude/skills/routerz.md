# RouterZ Skill: Client-Side Routing for AI Agents

## Overview

**RouterZ** is a client-side routing system that manages navigation between ViewZ components based on URL changes. It's particularly useful for AI agents that need to:
- Build multi-page or multi-view applications
- Handle complex navigation hierarchies
- Manage route parameters and query strings
- Display views in different modes (overlays, modals, sidebars)
- Maintain clean URLs while updating content dynamically
- Handle browser history (back/forward buttons)

RouterZ works seamlessly with ViewZ and BindZ to create full-featured single-page applications (SPAs).

## Core Concepts

### 1. Basic Routing Setup

**HTML file** (entry point):
```html
<!doctype html>
<head>
    <meta charset="utf-8">
    <title>My AI App</title>
</head>
<body>
    <div id="container"></div>
    <script type="module">
        import { ViewZ } from 'lib/viewz.mjs';
        import { RouterZ, constants } from 'lib/routerz.mjs';

        // Create views
        const view01 = new ViewZ({
            html: 'views/view-01/view-01.html',
            css: 'views/view-01/view-01.css',
            js: 'views/view-01/view-01.js',
            id: 'view-01'
        });

        const view02 = new ViewZ({
            html: 'views/view-02/view-02.html',
            css: 'views/view-02/view-02.css',
            js: 'views/view-02/view-02.js',
            id: 'view-02'
        });

        // Create router
        const router = new RouterZ({
            type: constants.HASH,  // Use hash routing (or BROWSER for history API)
            container: document.getElementById('container')
        });

        // Register routes
        router.addRoute({ url: '/', view: view01 });
        router.addRoute({ url: '/view-02', view: view02 });

        // Start routing
        router.start();
    </script>
</body>
</html>
```

**Router Types**:
- `constants.HASH` — URL like `#/path` (works offline, good for simple apps)
- `constants.BROWSER` — URL like `/path` (clean URLs, requires server setup)
- `constants.MEMORY` — No URL changes (useful for testing/embedded views)

### 2. Navigation with Links

Routes are navigated using standard HTML links:

```html
<nav>
    <a href="/">Home</a>
    <a href="/view-02">View 02</a>
    <a href="/analysis/results">Analysis Results</a>
</nav>
```

**Important**: RouterZ automatically intercepts links starting with `/` and uses client-side routing instead of page reload.

### 3. Hierarchical Routes (Nested Views)

Create multi-level navigation by nesting routes:

```javascript
const container = document.getElementById('container');

const router = new RouterZ({
    type: constants.HASH,
    container: container
});

// Define hierarchical routes
router.addRoute({
    url: '/',
    view: mainView,
    routes: [
        {
            url: '/dashboard',
            view: dashboardView,
            defaultChild: true  // Show this by default when parent loads
        },
        {
            url: '/analysis',
            view: analysisView
        },
        {
            url: '/settings',
            view: settingsView
        }
    ]
});

router.start();
```

**Parent View** (`mainView.html`):
```html
<div class="layout">
    <header>
        <nav>
            <a href="/dashboard">Dashboard</a>
            <a href="/analysis">Analysis</a>
            <a href="/settings">Settings</a>
        </nav>
    </header>
    
    <!-- Child view renders here -->
    <z-sub-view></z-sub-view>
</div>
```

**How it works**:
- When user navigates to `/analysis`, the parent view (`mainView`) stays visible
- The `<z-sub-view>` element is replaced with the `analysisView`
- This allows persistent navigation UI with changing content

### 4. Route Parameters

**Required Parameters**:
```javascript
router.addRoute({
    url: '/ai-analysis/:analysisId',
    view: analysisDetailView
});
```

**Optional Parameters**:
```javascript
router.addRoute({
    url: '/report{/:format}',  // format is optional
    view: reportView
});
```

**Accessing Parameters in Views**:

```javascript
view.loader = async () => {
    console.log('Route info:', view.route);
    // view.route.params = { analysisId: 'abc123' }
    // view.route.queries = { filter: 'recent' }
    // view.route.url = '/ai-analysis/abc123'
    
    const analysisId = view.route.params.analysisId;
    const aiData = await fetchAIAnalysis(analysisId);
    
    return {
        analysisId,
        data: aiData
    };
}
```

**Updating Parameters**:
```javascript
// In a view's JavaScript
view.updateParam = (newId) => {
    view.route.setParams({ analysisId: newId });
}
```

### 5. Query Strings

Query parameters are automatically parsed and accessible:

```html
<a href="/search?query=machine%20learning&limit=10">Search</a>
```

```javascript
view.loader = async () => {
    const query = view.route.queries.query;  // 'machine learning'
    const limit = view.route.queries.limit;  // '10'
    
    const results = await searchAI(query, limit);
    return { results };
}
```

### 6. Stacker Modes (Alternative Display Modes)

Stackers allow views to be displayed in different ways: overlays, modals, sidebars, fullscreen, etc.

**Setup**:
```javascript
import { 
    stackerLeft, stackerRight, stackerDialog, 
    stackerFullscreen, stackerInplace,
    stackerSideLeft, stackerSideRight,
    stackerSideTop, stackerSideBottom
} from 'lib/stackerz.mjs';

// Register stackers
RouterZ.loadStacker(stackerLeft);
RouterZ.loadStacker(stackerRight);
RouterZ.loadStacker(stackerDialog);
RouterZ.loadStacker(stackerFullscreen);
```

**Syntax** (in URLs and links):
```html
<!-- Stacker prefixes in URL -->
<a href="/*)*/analysis">Open analysis as left overlay</a>
<a href="/*(*/analysis">Open analysis as right overlay</a>
<a href="/*()/analysis">Open analysis as dialog</a>
<a href="/*F*/analysis">Open analysis fullscreen</a>
<a href="/*i*/analysis">Open analysis inline</a>
<a href="/*-I*/analysis">Open analysis as left sidebar</a>
<a href="/*I-*/analysis">Open analysis as right sidebar</a>
<a href="/*T*/analysis">Open analysis as top sidebar</a>
<a href="/*L*/analysis">Open analysis as bottom sidebar</a>
```

**Stacker Options**:
```html
<a href="/*)*/analysis?x=close&w=400&h=600&bg=white&t=0.3">
    <!-- 
        x = show close button
        w = width (pixels)
        h = height (pixels)
        bg = background color
        t = transition duration (seconds)
        r = resizeable (for sidebars)
    -->
</a>
```

**Multiple Stackers**:
```html
<!-- Open two overlays: analysis on left, results on right -->
<a href="/*)*/analysis/*(*/results">
    Open Analysis and Results
</a>
```

### 7. Route Titles and Metadata

```javascript
router.addRoute({
    url: '/',
    view: mainView,
    title: 'Home',
    routes: [
        {
            url: '/analysis/:id',
            view: analysisView,
            title: 'Analysis Details'
        }
    ]
});

// Browser tab title updates automatically
```

## Advanced Patterns for AI Agents

### Pattern 1: AI Analysis Workflow with Multi-Step Routes

```javascript
const router = new RouterZ({
    type: constants.HASH,
    container: document.getElementById('container'),
    mainTitle: 'AI Analysis Platform'
});

router.addRoute({
    url: '/',
    view: layoutView,
    routes: [
        {
            url: '/input',
            view: inputView,
            title: 'Input Data',
            defaultChild: true
        },
        {
            url: '/processing',
            view: processingView,
            title: 'Processing'
        },
        {
            url: '/results/:analysisId',
            view: resultsView,
            title: 'Results'
        },
        {
            url: '/export{/:format}',
            view: exportView,
            title: 'Export'
        }
    ]
});

router.start();
```

**Input View** (`input-view.js`):
```javascript
view.loader = async () => {
    return {
        dataInput: '',
        analysisType: 'classification'
    };
}

view.displayed = async () => {
    view.submitAnalysis = async () => {
        if (!view.data.dataInput) {
            alert('Please enter data');
            return;
        }
        
        // Navigate to processing step
        view.router.navigateTo('/processing');
    }
}
```

**Processing View** (`processing-view.js`):
```javascript
view.loader = async () => {
    return {
        progress: 0,
        status: 'Starting...'
    };
}

view.displayed = async () => {
    // Simulate AI analysis
    for (let i = 0; i <= 100; i += 10) {
        view.data.progress = i;
        view.data.status = `Processing... ${i}%`;
        await new Promise(r => setTimeout(r, 500));
    }
    
    // Navigate to results with analysis ID
    view.router.navigateTo('/results/analysis-12345');
}
```

### Pattern 2: Detail View with Modal Dialog

```javascript
// List view with items
view.loader = async () => {
    const items = await fetchAIResults();
    return { items };
}

view.displayed = async () => {
    view.openDetails = (itemId) => {
        // Open detail view in a modal dialog stacker
        view.router.navigateTo(`/*()/item/${itemId}`);
    }
}
```

HTML:
```html
<ul>
    <li z-bind="item of items">
        ${item.title}
        <button z-on-click="view.openDetails('${item.id}')">
            View Details
        </button>
    </li>
</ul>
```

### Pattern 3: Sidebar Navigation with Content View

```javascript
const router = new RouterZ({
    type: constants.HASH,
    container: document.getElementById('container')
});

router.addRoute({
    url: '/',
    view: layoutView,  // Sidebar on left, content on right
    routes: [
        {
            url: '/dashboard',
            view: dashboardView,
            defaultChild: true
        },
        {
            url: '/*-I*/sidebar/:section',
            view: sidebarView  // Sidebar as left panel
        }
    ]
});
```

### Pattern 4: Persistent Chat Interface with Stacked Views

```javascript
// Chat view stays at root level
const router = new RouterZ({
    type: constants.HASH,
    container: document.getElementById('container')
});

router.addRoute({
    url: '/',
    view: chatView,  // Main chat interface
    routes: [
        {
            url: '/*)*/context/:contextId',
            view: contextView,  // Show context in left overlay
            defaultChild: true
        },
        {
            url: '/*(*/tools/:toolId',
            view: toolView  // Show tool in right overlay
        }
    ]
});
```

### Pattern 5: Dynamic Routing Based on AI Classification

```javascript
view.loader = async () => {
    const userInput = getInputFromStorage();
    
    // Classify input with AI
    const classification = await classifyWithAI(userInput);
    
    return { classification };
}

view.displayed = async () => {
    // Route to appropriate view based on AI classification
    const routes = {
        'question': '/qa',
        'command': '/command',
        'analysis': '/analysis',
        'search': '/search'
    };
    
    const route = routes[view.data.classification] || '/default';
    
    // Navigate to the appropriate route
    setTimeout(() => {
        view.router.navigateTo(route);
    }, 100);
}
```

## Router API

### Methods

```javascript
// Navigate to a URL
router.navigateTo('/analysis/123');

// Navigate with parameters (programmatically)
router.navigateTo('/report', { 
    format: 'json',
    verbose: true 
});

// Get current location information
const location = router.getCurrentLocation();
// { pathname: '/analysis/123', search: '?filter=active', hash: '' }

// Block navigation with confirmation
router.block('You have unsaved changes. Leave anyway?');

// Unblock navigation
router.unblock();

// Stop routing
router.stop();

// Start routing
router.start();

// Cache all views for faster loading
await router.cacheAllViews();
```

### Events

```javascript
// Listen for view changes
document.addEventListener('viewOpen', (event) => {
    console.log('View opened:', event.detail.view.id);
    console.log('Route info:', event.detail.route);
});

// Listen for router creation
document.addEventListener('routerz-created', (event) => {
    const router = event.detail;
    console.log('Router ready');
});
```

## View Route Information

In any view, `view.route` contains:

```javascript
view.route = {
    url: '/analysis/123?filter=active',
    path: '/analysis/123',
    params: { id: '123' },
    queries: { filter: 'active' },
    hash: '',
    
    // Update parameters in URL
    setParams: (newParams) => { /* ... */ }
}
```

## Performance Tips for AI Applications

1. **Lazy Load Views**: Don't create all views upfront
   ```javascript
   let resultsView = null;
   
   router.addRoute({
       url: '/results',
       view: async () => {
           if (!resultsView) {
               resultsView = new ViewZ({ /* ... */ });
           }
           return resultsView;
       }
   });
   ```

2. **Cache Popular Routes**: Pre-load frequently used views
   ```javascript
   router.cacheAllViews(); // Before router.start()
   ```

3. **Minimize Route Hierarchy**: Keep nesting to 2-3 levels
   ```javascript
   // Good: 2 levels
   / → /analysis → /analysis/123

   // Avoid: 5+ levels
   / → /ai → /models → /analysis → /results → /export
   ```

4. **Use Stackers for Temporary Views**: Don't nest temporary content in URL hierarchy
   ```javascript
   // Bad: Temporary dialog in hierarchy
   /results → /*()/details/123

   // Good: Use stacker without hierarchy change
   /results → /*()/123  (temporary overlay)
   ```

## Common Patterns

### Form with Validation and Next Step

```javascript
view.submitForm = async () => {
    if (!validateInput(view.data)) {
        view.data.error = 'Please fill all fields';
        return;
    }
    
    const result = await processWithAI(view.data);
    
    // Navigate to next step with result ID
    view.router.navigateTo(`/step-2/${result.id}`);
}
```

### Breadcrumb Navigation

```javascript
// In parent view
view.loader = async () => {
    return {
        breadcrumbs: [
            { label: 'Home', url: '/' },
            { label: 'Analysis', url: '/analysis' }
        ]
    };
}
```

### Back Button Functionality

```javascript
view.goBack = () => {
    window.history.back();
}
```

### Redirect Based on Condition

```javascript
view.loader = async () => {
    const isLoggedIn = checkAuthentication();
    
    if (!isLoggedIn) {
        // Redirect to login
        setTimeout(() => {
            view.router.navigateTo('/login');
        }, 0);
        
        return { loading: true };
    }
    
    return { data: await fetchProtectedData() };
}
```

## Integration Notes

### With ViewZ Lifecycle

Routes automatically manage ViewZ lifecycle:
- When a route matches, its view's `loader()` is called
- After rendering, `displayed()` is called
- When navigating away, `destroyed()` is called
- Returning to a cached view calls `refreshed()`

### With BindZ

All route information (`view.route`) is accessible to BindZ expressions:

```html
<h1>Analysis: ${view.route.params.id}</h1>

<div z-show-if="view.route.queries.debug === 'true'">
    Debug mode enabled
</div>
```

### With Extensions

Router adds an extension to ViewZ:

```javascript
view.router  // Access router from any view
```

## URL Encoding

- Path parameters are URL-encoded automatically
- Query parameters must be manually encoded if they contain special characters

```javascript
const query = 'machine learning'; // contains space
const encoded = encodeURIComponent(query); // 'machine%20learning'
view.router.navigateTo(`/search?q=${encoded}`);
```

## Browser Compatibility

- **HASH mode**: Works in all browsers (IE6+)
- **BROWSER mode**: Requires Fetch API and History API (IE10+)
- **MEMORY mode**: Works everywhere (no URL in browser)

## Summary

RouterZ provides:
- **Flexible routing**: Simple to complex hierarchical routes
- **Deep linking**: URLs represent app state, shareable with others
- **Multiple display modes**: Overlays, modals, sidebars via stackers
- **Parameter passing**: Route and query parameters
- **Browser history**: Back/forward button support
- **Performance**: View caching and lazy loading

Perfect for AI agents building: multi-step workflows, analysis dashboards, content management systems, search/filter interfaces, wizard-like experiences, and any complex navigation structure.

## Quick Reference

| Concept | Syntax |
|---------|--------|
| Simple route | `/path` |
| Route param | `/:id` |
| Optional param | `{/:format}` |
| Nested route | Root `routes: []` array |
| Default route | `defaultChild: true` |
| Left overlay | `/*)*/view` |
| Right overlay | `/*(*/view` |
| Dialog | `/*()/view` |
| Fullscreen | `/*F*/view` |
| Left sidebar | `/*-I*/view` |
| Right sidebar | `/*I-*/view` |

| API | Purpose |
|-----|---------|
| `router.navigateTo(url)` | Navigate programmatically |
| `router.getCurrentLocation()` | Get current URL info |
| `router.block(msg)` | Prevent navigation |
| `router.cacheAllViews()` | Pre-load views |
| `view.route.params` | Get route parameters |
| `view.route.queries` | Get query string |
