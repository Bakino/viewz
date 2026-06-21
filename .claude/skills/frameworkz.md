# FrameworkZ Skill: Complete Configuration-Driven UI Framework for AI Agents

## Overview

**FrameworkZ** is the complete ViewZ framework that combines BindZ, ViewZ, RouterZ, and ComponentZ into a unified, configuration-driven system. Instead of writing boilerplate initialization code, you define your entire application structure in a JSON configuration file.

Perfect for AI agents building complex applications because:
- **Zero boilerplate**: One function call (`startViewZ()`) initializes everything
- **Declarative**: Define routes, views, and extensions in JSON
- **Convention over configuration**: Predictable file structure
- **Scalable**: Easily add views, routes, and extensions
- **Single entry point**: One clean HTML file for your entire SPA

## Quick Start

### 1. Create Configuration File (`viewz.config.json`)

```json
{
  "routing": "HASH",
  "viewsPath": "views",
  "routes": [
    {
      "url": "/",
      "path": "root",
      "subRoutes": [
        {
          "url": "/dashboard",
          "path": "dashboard",
          "defaultChild": true
        },
        {
          "url": "/analysis/:id",
          "path": "analysis"
        }
      ]
    }
  ]
}
```

### 2. Create Entry Point HTML (`index.html`)

```html
<!doctype html>
<head>
    <meta charset="utf-8">
    <title>My AI App</title>
</head>
<body>
    <script type="module">
        import { startViewZ } from 'lib/frameworkz.mjs';
        startViewZ('viewz.config.json');
    </script>
</body>
</html>
```

### 3. Create View Files

```
views/
  root/
    root.html
    root.css
    root.js
  dashboard/
    dashboard.html
    dashboard.css
    dashboard.js
  analysis/
    analysis.html
    analysis.css
    analysis.js
```

**That's it!** Your entire routing and component structure is now initialized.

## Configuration Reference

### Basic Structure

```json
{
  "routing": "HASH|BROWSER|MEMORY",
  "container": "#app|HTMLElement|undefined",
  "viewsPath": "views",
  "componentsPath": "components",
  "cacheAllViews": true|false|undefined,
  "cacheAllViewsSyncLimit": 5,
  "routes": [],
  "extensions": [],
  "components": []
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `routing` | string | `BROWSER` | URL routing mode: `HASH`, `BROWSER`, or `MEMORY` |
| `container` | string/element | `#viewz-container` or `<body>` | DOM container for the app |
| `viewsPath` | string | `views` | Directory path where views are stored |
| `componentsPath` | string | `components` | Directory path where components are stored |
| `cacheAllViews` | boolean | `true` | Pre-load all views on startup |
| `cacheAllViewsSyncLimit` | number | `5` | Max concurrent view loads during caching |
| `routes` | array | `[]` | Route definitions |
| `extensions` | array | `[]` | Extension definitions |
| `components` | array | `[]` | Component definitions |

## Routing Configuration

### Simple Routes

```json
{
  "routes": [
    {
      "url": "/",
      "path": "home"
    },
    {
      "url": "/about",
      "path": "about"
    },
    {
      "url": "/contact",
      "path": "contact"
    }
  ]
}
```

**File structure**:
```
views/
  home/
    home.html
    home.css
    home.js
  about/
    about.html
    about.css
    about.js
  contact/
    contact.html
    contact.css
    contact.js
```

### Nested Routes (Hierarchical)

```json
{
  "routes": [
    {
      "url": "/",
      "path": "layout",
      "subRoutes": [
        {
          "url": "/dashboard",
          "path": "dashboard",
          "defaultChild": true
        },
        {
          "url": "/users",
          "path": "users"
        },
        {
          "url": "/users/:id",
          "path": "user-detail"
        }
      ]
    }
  ]
}
```

**File structure**:
```
views/
  layout/
    layout.html (contains <z-sub-view>)
    layout.css
    layout.js
  dashboard/
    dashboard.html
    dashboard.css
    dashboard.js
  users/
    users.html
    users.css
    users.js
  user-detail/
    user-detail.html
    user-detail.css
    user-detail.js
```

### Route Parameters and Defaults

```json
{
  "routes": [
    {
      "url": "/search{/:category}",
      "path": "search"
    },
    {
      "url": "/report/:year/:month",
      "path": "report"
    }
  ]
}
```

## Extensions Configuration

### Load External Extensions

