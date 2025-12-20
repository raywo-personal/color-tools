# SKILL: NgRx Signals State Management Pattern

This is a Claude Code skill for working with @ngrx/signals-based state
management architecture.

## Quick Reference

**Tech Stack:** @ngrx/signals + @ngrx/signals/events
**Pattern:** Event-driven, domain-organized state management
**Key Components:** SignalStore → Events → Reducers → Effects
**Typical Location:** `src/app/core/`

## Core Concepts

### Architecture Overview

The pattern uses four main building blocks:

1. **Signal Store** - Central store configured with `signalStore()` from
   @ngrx/signals
2. **Events** - Domain-specific event emitters using `eventGroup()`
3. **Reducers** - Pure functions that update state in response to events
4. **Effects** - Side effect handlers (navigation, persistence, API calls)

### Information Flow

```
Component → Event → Reducer → State Update → UI Update
                  ↓
                Effect → Side Effect (API, navigation, etc.)
```

## DO/DON'T Rules

### DO

✓ Use `eventGroup()` for event definitions
✓ Name events in past tense (`colorChanged`, not `changeColor`)
✓ Keep reducers pure (no side effects)
✓ Register all effects in a central effects file
✓ Return partial state objects from reducers
✓ Use `computed()` for derived state
✓ Group related events/reducers/effects by domain
✓ Export reducer and effect functions by name
✓ Use `this: void` in reducer/effect signatures

### DON'T

✗ Never use NgRx Store actions/reducers (use events/reducer functions instead)
✗ Never put side effects in reducers (use effects)
✗ Never mutate state directly (return new partial state)
✗ Never create selectors (use `computed()` instead)
✗ Never use switch statements in reducers
✗ Never inject services in reducers
✗ Never dispatch events from reducers

## Domain-Driven Organization

Each domain is organized in its own folder:

```
src/app/core/
├── app-state.store.ts          # Central signal store
├── all-effects.ts              # Effect registration
├── models/
│   └── app-state.model.ts      # State interface
├── {domain}/
│   ├── {domain}.events.ts      # Event definitions
│   ├── {domain}.reducers.ts    # State update logic
│   └── {domain}.effects.ts     # Side effects (optional)
└── common/
    ├── common.events.ts
    ├── common.reducers.ts
    ├── transfer.events.ts      # Cross-domain communication
    └── navigation.effects.ts   # Routing effects
```

## File Naming Conventions

- Events: `{domain}.events.ts`
- Reducers: `{domain}.reducers.ts`
- Effects: `{domain}.effects.ts` or `{concern}.effects.ts`
- Models: `{domain}.model.ts`
- Store: `app-state.store.ts`
- Effect registration: `all-effects.ts`

## Quick Implementation Guide

### 1. Add Event

Edit `src/app/core/{domain}/{domain}.events.ts`:

```typescript
import {eventGroup, type} from "@ngrx/signals/events";


export const domainEvents = eventGroup({
  source: "DomainName",
  events: {
    eventName: type<PayloadType>(),      // With payload
    simpleEvent: type<void>()            // Without payload
  }
});
```

### 2. Add Reducer

Edit `src/app/core/{domain}/{domain}.reducers.ts`:

```typescript
import {EventInstance} from "@ngrx/signals/events";
import {AppState} from "../models/app-state.model";


export function eventNameReducer(
  this: void,
  event: EventInstance<"[DomainName] eventName", PayloadType>,
  state: AppState
) {
  // Extract payload
  const data = event.payload;

  // Compute new values (pure logic only)
  const updatedValue = computeNewValue(data, state);

  // Return partial state (only changed properties)
  return {
    propertyToUpdate: updatedValue
  };
}
```

### 3. Register Reducer

Edit `src/app/core/app-state.store.ts`:

