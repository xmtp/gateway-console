# fn-2.1 Install Sheet and Drawer shadcn components

## Description

Install the shadcn/ui Sheet and Drawer components needed for mobile navigation and dialogs.

**Commands:**
```bash
npx shadcn@latest add sheet
npx shadcn@latest add drawer
```

**Expected output:**
- `/src/components/ui/sheet.tsx` - Sheet component (slide-out panel)
- `/src/components/ui/drawer.tsx` - Drawer component (bottom sheet)

**Verify installation:**
- Both files exist in `/src/components/ui/`
- No TypeScript errors in the generated files
- Components export properly

## Context

Sheet and Drawer are Radix UI primitives wrapped by shadcn/ui. They provide:
- Sheet: Slide-out panels from any edge (for mobile navigation)
- Drawer: Touch-friendly bottom sheets (for mobile dialogs)

The project already uses shadcn/ui (new-york style) as seen in `components.json`.
## Acceptance
- [ ] Sheet component installed at `/src/components/ui/sheet.tsx`
- [ ] Drawer component installed at `/src/components/ui/drawer.tsx`
- [ ] `npm run typecheck` passes
- [ ] Components can be imported: `import { Sheet } from "@/components/ui/sheet"`
## Done summary
- Installed shadcn/ui Sheet component at `/src/components/ui/sheet.tsx`
- Installed shadcn/ui Drawer component at `/src/components/ui/drawer.tsx`
- Both components use Radix UI primitives (Sheet via @radix-ui/react-dialog, Drawer via vaul)

## Why
- Sheet needed for slide-out navigation panels on mobile
- Drawer needed for touch-friendly bottom sheets replacing dialogs on mobile

## Verification
- `npx tsc -b` passes with no errors
- Both files exist and export correctly
- package.json updated with vaul dependency

## Follow-ups
- None - components ready for use in fn-2.2+
## Evidence
- Commits: 0ea4e2d861306a0ea64d973f6abe07a383c06802
- Tests: npx tsc -b
- PRs: