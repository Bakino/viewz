# ViewZ Library - Reverse Engineered Specification

## Document Information

- **Project**: ViewZ
- **Version**: 1.0.0
- **Analysis Date**: 2026-04-25
- **Specification Type**: Reverse Engineered from Implementation

---

## 1. Technology Stack and Architecture

### 1.1 Core Technologies

| Technology | Purpose | Version/Source |
|------------|---------|----------------|
| JavaScript (ES Modules) | Primary language | ES6+ |
| JSDOM | Server-side rendering | ^25.0.1 |
| path-to-regexp | URL pattern matching | ^8.2.0 |
| History API | Browser routing | ^5.3.0 (CDN) |
| split-grid | Resizable stack panels | ^1.0.11 (CDN) |

### 1.2 Architecture Overview

ViewZ is a three-layer progressive web application framework:

```
┌─────────────────────────────────────────────────────────┐
│                    RouterZ Layer                         │
│         (URL-based navigation and routing)              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                     ViewZ Layer                          │
│      (View lifecycle, data loading, rendering)          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    BindZ Layer                           │
│      (Two-way data binding and DOM reactivity)          │
└─────────────────────────────────────────────────────────┘
```

**Layer Independence**: Each layer can be used independently:
- BindZ can be used without ViewZ or RouterZ
- ViewZ can be used with BindZ but without RouterZ
- RouterZ requires both ViewZ and BindZ

### 1.3 Module Structure

```
lib/
├── bindz.mjs           - Data binding and reactivity system
├── viewz.mjs           - View lifecycle and rendering
├── routerz.mjs         - URL routing and navigation
├── frameworkz.mjs      - Application bootstrap
├── stackerz.mjs        - Stack-based view containers
├── componentz.mjs      - Reusable component system
├── utilz.mjs           - Utility functions (waiter, loaders)
└── vendor/
    └── path-to-regexp.mjs - URL pattern matching

server/
└── viewzSsr.mjs        - Server-side rendering middleware

examples/
├── 01-bindz/          - BindZ usage examples
├── 02-viewz/          - ViewZ usage examples
├── 03-routerz/        - RouterZ usage examples
├── 04-componentz/     - Component usage examples
└── 05-frameworkz/     - Full framework examples
```

---

## 2. BindZ Layer - Data Binding System

### 2.1 Core Concepts

**BindZ** provides automatic two-way data binding between JavaScript data objects and DOM elements using custom HTML attributes.

### 2.2 Observed Requirements

#### 2.2.1 Data Reactivity

The system shall provide reactive data objects that automatically notify listeners when properties change.

**Evidence**: `lib/bindz.mjs:284-982` - DataZ class with Proxy-based observation

**Implementation Details**:
- Uses JavaScript Proxy to intercept property access and modification
- Maintains a flattened data cache for performance
- Supports nested object and array observation
- Tracks all data paths linked to each observed object

#### 2.2.2 Data Binding Syntax

The system shall support the following binding syntaxes:

| Syntax | Purpose | Example |
|--------|---------|---------|
| `z-bind="path"` | Two-way value binding | `<input z-bind="user.name">` |
| `${expression}` | Template expression | `<div>Hello ${name}</div>` |
| `z-on-event` | Event handler binding | `<button z-on-click="handleClick">` |
| `z-hide-if` | Conditional hiding | `<div z-hide-if="!visible">` |
| `z-show-if` | Conditional showing | `<div z-show-if="visible">` |
| `item of items` | Loop iteration | `<li z-bind="item of items">` |
| `(item,index) of items` | Loop with index | `<li z-bind="(item,i) of items">` |

**Evidence**: `lib/bindz.mjs:1271-1453` - analyzeNode method

#### 2.2.3 Two-Way Binding

When a user modifies an input element, the system shall update the underlying data object.

**Evidence**: `lib/bindz.mjs:1913-1953` - prepareBinding method

**Supported Input Types**:
- Text inputs: Updates on `change` and `keyup` events
- Checkboxes: Binds to `checked` property
- Radio buttons: Binds to `checked` property based on value match
- File inputs: Binds to `File` or `FileList` object
- Textareas: Updates on `change` and `keyup` events

#### 2.2.4 Array Reactivity

The system shall automatically update the DOM when array operations are performed.

**Evidence**: `lib/bindz.mjs:575-637` - applySpliceOnProxy method