```typescript
import {signalStore, withState} from "@ngrx/signals";
import {withReducer, on} from "@ngrx/signals/events";
import {domainEvents} from "./{domain}/{domain}.events";
import {eventNameReducer} from "./{domain}/{domain}.reducers";


export const AppStateStore = signalStore(
  {providedIn: "root"},
  withState(initialState),
  withReducer(
    on(domainEvents.eventName, eventNameReducer),
    // ... more reducers
  ),
  withEffects(allEffects)
);
```

### 4. Add Effect (Optional)

Edit `src/app/core/{domain}/{domain}.effects.ts`:

```typescript
import {Events} from "@ngrx/signals/events";
import {tap} from "rxjs";
import {domainEvents} from "./{domain}.events";


export function effectNameEffect(
  this: void,
  events: Events,
  service: ServiceType
) {
  return events
    .on(domainEvents.eventName)
    .pipe(
      tap(event => {
        // Side effect logic
        service.doSomething(event.payload);
      })
    );
}
```

### 5. Register Effect

Edit `src/app/core/all-effects.ts`:

```typescript
import {inject} from "@angular/core";
import {Events} from "@ngrx/signals/events";
import {effectNameEffect} from "./{domain}/{domain}.effects";


export function allEffects(
  this: void,
  store: unknown,
  events = inject(Events),
  service = inject(ServiceType)
) {
  return {
    effectName$: effectNameEffect(events, service),
    // ... more effects
  };
}
```

## Code Templates

### Event Definition Template

```typescript
// In {domain}.events.ts
import {eventGroup, type} from "@ngrx/signals/events";


export const domainEvents = eventGroup({
  source: "DomainName",
  events: {
    // Event with payload
    itemUpdated: type<ItemType>(),

    // Event without payload
    itemsCleared: type<void>(),

    // Event with complex payload
    filterApplied: type<{
      field: string;
      value: string;
      operator: FilterOperator;
    }>(),

    // Navigation event
    itemCreatedWithNav: type<ItemType>(),

    // Non-navigation variant
    itemCreatedWithoutNav: type<ItemType>()
  }
});
```

### Reducer Template

```typescript
// In {domain}.reducers.ts
import {EventInstance} from "@ngrx/signals/events";
import {AppState} from "../models/app-state.model";
import {domainEvents} from "./{domain}.events";


export function itemUpdatedReducer(
  this: void,
  event: EventInstance<"[DomainName] itemUpdated", ItemType>,
  state: AppState
) {
  const item = event.payload;

  // Pure logic only - no side effects
  const updatedItems = state.items.map(i =>
    i.id === item.id ? item : i
  );

  return {
    items: updatedItems,
    lastUpdated: Date.now()
  };
}

// Reducer without state dependency
export function itemsClearedReducer(this: void) {
  return {
    items: [],
    selectedItem: null
  };
}

// Conditional state update
export function itemRestoredReducer(
  this: void,
  event: EventInstance<"[DomainName] itemRestored", string>
) {
  try {
    const item = restoreFromId(event.payload);
    return {currentItem: item};
  } catch (e) {
    console.error("Failed to restore item", e);
    return {};  // Empty object = no state changes
  }
}

// Helper functions (non-exported)
function restoreFromId(id: string): ItemType {
  // Implementation
}
```

### Effect Template

```typescript
// In {domain}.effects.ts
import {Events} from "@ngrx/signals/events";
import {tap, map, switchMap, filter} from "rxjs";
import {domainEvents} from "./{domain}.events";

// Simple side effect
export function itemSavedEffect(
  this: void,
  events: Events,
  apiService: ApiService
) {
  return events
    .on(domainEvents.itemUpdated)
    .pipe(
      tap(event => {
        apiService.saveItem(event.payload);
      })
    );
}

// Effect with transformation
export function itemLoadedEffect(
  this: void,
  events: Events,
  apiService: ApiService
) {
  return events
    .on(domainEvents.loadItemRequested)
    .pipe(
      switchMap(event =>
        apiService.loadItem(event.payload)
      ),
      map(item => domainEvents.itemLoaded(item))
    );
}

// Effect listening to multiple events
export function anyItemChangeEffect(
  this: void,
  events: Events,
  analyticsService: AnalyticsService
) {
  return events
    .on(
      domainEvents.itemCreated,
      domainEvents.itemUpdated,
      domainEvents.itemDeleted
    )
    .pipe(
      tap(() => {
        analyticsService.trackItemChange();
      })
    );
}

// Navigation effect
export function navigateToItemEffect(
  this: void,
  events: Events,
  router: Router,
  store: unknown
) {
  return events
    .on(domainEvents.itemCreatedWithNav)
    .pipe(
      tap(event => {
        const itemId = event.payload.id;
        router.navigate(["/items", itemId]);
      })
    );
}
```

