# ViewZ Suite Skill: Full Application Support for AI Agents
## Overview
The general ViewZ Suite skill covers the entirety of the library's building blocks: BindZ, ViewZ, RouterZ, ComponentZ, and FrameworkZ.
It is designed for AI agents that need to manage complex projects and build complete applications: reactive interfaces, encapsulated components, client-side routing, hierarchical views, custom components, and global configuration.
Individual skill files remain available for targeted use on a single building block: BindZ for data binding, ViewZ for views, RouterZ for routing, ComponentZ for components, and FrameworkZ for full orchestration.
## Objective
This skill is intended for an AI agent that needs to:
- design a complete application with reactive state,
- organize the application into views and reusable components,
- manage navigation and URL parameters,
- use custom Web components,
- or get started quickly via a single JSON configuration.
## Key Concepts
### 1. BindZ: Reactive Data Foundation
BindZ is the data binding engine that powers views and components.
- `z-bind` to bind model properties to the DOM.
- `${}` to evaluate expressions in HTML.
- `z-show-if` / `z-hide-if` for conditional display.
- `z-on-*` to handle user events.
- `z-bind="item of items"` to generate dynamic lists.
AI agent use case: update the interface in real time with model results, enable bidirectional user input, display errors and statuses dynamically.
### 2. ViewZ: Modular Views and Lifecycle
ViewZ organizes the UI into view-type components.
Each view has:
- an HTML page,
- a scoped CSS style,
- a JavaScript script with `view.loader`, `view.displayed`, `view.refreshed`, `view.destroyed`.
Simple view example:
```javascript
view.loader = async () => ({
  title: 'AI Analysis',
  description: 'Results in progress'
});
view.displayed = async () => {
  view.refreshData = async () => {
    await view.refresh();
  };
};
```
AI agent use case: encapsulate an analysis screen, manage side effects and clean up timers when the view disappears.
### 3. RouterZ: Client-Side Navigation and Hierarchical Routes
RouterZ enables building SPA applications.
- `constants.HASH`, `constants.BROWSER`, `constants.MEMORY`
- simple route: `/dashboard`
- parameterized route: `/detail/:id`
- optional route: `/search{/:category}`
- nested routes via `subRoutes`
- routing to modals/overlays with stackers
Example:
```javascript
router.addRoute({
  url: '/',
  view: layoutView,
  routes: [
    { url: '/dashboard', view: dashboardView, defaultChild: true },
    { url: '/analysis/:id', view: analysisView }
  ]
});
```
AI agent use case: build a multi-step workflow with clean URLs and shared data between views.
### 4. ComponentZ: Reusable Web Components
ComponentZ extends ViewZ with custom HTML components.
- `components/my-component/{.html,.css,.js}` structure
- usage: `<z-my-component ...></z-my-component>`
- parameters passed via attributes converted to camelCase
- `view.route.params` inside the component
- slots with `<z-slot>`
- event emission and parent/child communication
Example:
```html
<z-sensor sensor-id="temp-01" type="Temperature"></z-sensor>
```
```javascript
view.loader = async () => ({
  sensorId: view.route.params.sensorId,
  value: await fetchSensorData(view.route.params.sensorId)
});
```
AI agent use case: create a library of AI widgets (results, charts, timers, cards) that can be reused anywhere.
### 5. FrameworkZ: Global Declarative Orchestration
FrameworkZ is the highest layer: it allows starting the entire application from a `viewz.config.json` file.
- `routes` to declare views,
- `components` to register components,
- `extensions` to inject shared functions/globals,
- `viewsPath` and `componentsPath` for folder conventions,
- `cacheAllViews`, `container`, `routing`.
Minimal example:
```json
{
  "routing": "HASH",
  "viewsPath": "views",
  "componentsPath": "components",
  "routes": [
    { "url": "/", "path": "layout", "subRoutes": [
      { "url": "/dashboard", "path": "dashboard", "defaultChild": true },
      { "url": "/analysis/:id", "path": "analysis" }
    ] }
  ],
  "extensions": [
    { "url": "extensions/ai-api.js" }
  ]
}
```
AI agent use case: generate a complete application without writing all the bootstrap code manually.
## How to Use This Skill
### Scenario 1: Complete Application with Configuration
1. Create `viewz.config.json`.
2. Create `views/` and `components/` following the convention.
3. Import `startViewZ('viewz.config.json')` in the entry page.
4. Add extensions for APIs and shared functions.
### Scenario 2: Custom Application Without FrameworkZ
1. Use `new ViewZ(...)` to instantiate views.
2. Use `new RouterZ(...)` to manage navigation.
3. Use `bind(...)` inside views or isolated components.
4. Register components with `createComponent('components', { name: '...' })`.
## Best Practices for an AI Agent
- Favor separation of concerns:
  - BindZ for reactive data,
  - ViewZ for screens,
  - RouterZ for navigation,
  - ComponentZ for widgets,
  - FrameworkZ for global bootstrap.
- Use `view.loader` to load initial state and `view.displayed` for effects.
- Prefer clear routes and explicit URL parameters.
- Create reusable components for recurring patterns.
- Leverage FrameworkZ extensions to share helpers across views.
## Complete Pattern Examples
### Pattern: AI Dashboard with Navigation and Components
- `views/layout` contains the main shell and `<z-sub-view>`.
- `views/dashboard` contains a global summary and reusable components.
- `views/analysis/:id` displays the detail of an analysis.
- `components/header`, `components/metric-card`, `components/ai-response` are reusable widgets.
- `extensions/ai-api.js` exposes `callAI` and `formatDate` to all views.
### Pattern: 3-Step Analysis Flow
1. `input`: data entry and analysis launch.
2. `processing`: status and progress display.
3. `results/:id`: display of finalized results.
Each of these steps can be a RouterZ route and a ViewZ view, with BindZ for reactivity and ComponentZ for result panels.
## Why Choose This General Skill
- It covers all facets of the ViewZ library.
- It guides the AI agent toward a coherent and modular architecture.
- It allows combining routing, views, components, and extensions in a single project.
- It keeps individual skills available for more targeted use cases or partial edits.
## Documentation Tips
- When the agent needs to work on a single building block, keep the BindZ/ViewZ/RouterZ/ComponentZ/FrameworkZ skill.
- When dealing with a complete project using multiple building blocks, use this general skill.
- Always check the project structure and the `viewz.config.json` file if present.