**Supported Array Operations**:
- `splice()`: Removes and adds items with path updates
- `push()`: Adds items to end
- `pop()`: Removes items from end
- `shift()`: Removes items from beginning
- `unshift()`: Adds items to beginning
- Direct index assignment: Updates specific items

#### 2.2.5 Loop/Repeater

The system shall support repeating DOM elements based on array data.

**Evidence**: `lib/bindz.mjs:2168-2504` - Repeater class

**Features**:
- Syntax: `item of items` or `(item,index) of items`
- Automatic DOM updates on array changes
- Support for recursive data structures via `z-recurse` attribute
- Efficient DOM updates using document fragments

#### 2.2.6 Conditional Rendering

The system shall support showing/hiding elements based on data conditions.

**Evidence**: `lib/bindz.mjs:1967-2162` - Hider class

**Features**:
- `z-hide-if="condition"`: Hides when condition is true
- `z-show-if="condition"`: Shows when condition is true
- Automatic updates when condition dependencies change
- Uses placeholder comments for hidden elements

#### 2.2.7 Event Handling

The system shall support binding event handlers to DOM elements.

**Evidence**: `lib/bindz.mjs:1456-1500` - registerEventListener method

**Supported Events**:
- Standard DOM events: `z-on-click`, `z-on-submit`, etc.
- Special events:
  - `z-on-enter`: Triggers on Enter key (keyCode 13)
  - `z-on-escape`: Triggers on Escape key (keyCode 27)
  - `z-prevent-double-click`: Prevents double-click on buttons

#### 2.2.8 Expression Evaluation

The system shall evaluate JavaScript expressions in the context of bound data.

**Evidence**: `lib/bindz.mjs:1510-1584` - runExpression method

**Features**:
- Access to data properties by name
- Access to context variables (e.g., `view`, `event`)
- Template string support with `${}` syntax
- Function caching for performance
- Error handling with console logging

#### 2.2.9 Attribute Binding

The system shall support binding to any HTML attribute using template expressions.

**Evidence**: `lib/bindz.mjs:1369-1409` - attribute binding in analyzeNode

**Examples**:
- `<img src="${imageUrl}">`
- `<div class="${className}">`
- `<input placeholder="${placeholderText}">`

#### 2.2.10 Data Listeners

The system shall allow registration of listeners for specific data paths.

**Evidence**: `lib/bindz.mjs:303-326` - addListener/removeListener methods

**Features**:
- Listen to specific paths: `data.addListener("user.name", callback)`
- Wildcard support: `data.addListener("user.*", callback)`
- Listener receives `{oldValue, newValue, target, property}`

---

## 3. ViewZ Layer - View System

### 3.1 Core Concepts

**ViewZ** manages the lifecycle of individual views, including data loading, rendering, and destruction.

### 3.2 Observed Requirements

#### 3.2.1 View Lifecycle

The system shall support the following view lifecycle stages:

| Stage | Method | Purpose |
|-------|--------|---------|
| Initialization | `constructor` | Create view instance with options |
| Data Loading | `loader()` | Fetch data for the view |
| Rendering | `render()` | Render view to container |
| Displayed | `displayed()` | Called after view is visible |
| Refresh | `refresh()` | Reload data and re-render |
| Destruction | `destroy()` | Clean up resources |

**Evidence**: `lib/viewz.mjs:26-569` - ViewZ class

#### 3.2.2 View Sources

The system shall support loading view sources from files or inline content.

**Evidence**: `lib/viewz.mjs:136-230` - prepareSources method

**Supported Source Types**:
- HTML: File path or inline HTML string
- CSS: File path or inline CSS string
- JavaScript: File path or inline JS string

**Detection**: If HTML contains `<` and `>`, treated as inline content.

#### 3.2.3 CSS Scoping

The system shall scope CSS to individual views to prevent style conflicts.

**Evidence**: `lib/viewz.mjs:4-12` - polyfillCssScope function

**Implementation**:
- Uses native `@scope` CSS when available
- Falls back to `scoped` attribute polyfill from CDN
- Automatically wraps view CSS in scope

#### 3.2.4 View Context

The system shall provide a context object accessible within view JavaScript.

**Evidence**: `lib/viewz.mjs:53-56` - context initialization

