# AI Agent Instructions for Habits Build Tracker

These guidelines must be strictly followed when contributing to this project.

## 1. Commits and Linting
* **Pre-commit Check**: Before making any commit, you must run the linting process.
* **Fix Issues**: Resolve all linting errors and warnings before proceeding with the commit. Do not ignore or bypass lint rules.

## 2. TypeScript and Typing
* **No `any`**: Strictly avoid using the `any` type. Always define proper interfaces, types, or use `unknown` if the type is truly dynamic (and narrow it down safely).
* **Strict Mode**: Ensure strict typing is maintained across the application.

## 3. Angular Components
* **Separate Files**: Always use separate files for Angular templates (`.html`) and styles (`.scss`). Do not use inline templates or styles inside the `@Component` decorator.
* **Standalone Components**: Default to using standalone components unless an NgModule is strictly required by a legacy dependency.
* **Change Detection**: Use `ChangeDetectionStrategy.OnPush` for all components to optimize performance.
* **Injection**: Prefer using the `inject()` function for dependency injection over constructor injection.

## 4. SCSS Best Practices
* **Component Encapsulation**: Namespace your styles properly using BEM-like nesting linked to the component's host class.
  * *Bad*: `.header { ... }`
  * *Good*: `.learning { &__header { ... } }`
* **Variables and Mixins**: Utilize existing design tokens, variables, and mixins rather than hardcoding colors, spacing, or breakpoints.

## 5. State Management and Reactivity
* **Signals**: Prefer Angular Signals for local component state and simple shared state.
* **RxJS**: When using RxJS, ensure subscriptions are properly managed (e.g., using `takeUntilDestroyed` or the `async` pipe) to prevent memory leaks.

## 6. Firestore and Database
* **Efficient Queries**: Avoid N+1 queries. Always prefer fetching data in bulk (e.g., date ranges) and filtering in memory rather than calling database queries inside loops.
* **Data Typing**: Use Firestore data converters or cast query results properly to maintain type safety when fetching documents.