```json
{
  "extensions": [
    { "url": "extensions/auth.js" },
    { "url": "extensions/storage.js" },
    { "url": "https://cdn.example.com/tracking.js" }
  ]
}
```

**Extension file** (`extensions/auth.js`):
```javascript
export default {
    globals: {
        getCurrentUser: () => {
            return JSON.parse(localStorage.getItem('user'));
        },
        logout: () => {
            localStorage.removeItem('user');
        }
    },
    
    extends: {
        userRouter: new UserAuthenticator(),
        
        requireAuth: async function() {
            if (!this.userRouter.isLoggedIn()) {
                this.router.navigateTo('/login');
            }
        }
    },
    
    errorHandler: (error) => {
        console.error('Global error:', error);
    }
}
```

**Access in views**:
```javascript
view.loader = async () => {
    const user = getCurrentUser();  // From extension globals
    if (!user) {
        throw new Error('Not authenticated');
    }
    return { user };
}

view.displayed = async () => {
    // Access extended view methods
    await view.requireAuth();
}
```

### Inline Extensions

```json
{
  "extensions": [
    {
        "globals": {
            "formatDate": (date) => new Date(date).toLocaleDateString(),
            "formatCurrency": (amount) => `$${amount.toFixed(2)}`
        },
        "extends": {
            "appVersion": "1.0.0"
        }
    }
  ]
}
```

## Components Configuration

### Register Components

```json
{
  "componentsPath": "components",
  "components": [
    { "name": "header" },
    { "name": "sidebar" },
    { "name": "chart" },
    { "name": "data-table" }
  ]
}
```

**File structure**:
```
components/
  header/
    header.html
    header.css
    header.js
  sidebar/
    sidebar.html
    sidebar.css
    sidebar.js
  chart/
    chart.html
    chart.css
    chart.js
  data-table/
    data-table.html
    data-table.css
    data-table.js
```

**Use in views**:
```html
<z-header title="My App"></z-header>
<z-sidebar>
    <a href="/dashboard">Dashboard</a>
    <a href="/analysis">Analysis</a>
</z-sidebar>

<div class="content">
    <z-chart type="bar" data="myData"></z-chart>
    <z-data-table source="api/results"></z-data-table>
</div>
```

## Complete Application Example

### Configuration (`viewz.config.json`)

```json
{
  "routing": "HASH",
  "viewsPath": "views",
  "componentsPath": "components",
  "cacheAllViews": true,
  "container": "#app",
  
  "routes": [
    {
      "url": "/",
      "path": "layout",
      "subRoutes": [
        {
          "url": "/dashboard",
          "path": "dashboard",
          "defaultChild": true
        },
        {
          "url": "/analysis",
          "path": "analysis"
        },
        {
          "url": "/analysis/:id",
          "path": "analysis-detail"
        },
        {
          "url": "/settings",
          "path": "settings"
        }
      ]
    }
  ],
  
  "extensions": [
    { "url": "extensions/ai-api.js" },
    { "url": "extensions/local-storage.js" }
  ],
  
  "components": [
    { "name": "header" },
    { "name": "nav" },
    { "name": "chart" },
    { "name": "spinner" }
  ]
}
```

### HTML Entry Point (`index.html`)

```html
<!doctype html>
<head>
    <meta charset="utf-8">
    <title>AI Analysis Platform</title>
</head>
<body>
    <div id="app"></div>
    
    <script type="module">
        import { startViewZ } from './lib/frameworkz.mjs';
        
        // Load and start the application
        await startViewZ('viewz.config.json');
    </script>
</body>
</html>
```

### Layout View (`views/layout/layout.html`)

```html
<header>
    <z-header title="AI Analysis"></z-header>
</header>

<nav>
    <z-nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/analysis">Analysis</a>
        <a href="/settings">Settings</a>
    </z-nav>
</nav>

<main>
    <z-sub-view></z-sub-view>
</main>

<footer>
    <p>&copy; 2026 AI Platform</p>
</footer>
```

### Dashboard View (`views/dashboard/dashboard.js`)

```javascript
view.loader = async () => {
    const stats = await fetchAIStats();
    const recentAnalyses = await fetchRecentAnalyses();
    
    return {
        stats,
        recentAnalyses,
        isLoading: false
    };
}

view.displayed = async () => {
    view.viewAnalysis = (analysisId) => {
        view.router.navigateTo(`/analysis/${analysisId}`);
    }
}
```

### Analysis View (`views/analysis/analysis.js`)