### Store Configuration Template

```typescript
// In app-state.store.ts
import {signalStore, withState} from "@ngrx/signals";
import {withReducer, on} from "@ngrx/signals/events";
import {withEffects} from "@ngrx/signals/effects";

import {initialState} from "./models/app-state.model";
import {allEffects} from "./all-effects";

import {domainEvents} from "./domain/domain.events";
import * as domainReducers from "./domain/domain.reducers";


export const AppStateStore = signalStore(
  {providedIn: "root"},
  withState(initialState),
  withReducer(
    // Domain reducers
    on(domainEvents.itemUpdated, domainReducers.itemUpdatedReducer),
    on(domainEvents.itemsCleared, domainReducers.itemsClearedReducer),
    on(domainEvents.itemRestored, domainReducers.itemRestoredReducer),

    // Add more reducer registrations
  ),
  withEffects(allEffects)
);
```

### Effect Registration Template

```typescript
// In all-effects.ts
import {inject} from "@angular/core";
import {Events} from "@ngrx/signals/events";
import {Router} from "@angular/router";
import {map} from "rxjs";

import * as domainEffects from "./domain/domain.effects";
import {domainEvents} from "./domain/domain.events";
import {persistenceEvents} from "./common/persistence.events";


export function allEffects(
  this: void,
  store: unknown,
  events = inject(Events),
  router = inject(Router),
  apiService = inject(ApiService),
  analyticsService = inject(AnalyticsService)
) {
  return {
    // Domain effects
    saveItem$: domainEffects.itemSavedEffect(events, apiService),
    loadItem$: domainEffects.itemLoadedEffect(events, apiService),
    trackChanges$: domainEffects.anyItemChangeEffect(events, analyticsService),
    navigateToItem$: domainEffects.navigateToItemEffect(events, router, store),

    // Composite effect (inline)
    persistOnChange$: events
      .on(
        domainEvents.itemUpdated,
        domainEvents.itemsCleared
      )
      .pipe(
        map(() => persistenceEvents.saveState())
      )
  };
}
```

## Component Usage

### Dispatching Events

```typescript
import {Component} from "@angular/core";
import {domainEvents} from "@core/domain/domain.events";


@Component({
  selector: "app-item-editor",
  template: `
    <button (click)="updateItem()">Update</button>
    <button (click)="clearAll()">Clear</button>
  `
})
export class ItemEditorComponent {
  readonly #dispatch = injectDispatch(domainEvents);


  updateItem() {
    const item: ItemType = {id: 1, name: "New Name"};
    this.#dispatch.itemUpdated(item);
  }


  clearAll() {
    this.#dispatch.itemsCleared();
  }
}
```

### Reading State

```typescript
import {Component, inject, computed} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: "app-item-list",
  template: `
    <div>Total: {{ itemCount() }}</div>
    
    @for(item of items(); track: item.id) {
      <div>{{ item.name }}</div>
    }
  `
})
export class ItemListComponent {
  readonly #store = inject(AppStateStore);

  // Direct signal access
  items = this.#store.items;

  // Computed values
  itemCount = computed(() => this.items().length);
  hasItems = computed(() => this.itemCount() > 0);
}
```

## Decision Tree

**Need to update state?**
→ Create Event + Reducer

**Need side effect (navigation, API, localStorage)?**
→ Add Effect

**Need cross-domain communication?**
→ Create transfer events in `common/transfer.events.ts`