**Context Includes**:
- `view`: Reference to the view instance
- Extension-provided globals
- Parent view context (for nested views)

#### 3.2.5 View Extensions

The system shall support loading extensions that extend view functionality.

**Evidence**: `lib/viewz.mjs:27-40` - loadExtension method

**Extension Capabilities**:
- Add global variables to all views
- Extend view with additional methods/properties
- Provide HTML processors
- Provide document transformers
- Set error handlers
- Set default waiter messages

#### 3.2.6 View Events

The system shall dispatch events during view lifecycle.

**Evidence**: `lib/viewz.mjs:318-334` - event handling in render method

**Events**:
- `displayed`: Dispatched when view becomes visible
- Custom events via `view.dispatchEvent(name, data)`

#### 3.2.7 DOM Query Helpers

The system shall provide scoped DOM query methods.

**Evidence**: `lib/viewz.mjs:336-344` - query methods

**Methods**:
- `view.getElementById(id)`: Query within view container
- `view.querySelector(selector)`: Query within view container
- `view.querySelectorAll(selector)`: Query all matches

#### 3.2.8 Manual Rendering

The system shall support manual triggering of view rendering.

**Evidence**: `lib/viewz.mjs:270-274` - manualRender method

**Use Case**: When data is modified with `_dontAutoBind` flag.

#### 3.2.9 Data Listeners

The system shall allow adding listeners to view data changes.

**Evidence**: `lib/viewz.mjs:276-278` - addDataListener method

**Usage**: `view.addDataListener("user.name", callback)`

#### 3.2.10 Clean Data Access

The system shall provide access to original data without internal properties.

**Evidence**: `lib/viewz.mjs:280-282` - getCleanData method

---

## 4. RouterZ Layer - Routing System

### 4.1 Core Concepts

**RouterZ** manages URL-based navigation and view loading based on route patterns.

### 4.2 Observed Requirements

#### 4.2.1 History Types

The system shall support multiple history management strategies.

**Evidence**: `lib/routerz.mjs:8-12, 184-196` - constants and constructor

| Type | Constant | Description |
|------|----------|-------------|
| Browser | `BROWSER` | Uses HTML5 History API |
| Memory | `MEMORY` | Uses in-memory history |
| Hash | `HASH` | Uses hash-based routing |

#### 4.2.2 Route Definition

The system shall support hierarchical route definitions.

**Evidence**: `lib/routerz.mjs:66-102` - RouteZ class

**Route Properties**:
- `url`: URL pattern (path-to-regexp syntax)
- `view`: ViewZ instance to render
- `title`: Optional page title
- `parent`: Parent route (for nested routes)
- `defaultChild`: Default child route to render
- `routes`: Array of child routes

#### 4.2.3 Route Parameters

The system shall extract parameters from URL patterns.

**Evidence**: `lib/routerz.mjs:396-423` - _parseLocation method

**Parameter Types**:
- Path parameters: `/user/:id` → `{id: "123"}`
- Query parameters: `?name=John` → `{name: "John"}`
- Hash: `#section` → `"section"`

#### 4.2.4 Route Listeners

The system shall support event listeners for routing events.

**Evidence**: `lib/routerz.mjs:328-347` - addListener/removeListener methods

**Events**:
- `before`: Fired before route change
- `after`: Fired after route change
- `noroute`: Fired when no route matches
- `error`: Fired on routing errors
- `viewOpen`: Fired when a view is opened
- `stackClosed`: Fired when a stack is closed

#### 4.2.5 Navigation Blocking

The system shall support blocking navigation with confirmation.

**Evidence**: `lib/routerz.mjs:248-265` - block/unblock methods

**Usage**:
```javascript
router.block("Unsaved changes - are you sure?");
// ... later
router.unblock();
```

#### 4.2.6 Auto-Navigation

The system shall automatically intercept internal links for router navigation.

**Evidence**: `lib/routerz.mjs:211-224` - docTransformer in router extension

**Behavior**:
- Links starting with `/` are intercepted
- Non-route links open normally
- Target `_blank` opens in new tab

#### 4.2.7 View Caching

The system shall support pre-caching view sources.

**Evidence**: `lib/routerz.mjs:298-314` - cacheAllViews method

**Features**:
- Synchronous caching of first N routes
- Asynchronous caching of remaining routes
- Configurable sync limit

#### 4.2.8 Title Management