```javascript
view.loader = async () => {
    const analysisId = view.route.params.id;
    
    let analysis = null;
    if (analysisId) {
        analysis = await fetchAnalysis(analysisId);
    }
    
    return {
        analysisId,
        analysis,
        results: analysis?.results || [],
        isLoading: false
    };
}

view.displayed = async () => {
    view.runAnalysis = async () => {
        view.data.isLoading = true;
        try {
            const results = await callAI(view.data.inputData);
            view.data.results = results;
        } catch (error) {
            view.data.error = error.message;
        } finally {
            view.data.isLoading = false;
        }
    }
}
```

### AI API Extension (`extensions/ai-api.js`)

```javascript
export default {
    globals: {
        callAI: async (prompt, options = {}) => {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, ...options })
            });
            return response.json();
        },
        
        fetchAIStats: async () => {
            return fetch('/api/ai/stats').then(r => r.json());
        },
        
        fetchAnalysis: async (id) => {
            return fetch(`/api/analysis/${id}`).then(r => r.json());
        },
        
        fetchRecentAnalyses: async () => {
            return fetch('/api/analysis?limit=10').then(r => r.json());
        }
    }
}
```

### Local Storage Extension (`extensions/local-storage.js`)

```javascript
export default {
    globals: {
        saveData: (key, data) => {
            localStorage.setItem(key, JSON.stringify(data));
        },
        
        loadData: (key) => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }
    }
}
```

## Advanced Patterns

### Pattern 1: Multi-Tenant AI Application

```json
{
  "routing": "BROWSER",
  "viewsPath": "views",
  
  "routes": [
    {
      "url": "/",
      "path": "auth",
      "subRoutes": [
        {
          "url": "/login",
          "path": "login",
          "defaultChild": true
        },
        {
          "url": "/register",
          "path": "register"
        }
      ]
    },
    {
      "url": "/tenant/:tenantId",
      "path": "tenant-layout",
      "subRoutes": [
        {
          "url": "/dashboard",
          "path": "tenant-dashboard",
          "defaultChild": true
        },
        {
          "url": "/ai-models",
          "path": "ai-models"
        },
        {
          "url": "/results",
          "path": "results"
        }
      ]
    }
  ],
  
  "extensions": [
    { "url": "extensions/tenant-auth.js" }
  ]
}
```

### Pattern 2: Progressive Feature Rollout

```json
{
  "extensions": [
    { "url": "extensions/base-features.js" },
    { "url": "extensions/advanced-features.js?version=beta" },
    { "url": "extensions/experimental-ai.js?enabled=true" }
  ]
}
```

### Pattern 3: Environment-Specific Configuration

```javascript
// Dynamic config based on environment
import { startViewZ } from './lib/frameworkz.mjs';

const env = process.env.NODE_ENV || 'development';
const configFile = env === 'production' 
    ? 'viewz.config.prod.json'
    : 'viewz.config.dev.json';

startViewZ(configFile);
```

### Pattern 4: Component-Rich Dashboard

```json
{
  "routes": [
    {
      "url": "/",
      "path": "dashboard-layout",
      "subRoutes": [
        {
          "url": "/overview",
          "path": "dashboard-overview",
          "defaultChild": true
        }
      ]
    }
  ],
  
  "components": [
    { "name": "widget-stats" },
    { "name": "widget-chart" },
    { "name": "widget-ai-status" },
    { "name": "widget-recent-jobs" },
    { "name": "widget-notifications" }
  ]
}
```

**Dashboard View**:
```html
<div class="dashboard">
    <div class="grid">
        <z-widget-stats metric="api_calls"></z-widget-stats>
        <z-widget-stats metric="ai_models"></z-widget-stats>
        <z-widget-stats metric="accuracy"></z-widget-stats>
    </div>
    
    <div class="row">
        <z-widget-chart type="line" data-source="performance"></z-widget-chart>
        <z-widget-ai-status></z-widget-ai-status>
    </div>
    
    <div class="row">
        <z-widget-recent-jobs limit="10"></z-widget-recent-jobs>
        <z-widget-notifications></z-widget-notifications>
    </div>
</div>
```

## Advanced Configuration

### Custom Container

```json
{
  "container": "#my-app"
}
```

or

```javascript
const container = document.querySelector('#my-app');
startViewZ({
    ...config,
    container: container
});
```

### Disable View Caching

```json
{
  "cacheAllViews": false
}
```

Useful for memory-constrained environments or large applications.

### Programmatic Configuration