**Need derived value?**
→ Use `computed()` or `linkedSignal()` in component

**Multiple events trigger same action?**
→ Create composite effect listening to multiple events

**State update + navigation?**
→ Create two events: `actionWithNav` and `actionWithoutNav`

## Common Patterns

### Pattern 1: Navigation After State Change

```typescript
// Event triggers both state change and navigation
on(domainEvents.itemCreatedWithNav, itemCreatedReducer)

// Effect handles navigation
navigateToItem$: events
  .on(domainEvents.itemCreatedWithNav)
  .pipe(
    tap(event => router.navigate(["/items", event.payload.id]))
  )
```

### Pattern 2: Persistence After Multiple Events

```typescript
persistState$: events
  .on(
    domainEvents.itemUpdated,
    domainEvents.itemsCleared,
    domainEvents.filterApplied
  )
  .pipe(
    map(() => persistenceEvents.saveState())
  )
```

### Pattern 3: Cross-Domain Communication

```typescript
// In common/transfer.events.ts
export const transferEvents = eventGroup({
  source: "Transfer",
  events: {
    sendItemToOtherDomain: type<ItemType>()
  }
});

// Target domain reducer
export function itemReceivedReducer(
  this: void,
  event: EventInstance<"[Transfer] sendItemToOtherDomain", ItemType>
) {
  return {
    receivedItem: event.payload
  };
}
```

### Pattern 4: Conditional State Updates

```typescript
export function restoreItemReducer(
  this: void,
  event: EventInstance<"[Domain] restoreItem", string>,
  state: AppState
) {
  try {
    const item = parseItemId(event.payload);
    return {currentItem: item};
  } catch (error) {
    console.error("Invalid item ID", error);
    return {};  // No state change
  }
}
```

### Pattern 5: Optimistic Updates with Rollback

```typescript
// Optimistic update
on(domainEvents.saveItemStarted, saveItemStartedReducer)

// Success - keep changes
on(domainEvents.saveItemSucceeded, saveItemSucceededReducer)

// Failure - rollback
on(domainEvents.saveItemFailed, saveItemFailedReducer)
```

## Common Mistakes

### ❌ Wrong: Switch Statement in Reducer

```typescript
// DON'T DO THIS
export function itemReducer(state: AppState, event: any) {
  switch (event.type) {
    case "itemUpdated":
      return {...state, item: event.payload};
    default:
      return state;
  }
}
```

### ✅ Right: Separate Named Functions

```typescript
// DO THIS
export function itemUpdatedReducer(
  this: void,
  event: EventInstance<"[Domain] itemUpdated", ItemType>
) {
  return {item: event.payload};
}
```

### ❌ Wrong: Mutating State

```typescript
// DON'T DO THIS
export function addItemReducer(
  this: void,
  event: EventInstance<"[Domain] addItem", ItemType>,
  state: AppState
) {
  state.items.push(event.payload);  // Mutation!
  return state;
}
```

### ✅ Right: Return New State

```typescript
// DO THIS
export function addItemReducer(
  this: void,
  event: EventInstance<"[Domain] addItem", ItemType>,
  state: AppState
) {
  return {
    items: [...state.items, event.payload]
  };
}
```

### ❌ Wrong: Side Effects in Reducer

```typescript
// DON'T DO THIS
export function itemSavedReducer(
  this: void,
  event: EventInstance<"[Domain] itemSaved", ItemType>
) {
  apiService.saveItem(event.payload);  // Side effect!
  return {lastSaved: event.payload};
}
```

### ✅ Right: Side Effects in Effect

```typescript
// DO THIS
export function itemSavedEffect(
  this: void,
  events: Events,
  apiService: ApiService
) {
  return events
    .on(domainEvents.itemSaved)
    .pipe(tap(event => apiService.saveItem(event.payload)));
}
```

### ❌ Wrong: Using Selectors

```typescript
// DON'T DO THIS (NgRx Store pattern)
export const selectItems = createSelector(
  selectAppState,
  state => state.items
);
```