The system shall update document title based on route.

**Evidence**: `lib/routerz.mjs:730-763` - updateTitle method

**Title Sources**:
- Route title property
- View title property (string or function)
- Main title prefix

#### 4.2.9 Route Instance Management

The system shall maintain separate instances for each route level.

**Evidence**: `lib/routerz.mjs:104-115` - getInstance method

**Purpose**: Allows multiple instances of the same view at different stack levels.

---

## 5. StackerZ Layer - Stack System

### 5.1 Core Concepts

**StackerZ** provides various container layouts for opening views in stacks (modals, sidebars, etc.).

### 5.2 Observed Requirements

#### 5.2.1 Stack Types

The system shall support multiple stack container types.

**Evidence**: `lib/stackerz.mjs:225-291` - stacker exports

| Prefix | Type | Description |
|--------|------|-------------|
| `)` | Left | Opens on left side |
| `(` | Right | Opens on right side |
| `_` | Bottom | Opens on bottom |
| `-` | Top | Opens on top |
| `()` | Dialog | Opens as centered dialog |
| `F` | Fullscreen | Opens fullscreen |
| `i` | Inplace | Replaces parent view content |
| `-I` | Side Left | Split screen, left side |
| `I-` | Side Right | Split screen, right side |
| `T` | Side Top | Split screen, top side |
| `L` | Side Bottom | Split screen, bottom side |

#### 5.2.2 Stack Syntax

The system shall use URL-based stack syntax.

**Evidence**: `lib/routerz.mjs:14-15, 430-473` - STACK_PATTERN_REGEX and parsing

**Syntax**: `/base/route/*prefix!params*/stacked/route`

**Examples**:
- `/home/*)*/settings` - Open settings in left stack
- `/home/*()*/modal` - Open as dialog
- `/home/*w=300px!x*/panel` - Open panel with width 300px and close button

#### 5.2.3 Stack Parameters

The system shall support configurable stack parameters.

**Evidence**: `lib/stackerz.mjs:1-6, 68-79` - STACK_STYLE_PARAMS

| Parameter | CSS Variable | Description |
|-----------|--------------|-------------|
| `w` | `--viewz-stack-lateral-width` | Width for side stacks |
| `h` | `--viewz-stack-vertical-height` | Height for top/bottom stacks |
| `bg` | `--viewz-stack-background-color` | Background color |
| `t` | `--viewz-stack-transition-duration` | Transition duration |
| `x` | - | Show close button |
| `r` | - | Enable resizable gutter |

#### 5.2.4 Stack Lifecycle

The system shall manage stack container lifecycle.

**Evidence**: `lib/stackerz.mjs:8-104` - Stacker class

**Lifecycle**:
1. Create overlay and container
2. Apply parameters and styles
3. Show with animation
4. On close: hide with animation, then destroy

#### 5.2.5 Resizable Stacks

The system shall support resizable split-screen stacks.

**Evidence**: `lib/stackerz.mjs:136-223` - StackerSide class

**Features**:
- Uses split-grid library for resizing
- Draggable gutter between panels
- Maintains grid layout during resize

---

## 6. ComponentZ Layer - Component System

### 6.1 Core Concepts

**ComponentZ** provides reusable web components with data binding.

### 6.2 Observed Requirements

#### 6.2.1 Component Definition

The system shall support defining components from HTML/CSS/JS files.

**Evidence**: `lib/componentz.mjs:143-152` - createComponent function

**Component Structure**:
```
components/
└── my-component/
    ├── my-component.html
    ├── my-component.css
    └── my-component.js
```

#### 6.2.2 Component Usage

The system shall use custom elements for components.

**Evidence**: `lib/componentz.mjs:7-141` - ViewZElement class

**Usage**: `<z-my-component attr1="value1" attr2="value2"></z-my-component>`

#### 6.2.3 Component Attributes

The system shall support passing data via attributes.

**Evidence**: `lib/componentz.mjs:48-78` - attribute observation

**Features**:
- Automatic kebab-case to camelCase conversion
- Type conversion: `"true"` → `true`, `"123"` → `123`
- Reactive updates on attribute changes
- MutationObserver for change detection

#### 6.2.4 Component Slots

The system shall support slot content for components.

**Evidence**: `lib/componentz.mjs:11-36` - slot handling

