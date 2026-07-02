# Spaces

A minimalist productivity system implementing attention → space → act → trace workflow.

## User Flow

1. **Create HyperSpace** - Top-level container for all spaces
2. **Create Space** - Environment for focused work
3. **Create Focus** - Area of attention
4. **Create Form** - Object of attention (task, idea, reference, etc.)
5. **Create Act** - Maturation of form in reality
6. **Execute Act** - Perform action in the real world
7. **Return Focus** - Complete and archive the act

## Running

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## What Works

- Complete entity model and state management
- Three.js visualization of spaces, focuses, forms, and acts
- Full CRUD operations for all entities
- Lightweight local storage backend
- Real-time visual feedback on user interactions
- Hover and interaction patterns for acts

## Visual Canon

- White background
- Thin graphite lines (0x333333)
- Minimal color palette
- Light appears when attention is present
- Forms grow upward, acts grow downward

## Key Components

- **entities.ts** - Complete TypeScript interfaces
- **storage/** - Local storage layer
- **store/** - Zustand state management
- **scene/** - Three.js visualizations
- **components/** - React UI panels
- **ui/** - Helper components

## Notes

This implementation follows the Spaces specification for a productivity system that reduces complexity and makes action easier.

## Development

Currently in development. Key work remaining:
- Refine Three.js visual polish
- Optimize performance for real-world use
- Add keyboard shortcuts for power users