### ✅ Right: Using Computed Signals

```typescript
// DO THIS
export class ItemListComponent {
  private store = inject(AppStateStore);

  items = computed(() =>
    this.store.items().filter(i => i.active)
  );
}
```

## Event Naming Conventions

### Past Tense for State Changes

```typescript
✅ itemCreated: type<ItemType>()
✅ filterApplied: type<FilterType>()
✅ dataLoaded: type<DataType>()

❌ createItem: type<ItemType>()
❌ applyFilter: type<FilterType>()
❌ loadData: type<DataType>()
```

### Navigation Suffixes

```typescript
✅ itemCreatedWithNav: type<ItemType>()
✅ itemCreatedWithoutNav: type<ItemType>()

❌ navigateToItem: type<ItemType>()  // Too implementation-specific
```

### Request/Response Pattern

```typescript
✅ loadItemRequested: type<string>()
✅ itemLoaded: type<ItemType>()
✅ loadItemFailed: type<Error>()
```

## Testing

### Testing Reducers

```typescript
import {itemUpdatedReducer} from "./item.reducers";
import {domainEvents} from "./item.events";


describe("itemUpdatedReducer", () => {
  it("should update item in state", () => {
    const event = {
      type: "[Domain] itemUpdated",
      payload: {id: 1, name: "Updated"}
    } as any;

    const state = {
      items: [{id: 1, name: "Original"}]
    } as any;

    const result = itemUpdatedReducer(event, state);

    expect(result.items[0].name).toBe("Updated");
  });
});
```

### Testing Effects

```typescript
import {TestBed} from "@angular/core/testing";
import {Events} from "@ngrx/signals/events";
import {itemSavedEffect} from "./item.effects";


describe("itemSavedEffect", () => {
  it("should call API service", (done) => {
    const events = TestBed.inject(Events);
    const apiService = jasmine.createSpyObj("ApiService", ["saveItem"]);

    const effect$ = itemSavedEffect(events, apiService);
    effect$.subscribe();

    domainEvents.itemSaved({id: 1, name: "Test"});

    setTimeout(() => {
      expect(apiService.saveItem).toHaveBeenCalled();
      done();
    });
  });
});
```

## Migration from @ngrx/store

If migrating from traditional @ngrx/store:

| @ngrx/store       | @ngrx/signals                        |
|-------------------|--------------------------------------|
| Actions           | Events (via `eventGroup()`)          |
| Action creators   | Event emitter functions              |
| Reducers (switch) | Reducer functions                    |
| Effects class     | Effect functions                     |
| Selectors         | Computed signals                     |
| `createAction()`  | `eventGroup()` + `type<T>()`         |
| `createReducer()` | `withReducer()` + `on()`             |
| `createEffect()`  | Effect function returning observable |
| `select()`        | Direct signal access or `computed()` |
| `dispatch()`      | Call event emitter function          |

## Key Benefits

1. **Type Safety** - Full TypeScript inference for events, state, and payloads
2. **Simplicity** - Less boilerplate than traditional NgRx Store
3. **Testability** - Pure functions are easy to unit test
4. **Scalability** - Domain-driven organization scales well
5. **Performance** - Signals provide fine-grained reactivity
6. **Developer Experience** - Clear separation of concerns
7. **Debugging** - Event flow is easy to trace

## Best Practices Summary

1. Keep reducers pure (no side effects)
2. Use effects for all side effects
3. Return partial state objects from reducers
4. Name events in past tense
5. Group by domain, not by type
6. Use `this: void` to prevent binding issues
7. Export all reducer and effect functions by name
8. Register all effects in central file
9. Use computed signals for derived values
10. Use transfer events for cross-domain communication

## Additional Resources

- [@ngrx/signals Documentation](https://ngrx.io/guide/signals)
- [@ngrx/signals/events Documentation](https://ngrx.io/guide/signals/signal-store/events)
- [Angular Signals Guide](https://angular.dev/guide/signals)