**Usage**:
```html
<z-my-component>
  <div>This content goes into the slot</div>
</z-my-component>
```

#### 6.2.5 Component Context

The system shall provide parent view context to components.

**Evidence**: `lib/componentz.mjs:82-90` - connectedCallback

**Context Includes**:
- `parentView`: Reference to parent view
- Access to parent router

---

## 7. Server-Side Rendering

### 7.1 Core Concepts

**SSR** provides server-side rendering for initial page load and SEO.

### 7.2 Observed Requirements

#### 7.2.1 Middleware Creation

The system shall provide Express-compatible middleware for SSR.

**Evidence**: `server/viewzSsr.mjs:8-80` - createMiddleware function

**Usage**:
```javascript
app.use(await createMiddleware({
  sourcePath: './public',
  base: '/app',
  containerId: 'viewz-container'
}));
```

#### 7.2.2 Route Matching

The system shall match incoming requests to defined routes.

**Evidence**: `server/viewzSsr.mjs:28-31, 35-36` - route matching

**Implementation**:
- Uses path-to-regexp for pattern matching
- Supports parameter extraction
- Falls through to next middleware if no match

#### 7.2.3 HTML Generation

The system shall generate complete HTML with pre-rendered view content.

**Evidence**: `server/viewzSsr.mjs:50-63` - HTML generation

**Process**:
1. Read base HTML template
2. Match route to request URL
3. Load view HTML and CSS
4. Inject scoped CSS
5. Replace container content
6. Return serialized HTML

#### 7.2.4 CSS Scoping in SSR

The system shall scope CSS for SSR output.

**Evidence**: `server/viewzSsr.mjs:53-58` - CSS scoping

**Implementation**:
- Uses `scoped` attribute for polyfill
- Commented code for future `@scope` support
- Wraps CSS in `<style scoped>` tag

#### 7.2.5 HTML Processors

The system shall support custom HTML processors for SSR.

**Evidence**: `server/viewzSsr.mjs:176-184` - htmlProcessors application

**Usage**: Processors can modify the DOM before serialization.

---

## 8. Utility Functions

### 8.1 Observed Requirements

#### 8.1.1 Waiter/Spinner

The system shall provide automatic loading indicators for async operations.

**Evidence**: `lib/utilz.mjs:82-262` - Waiter class

**Features**:
- Automatic spinner display for async functions
- Configurable messages
- Error handling with alerts
- 100ms delay before showing (to avoid flicker)
- 10-second warning for long operations

#### 8.1.2 Script Loading

The system shall support dynamic script loading.

**Evidence**: `lib/utilz.mjs:265-295` - loadScript function

**Features**:
- Prevents duplicate loading
- Async loading
- Error handling

#### 8.1.3 CSS Loading

The system shall support dynamic CSS loading.

**Evidence**: `lib/utilz.mjs:297-309` - loadCss function

#### 8.1.4 UUID Generation

The system shall provide UUID generation for unique identifiers.

**Evidence**: `lib/utilz.mjs:3-14` - uuidv4 function

**Implementation**:
- Uses crypto.getRandomValues when available
- Falls back to Math.random()

---

## 9. Non-Functional Observations

### 9.1 Performance

**Observations**:
- Expression caching in `CACHE_EXPRESSIONS` Map
- Flattened data cache in DataZ
- Document fragments for batch DOM updates
- Lazy loading of view sources
- Async preparation of views

**Evidence**: `lib/bindz.mjs:988, lib/viewz.mjs:136-230`

### 9.2 Browser Compatibility

**Observations**:
- CSS scope polyfill for browsers without `@scope`
- iOS/Safari reflow workaround
- Feature detection for crypto API

**Evidence**: `lib/viewz.mjs:4-12, 498-506`

### 9.3 Error Handling

**Observations**:
- Try-catch blocks around expression evaluation
- Console error logging
- Alert dialogs for critical errors
- Graceful degradation

**Evidence**: Throughout codebase

### 9.4 Memory Management

**Observations**:
- WeakMap for waiter instances
- Proper cleanup on view destruction
- AbortController for event cleanup
- Removal of listeners on destroy

**Evidence**: `lib/utilz.mjs:188, lib/viewz.mjs:542-569`

---

## 10. Inferred Acceptance Criteria

### 10.1 BindZ Layer