```javascript
import { startViewZ } from 'lib/frameworkz.mjs';

const config = {
    routing: 'HASH',
    viewsPath: 'views',
    routes: [
        {
            url: '/',
            path: 'home'
        },
        {
            url: '/about',
            path: 'about'
        }
    ],
    extensions: [
        {
            globals: {
                appName: 'My AI App',
                appVersion: '1.0.0'
            }
        }
    ]
};

startViewZ(config);
```

## Comparison: Before and After FrameworkZ

### Without FrameworkZ (40+ lines)

```javascript
import { ViewZ } from 'lib/viewz.mjs';
import { RouterZ, constants } from 'lib/routerz.mjs';
import { createComponent } from 'lib/componentz.mjs';

const view1 = new ViewZ({...});
const view2 = new ViewZ({...});
const view3 = new ViewZ({...});

createComponent('components', { name: 'header' });
createComponent('components', { name: 'nav' });

const router = new RouterZ({
    type: constants.HASH,
    container: document.getElementById('app')
});

router.addRoute({
    url: '/',
    view: view1,
    routes: [...]
});

// etc...

await router.start();
```

### With FrameworkZ (2 lines)

```javascript
import { startViewZ } from 'lib/frameworkz.mjs';
await startViewZ('viewz.config.json');
```

## Best Practices

1. **Organization**: Keep view files organized by feature
   ```
   views/
     auth/
     dashboard/
     analysis/
     settings/
   ```

2. **Extensions**: Group related functionality
   ```
   extensions/
     api.js
     storage.js
     auth.js
     analytics.js
   ```

3. **Components**: Reusable across routes
   ```
   components/
     common/
       header/
       footer/
       nav/
     widgets/
       chart/
       table/
       card/
   ```

4. **Configuration**: Keep config minimal and readable
   - Use default values when possible
   - One config file per environment
   - Document custom options

## Integration with CI/CD

### Generate Config Dynamically

```bash
# build.js
const fs = require('fs');
const config = {
    routing: process.env.ROUTING_MODE || 'HASH',
    container: process.env.APP_CONTAINER || '#app',
    routes: /* load from manifest */,
    extensions: /* filter by environment */,
    components: /* generate from component directory */
};
fs.writeFileSync('viewz.config.json', JSON.stringify(config, null, 2));
```

## Troubleshooting

### Views Not Loading

- Check `viewsPath` matches your directory structure
- Verify view files exist: `{viewsPath}/{path}/{path}.{html,css,js}`
- Check browser console for file loading errors

### Routes Not Working

- Verify route `url` format matches BindZ/RouterZ syntax
- Ensure `path` values are unique
- Check file names match (kebab-case in config → view file name)

### Extensions Not Loading

- Check extension URLs are correct
- Verify extension exports default object
- Check console for import errors

### Components Not Found

- Verify component names match files
- Check `componentsPath` is correct
- Ensure component files exist in correct structure

## Summary

FrameworkZ provides:
- **Convention over configuration**: Predictable project structure
- **Single entry point**: One function to initialize entire app
- **Declarative**: Define app structure in JSON
- **Scalable**: Easy to add views, routes, components
- **Zero boilerplate**: Focus on application logic, not setup

Perfect for AI agents building: production applications, scalable SPA frameworks, extensible platforms, component-driven UIs, and any complex application requiring clean architecture.

## Quick Reference

| File | Purpose |
|------|---------|
| `viewz.config.json` | Application configuration |
| `index.html` | Entry point |
| `views/{path}/{name}.html` | View template |
| `views/{path}/{name}.css` | View styles |
| `views/{path}/{name}.js` | View logic |
| `extensions/{name}.js` | Extension module |
| `components/{name}/{name}.html` | Component template |
| `components/{name}/{name}.css` | Component styles |
| `components/{name}/{name}.js` | Component logic |

| Config Option | Type | Purpose |
|---------------|------|---------|
| `routing` | `HASH|BROWSER|MEMORY` | URL routing mode |
| `container` | selector/element | DOM container |
| `viewsPath` | string | Views directory |
| `componentsPath` | string | Components directory |
| `cacheAllViews` | boolean | Pre-load views |
| `routes` | array | Route definitions |
| `extensions` | array | Extensions to load |
| `components` | array | Components to register |

| API | Purpose |
|-----|---------|
| `startViewZ(config)` | Initialize entire framework |
| `startViewZ(configUrl)` | Initialize from JSON file |