- [ ] Data changes automatically update bound DOM elements
- [ ] User input automatically updates bound data
- [ ] Array operations (push, pop, splice) update the DOM
- [ ] Conditional rendering responds to data changes
- [ ] Loop rendering responds to array changes
- [ ] Event handlers execute in correct context
- [ ] Expressions evaluate with access to data and context

### 10.2 ViewZ Layer

- [ ] Views load data before rendering
- [ ] Views render HTML/CSS/JS from sources
- [ ] CSS is scoped to prevent conflicts
- [ ] Views can be refreshed with new data
- [ ] Views clean up resources on destruction
- [ ] Extensions can extend view functionality
- [ ] DOM queries are scoped to view container

### 10.3 RouterZ Layer

- [ ] URL changes trigger route matching
- [ ] Route parameters are extracted correctly
- [ ] Nested routes render in correct containers
- [ ] Navigation can be blocked with confirmation
- [ ] Internal links use router navigation
- [ ] Document title updates with route
- [ ] Multiple route instances can coexist

### 10.4 StackerZ Layer

- [ ] Stacks open with correct layout
- [ ] Stack parameters apply correctly
- [ ] Stacks close with animation
- [ ] Resizable stacks maintain layout
- [ ] Stack syntax parses correctly from URL

### 10.5 ComponentZ Layer

- [ ] Components render from file sources
- [ ] Component attributes pass data correctly
- [ ] Component slots render content
- [ ] Component context includes parent view
- [ ] Attribute changes trigger updates

### 10.6 SSR Layer

- [ ] Middleware matches routes correctly
- [ ] HTML includes pre-rendered content
- [ ] CSS is scoped in output
- [ ] HTML processors can modify output
- [ ] Non-matching routes fall through

---

## 11. Uncertainties and Questions

### 11.1 Architecture

1. **Why does ViewZ use a global VIEWS object?**
   - Location: `lib/viewz.mjs:24`
   - Concern: Global state may cause issues with multiple router instances

2. **What is the purpose of the `plainSources` flag?**
   - Location: `lib/viewz.mjs:58-61`
   - Unclear: When would inline sources be preferred over file sources?

3. **Why are some methods in ViewZ added dynamically?**
   - Location: `lib/viewz.mjs:378-389`
   - Concern: Dynamic method addition may affect type safety

### 11.2 BindZ Layer

1. **What is the performance impact of the 2^n listener matching algorithm?**
   - Location: `lib/bindz.mjs:332-386`
   - Concern: May be inefficient for deeply nested paths

2. **Why does the system clear the entire flattened cache on splice?**
   - Location: `lib/bindz.mjs:628`
   - Concern: Comment suggests optimization is needed

3. **What is the purpose of the `siblings` array in Proxy?**
   - Location: `lib/bindz.mjs:652`
   - Unclear: When would multiple DataZ instances observe the same data?

### 11.3 RouterZ Layer

1. **Why does the system use a render queue?**
   - Location: `lib/routerz.mjs:178, 475-494`
   - Unclear: What scenarios require queued rendering?

2. **What is the purpose of the `currentStack` property?**
   - Location: `lib/routerz.mjs:658`
   - Unclear: How is this used beyond comparison?

3. **Why are there commented-out methods like `back` and `forward`?**
   - Location: `lib/routerz.mjs:864-873`
   - Concern: Incomplete implementation or deprecated features?

### 11.4 SSR Layer

1. **Why is `@scope` commented out in SSR?**
   - Location: `server/viewzSsr.mjs:54-58`
   - Unclear: Is this waiting for browser support or JSDOM support?

2. **What is the purpose of the `generateSsrContent` function?**
   - Location: `server/viewzSsr.mjs:82-244`
   - Unclear: How does this differ from the middleware approach?

### 11.5 Security

1. **Are there any XSS protections in expression evaluation?**
   - Location: `lib/bindz.mjs:1510-1584`
   - Concern: Direct Function constructor may be vulnerable

2. **Are there any CSRF protections for form submissions?**
   - Not observed in codebase

3. **Are there any input sanitization mechanisms?**
   - Not observed in codebase

---

## 12. Recommendations

### 12.1 Architecture

1. **Consider removing global VIEWS object**
   - Store views in router instance instead
   - Improves support for multiple router instances

2. **Document the purpose of `plainSources` flag**
   - Add clear documentation for when to use inline vs file sources

3. **Consider using class methods instead of dynamic addition**
   - Improves type safety and IDE support
   - Makes code more maintainable

### 12.2 Performance

1. **Optimize listener matching algorithm**
   - Consider using a trie or prefix tree for path matching
   - Reduces complexity from O(2^n) to O(n)

2. **Implement selective cache invalidation**
   - Only clear affected paths on array operations
   - Improves performance for large data structures

3. **Add performance monitoring**
   - Track render times
   - Identify bottlenecks

### 12.3 Security

1. **Add XSS protections**
   - Sanitize user input before expression evaluation
   - Consider using a sandboxed evaluation environment

2. **Add CSRF protection**
   - Implement token-based CSRF protection
   - Especially important for form submissions

3. **Add input validation**
   - Validate route parameters
   - Validate user input before processing

### 12.4 Documentation

1. **Add comprehensive API documentation**
   - Document all public methods and properties
   - Include usage examples

2. **Add architecture documentation**
   - Explain the three-layer architecture
   - Document the data flow between layers

3. **Add migration guides**
   - Document how to upgrade between versions
   - Document breaking changes

### 12.5 Testing

1. **Add unit tests**
   - Test each layer independently
   - Test edge cases and error conditions

2. **Add integration tests**
   - Test interactions between layers
   - Test end-to-end scenarios

3. **Add performance tests**
   - Benchmark rendering performance
   - Identify performance regressions

---

## 13. Code Locations Reference

| Feature | File | Lines |
|---------|------|-------|
| DataZ Proxy | lib/bindz.mjs | 284-982 |
| BindZ Class | lib/bindz.mjs | 993-1960 |
| Hider Class | lib/bindz.mjs | 1967-2162 |
| Repeater Class | lib/bindz.mjs | 2168-2504 |
| ViewZ Class | lib/viewz.mjs | 26-569 |
| RouterZ Class | lib/routerz.mjs | 157-958 |
| Stacker Classes | lib/stackerz.mjs | 8-291 |
| ComponentZ | lib/componentz.mjs | 7-152 |
| FrameworkZ | lib/frameworkz.mjs | 1-178 |
| SSR Middleware | server/viewzSsr.mjs | 8-80 |
| SSR Generator | server/viewzSsr.mjs | 82-244 |
| Waiter | lib/utilz.mjs | 82-186 |
| Loaders | lib/utilz.mjs | 265-320 |

---

## Appendix A: EARS Format Reference

This specification uses EARS (Easy Approach to Requirements Syntax) for structuring observed requirements:

| Type | Pattern | Example |
|------|---------|---------|
| Ubiquitous | The `<system>` shall `<action>`. | The API shall return JSON responses. |
| Event-driven | When `<trigger>`, the `<system>` shall `<action>`. | When a request lacks an auth token, the system shall return HTTP 401. |
| State-driven | While `<state>`, the `<system>` shall `<action>`. | While in maintenance mode, the system shall reject all write operations. |
| Optional | Where `<feature>` is supported, the `<system>` shall `<action>`. | Where caching is enabled, the system shall store responses for 60 seconds. |

---

## Appendix B: Binding Syntax Examples

### Simple Binding
```html
<input z-bind="username">
<div>Hello ${username}!</div>
```

### Two-Way Binding
```html
<input type="checkbox" z-bind="termsAccepted">
<button z-on-click="submit" z-hide-if="!termsAccepted">Submit</button>
```

### Loop Binding
```html
<ul>
  <li z-bind="(item, index) of items">
    ${index + 1}. ${item.name}
  </li>
</ul>
```

### Event Handling
```html
<button z-on-click="handleClick(event, this)">Click me</button>
<input z-on-enter="submitForm()">
```

### Attribute Binding
```html
<img src="${imageUrl}" alt="${imageAlt}">
<div class="${statusClass}">${statusMessage}</div>
```

---

## Appendix C: Stack Syntax Examples

### Left Stack
```javascript
router.navigateTo('/home/*)*/settings');
```

### Dialog Stack
```javascript
router.navigateTo('/home/*()*/modal');
```

### Stack with Parameters
```javascript
router.navigateTo('/home/*w=400px!x*/panel');
```

### Nested Stacks
```javascript
router.navigateTo('/home/*)*/settings/*()*/confirm');
```

---

**End of Specification**